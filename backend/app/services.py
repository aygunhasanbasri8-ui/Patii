import logging
import random
import secrets
from datetime import datetime, timedelta

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from . import core, llm, mail, ml_model, models, recurrence, repositories, schemas, uploads
from .rate_limit import login_limiter

logger = logging.getLogger(__name__)

_RESEND_COOLDOWN_SECONDS = 60
_RESET_CODE_EXPIRE_MINUTES = 15
# 6 haneli kodda sınırsız deneme, kodu dakikalar içinde tahmin ettirir
_MAX_CODE_ATTEMPTS = 5


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_code_mail(
    background_tasks: BackgroundTasks | None, to_email: str, subject: str, html: str
) -> None:
    # Kod asla yanıtta dönmez; mail gidemezse kullanıcı yeniden kod ister
    if background_tasks is not None:
        background_tasks.add_task(mail.send_email, to_email, subject, html)
    else:
        mail.send_email(to_email, subject, html)


def _check_code(db: Session, user, expected: str | None, given: str, wrong_detail: str) -> None:
    if user.failed_code_attempts >= _MAX_CODE_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Çok fazla hatalı deneme. Lütfen yeni kod iste.")
    if not expected or not secrets.compare_digest(expected, given):
        repositories.increment_failed_code_attempts(db, user)
        raise HTTPException(status_code=400, detail=wrong_detail)


def register_user(db: Session, payload: schemas.UserCreate, background_tasks: BackgroundTasks | None = None) -> dict:
    db_user = repositories.get_user_by_email(db, payload.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı!")

    user = repositories.create_user(
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=core.hash_password(payload.password),
    )

    code = _generate_code()
    repositories.update_user_verification(db, user, code, datetime.utcnow())

    html = (
        f"<p>Merhaba {payload.full_name},</p>"
        f"<p>Doğrulama kodun: <strong>{code}</strong></p>"
        f"<p>Bu kodu uygulamaya girerek hesabını etkinleştir.</p>"
    )
    _send_code_mail(background_tasks, payload.email, "Pati — E-posta Doğrulama", html)

    return {
        "message": "Kayıt başarılı! E-postana gönderilen kodu girerek hesabını doğrula.",
        "user_id": user.id,
    }


def verify_email_code(db: Session, payload: schemas.VerifyEmail) -> dict:
    user = repositories.get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if user.is_verified:
        return {"message": "Hesap zaten doğrulanmış."}
    _check_code(db, user, user.verification_code, payload.code, "Doğrulama kodu yanlış.")

    repositories.mark_user_verified(db, user)
    return {"message": "E-posta başarıyla doğrulandı!"}


def resend_verification_code(db: Session, payload: schemas.ResendVerification, background_tasks: BackgroundTasks | None = None) -> dict:
    user = repositories.get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Hesap zaten doğrulanmış.")

    if user.verification_code_sent_at:
        elapsed = (datetime.utcnow() - user.verification_code_sent_at).total_seconds()
        if elapsed < _RESEND_COOLDOWN_SECONDS:
            remaining = int(_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Lütfen {remaining} saniye bekleyip tekrar dene.",
            )

    code = _generate_code()
    repositories.update_user_verification(db, user, code, datetime.utcnow())

    html = f"<p>Yeni doğrulama kodun: <strong>{code}</strong></p>"
    _send_code_mail(background_tasks, payload.email, "Pati — E-posta Doğrulama (Yeniden)", html)

    return {"message": "Doğrulama kodu yeniden gönderildi."}


def login_user(db: Session, payload: schemas.UserLogin, client_ip: str = "unknown") -> dict:
    # IP + e-posta birlikte anahtar: proxy IP'si yanlış çözülse bile başka hesaplar etkilenmez
    limit_key = (client_ip, payload.email.strip().lower())
    login_limiter.check(limit_key)

    user = repositories.get_user_by_email(db, payload.email)
    if not user or not core.verify_password(payload.password, user.hashed_password):
        login_limiter.record_failure(limit_key)
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı!")
    login_limiter.reset(limit_key)

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Lütfen önce e-postanı doğrula.")

    token = core.create_access_token(user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_name": user.full_name,
        "user_id": user.id,
    }


def request_password_reset(db: Session, payload: schemas.ForgotPassword, background_tasks: BackgroundTasks | None = None) -> dict:
    # Kayıtlı olmayan e-postalar için de aynı mesaj dönüyor, hesap varlığı sızmasın
    result = {"message": "Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi."}
    user = repositories.get_user_by_email(db, payload.email)
    if not user:
        return result

    # Kod yenilenince deneme hakkı da sıfırlandığı için sık istek tahmini kolaylaştırır.
    # Bekleme süresinde aynı mesaj dönüyor ki hesabın varlığı anlaşılmasın.
    if user.reset_code_expires_at:
        sent_at = user.reset_code_expires_at - timedelta(minutes=_RESET_CODE_EXPIRE_MINUTES)
        if (datetime.utcnow() - sent_at).total_seconds() < _RESEND_COOLDOWN_SECONDS:
            return result

    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=_RESET_CODE_EXPIRE_MINUTES)
    repositories.update_user_reset_code(db, user, code, expires_at)
    html = (
        f"<p>Şifre sıfırlama kodun: <strong>{code}</strong></p>"
        f"<p>Bu kod {_RESET_CODE_EXPIRE_MINUTES} dakika geçerlidir.</p>"
    )
    _send_code_mail(background_tasks, payload.email, "Pati — Şifre Sıfırlama", html)
    return result


def reset_password(db: Session, payload: schemas.ResetPassword) -> dict:
    user = repositories.get_user_by_email(db, payload.email)
    if not user or not user.reset_code:
        raise HTTPException(status_code=400, detail="Geçersiz sıfırlama isteği.")
    _check_code(db, user, user.reset_code, payload.code, "Sıfırlama kodu yanlış.")
    if user.reset_code_expires_at and datetime.utcnow() > user.reset_code_expires_at:
        raise HTTPException(status_code=400, detail="Sıfırlama kodunun süresi dolmuş.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı.")

    repositories.update_user_password(db, user, core.hash_password(payload.new_password))
    return {"message": "Şifre başarıyla güncellendi."}


def get_user_from_token(db: Session, token: str):
    email = core.get_current_user_email(token)
    user = repositories.get_user_by_email(db, email)
    if not user:
        # Token geçerli ama hesap silinmiş
        raise HTTPException(status_code=401, detail="Geçersiz bilet , lütfen tekrar giriş yap!")
    return user


def _get_owned_pet(db: Session, pet_id: int, user):
    pet = repositories.get_pet_by_id(db, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")
    if pet.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkin yok!")
    return pet


def add_pet_for_owner(db: Session, payload: schemas.PetCreate, user: models.User) -> dict:
    pet = repositories.create_pet(
        db=db,
        name=payload.name,
        species=payload.species,
        breed=payload.breed,
        owner_id=user.id,
        avatar_type=payload.avatar_type,
        avatar_value=payload.avatar_value,
    )
    return {"message": f"{pet.name} güvenli şekilde eklendi!", "owner": user.email, "pet_id": pet.id}


def get_my_pets(db: Session, user: models.User):
    return repositories.get_pets_by_owner(db, user.id)


# Eski mobil sürümler bu yolu kullanıyor; yeni istemciler /pets/me'yi kullanmalı
def get_owner_pets(db: Session, owner_id: int, user: models.User):
    if user.id != owner_id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkin yok!")
    return get_my_pets(db, user)


def update_pet_for_owner(db: Session, pet_id: int, payload: schemas.PetUpdate, user: models.User) -> dict:
    pet = _get_owned_pet(db, pet_id, user)
    previous = pet.avatar_value if pet.avatar_type == "photo" else None
    repositories.update_pet(
        db, pet,
        payload.name,
        payload.species,
        payload.breed,
        avatar_type=payload.avatar_type,
        avatar_value=payload.avatar_value,
    )
    # Fotoğraftan ikona geçildiyse eski dosya artık kimseye ait değil
    if previous and pet.avatar_value != previous:
        uploads.delete_upload(previous)
    return {"message": "Pati bilgileri güncellendi.", "pet_id": pet.id}


def upload_pet_avatar(db: Session, pet_id: int, user: models.User, file_bytes: bytes) -> dict:
    pet = _get_owned_pet(db, pet_id, user)

    image_bytes, ext = uploads.sanitize_avatar(file_bytes)
    previous = pet.avatar_value if pet.avatar_type == "photo" else None
    avatar_value = uploads.save_upload(image_bytes, f"pet_{pet_id}", ext)
    repositories.update_pet_avatar(db, pet, "photo", avatar_value)
    # DB güncellendikten sonra; tersi olsaydı hata anında pati fotoğrafsız kalırdı
    uploads.delete_upload(previous)
    return {"avatar_type": "photo", "avatar_value": avatar_value}


def remove_pet_for_owner(db: Session, pet_id: int, user: models.User) -> dict:
    pet = _get_owned_pet(db, pet_id, user)
    photo = pet.avatar_value if pet.avatar_type == "photo" else None
    repositories.delete_pet(db, pet)
    uploads.delete_upload(photo)
    return {"message": "Pati silindi."}


def _contextual_uncertain_advice(db: Session, pet) -> str | None:
    reminders = repositories.get_reminders_by_pet(db, pet.id)
    recent_reminder_text = reminders[-1].text if reminders else "kayıtlı bir hatırlatıcı yok"

    prompt = (
        f"{_SYSTEM_PROMPT_PREFIX}"
        f"Bir miyavlama ses analizi net bir sonuç vermedi (belirsiz/düşük güven).\n"
        f"Pati: {pet.name}, tür: {pet.species}, ırk: {pet.breed}.\n"
        f"Son hatırlatıcı: {recent_reminder_text}.\n"
        f"Kullanıcıya, net bir teşhis olmadığını nazikçe belirten ve mevcut "
        f"bağlama göre 1 kısa pratik öneri içeren bir mesaj yaz."
    )
    return llm.generate_text(prompt, max_output_tokens=150)


def analyze_meow(db: Session, pet_id: int, user: models.User, audio_bytes: bytes | None = None) -> dict:
    pet = _get_owned_pet(db, pet_id, user)

    logger.info(
        "analyze_meow çağrıldı — audio_bytes: %s bayt, model_available: %s",
        len(audio_bytes) if audio_bytes else "None/boş",
        ml_model.is_model_available(),
    )
    if audio_bytes and ml_model.is_model_available():
        try:
            prediction = ml_model.predict_from_audio(audio_bytes)
            advice = prediction["advice"]

            if prediction["label"] == "Belirsiz":
                contextual_advice = _contextual_uncertain_advice(db, pet)
                if contextual_advice:
                    advice = contextual_advice

            return {
                "pet_id": pet_id,
                "status": "Analiz Tamamlandı",
                "result": prediction["result"],
                "advice": advice,
                "confidence": prediction["confidence"],
                "probabilities": prediction.get("probabilities"),
                "source": "model",
            }
        except Exception as exc:
            logger.warning("Model çıkarımı başarısız oldu, stub'a düşülüyor: %s", exc)

    moods = [
        "Acıktım, mama ver!",
        "Uykum var, beni rahat bırak.",
        "Oyun oynamak istiyorum!",
        "Seni çok seviyorum",
        "Dışarı çıkmak istiyorum.",
    ]
    return {
        "pet_id": pet_id,
        "status": "Analiz Tamamlandı",
        "result": random.choice(moods),
        "confidence": 0.95,
        "source": "stub",
    }


def add_reminder(db: Session, payload: schemas.ReminderCreate, user: models.User) -> dict:
    _get_owned_pet(db, payload.pet_id, user)

    reminder = repositories.create_reminder(
        db=db,
        pet_id=payload.pet_id,
        text=f"{payload.title}: {payload.description}",
        date=payload.remind_at,
        due_date=recurrence.parse_reminder_date(payload.remind_at),
        repeat_rule=payload.repeat,
    )
    return {"message": "Hatırlatıcı başarıyla kuruldu!", "reminder_id": reminder.id}


def advance_repeating(db: Session, reminders, today) -> None:
    """Tarihi geçmiş tekrarlı hatırlatıcıyı bir sonraki tekrara taşır.

    Zamanlayıcı her gün yapıyor; liste açılırken de yapılıyor ki arada
    dünkü tarih "geçmiş" görünmesin.
    """
    changed = False
    for rem in reminders:
        if not rem.repeat_rule or rem.due_date is None or rem.due_date >= today:
            continue
        nxt = recurrence.first_on_or_after(rem.repeat_start or rem.due_date, rem.repeat_rule, today)
        rem.due_date = nxt
        rem.date = recurrence.format_reminder_date(nxt)
        changed = True
    if changed:
        db.commit()


def get_pet_reminders(db: Session, pet_id: int, user: models.User):
    _get_owned_pet(db, pet_id, user)
    reminders = repositories.get_reminders_by_pet(db, pet_id)
    advance_repeating(db, reminders, recurrence.local_today())
    return reminders


def get_pet_reminder_history(db: Session, pet_id: int, user: models.User):
    _get_owned_pet(db, pet_id, user)
    reminders = repositories.get_reminders_by_pet(db, pet_id)
    today = recurrence.local_today()
    advance_repeating(db, reminders, today)

    def is_past(rem) -> bool:
        due = rem.due_date or recurrence.parse_reminder_date(rem.date)
        return due is not None and due < today

    return [rem for rem in reminders if is_past(rem)]


def update_reminder_for_owner(db: Session, rem_id: int, payload: schemas.ReminderUpdate, user: models.User) -> dict:
    reminder = repositories.get_reminder_by_id(db, rem_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Hatırlatıcı bulunamadı!")
    _get_owned_pet(db, reminder.pet_id, user)
    repositories.update_reminder(
        db,
        reminder,
        text=f"{payload.title}: {payload.description}",
        date=payload.remind_at,
        due_date=recurrence.parse_reminder_date(payload.remind_at),
        repeat_rule=payload.repeat,
    )
    return {"message": "Hatırlatıcı güncellendi.", "reminder_id": reminder.id}


def remove_reminder(db: Session, rem_id: int, user: models.User) -> dict:
    reminder = repositories.get_reminder_by_id(db, rem_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Hatırlatıcı zaten yok!")
    _get_owned_pet(db, reminder.pet_id, user)

    repositories.delete_reminder(db, reminder)
    return {"message": "Hatırlatıcı silindi."}


_KEYWORD_RESPONSES: list[tuple[tuple[str, ...], str]] = [
    (("tüy", "tuy"), "Tüy dökülmesi mevsimsel olabilir; düzenli fırçalama ve omega-3 takviyesi yardımcı olur. Sürekli ve aşırıysa veterinerine danış."),
    (("aşı", "asi", "vaccine"), "Aşı takvimini Hatırlatıcılar sekmesinden takip edebilirsin. Genel kural: yavru hayvanlarda 6-8 haftadan başlanır, yetişkinlerde yıllık tekrar gerekir."),
    (("mama", "beslenme", "yemek"), "Yetişkin kediler günde 2 öğün, yavrular 3-4 öğün beslenmelidir. Ani mama değişimi sindirim sorunu yaratabilir, geçişi 5-7 günde kademeli yap."),
    (("su", "içiyor", "iciyor"), "Aşırı su içme; diyabet, böbrek sorunları veya sıcak havadan kaynaklanabilir. 1-2 günden uzun sürerse veterinerine götürmen iyi olur."),
    (("kusma", "kusuyor", "kusmuk"), "Tekil bir kusma genelde önemsizdir, ama tekrarlıyorsa veya kanlıysa acil veteriner kontrolü gerekir."),
    (("ishal", "diyare"), "İshal genellikle 24-48 saat içinde geçer; bu sürede bol su ve hafif beslenme öner. Uzarsa veterinerine başvur."),
    (("miyav", "miyavl"), "Miyavlama analizini Analiz sekmesinden yapabilirsin; ses kaydını göndererek kedinin ruh halini tahmin edebiliriz."),
    (("parazit", "pire", "kene"), "Parazit ilaçlaması aylık olarak tekrarlanmalıdır; Hatırlatıcılar sekmesinden bir sonraki uygulamayı planlayabilirsin."),
    (("üşüdü", "usudu", "titriyor"), "Titreme; üşümeden, stresten veya ağrıdan kaynaklanabilir. Sıcak bir ortam sağla, devam ederse veterinerine danış."),
]

_DEFAULT_ANSWER = (
    "Bu konuda net bir bilgi veremedim, ama genel bakım soruları için "
    "buradayım. Beslenme, aşı takvimi, tüy dökülmesi veya davranış "
    "değişiklikleri hakkında sorabilirsin. Acil durumlarda en güvenli "
    "adım her zaman bir veterinere ulaşmaktır."
)

_SYSTEM_PROMPT_PREFIX = (
    "Sen Pati uygulamasının evcil hayvan bakım asistanısın. Türkçe, kısa "
    "(en fazla 3-4 cümle), sıcak ve pratik bir dille cevap ver. Tıbbi "
    "tavsiye değil, genel bakım önerisi sunduğunu unutma; ciddi/acil "
    "belirtilerde veterinere yönlendir.\n\n"
)


def _keyword_fallback_answer(question: str) -> str:
    normalized = question.lower()
    for keywords, response in _KEYWORD_RESPONSES:
        if any(keyword in normalized for keyword in keywords):
            return response
    return _DEFAULT_ANSWER


def ask_chatbot(db: Session, payload: schemas.ChatAsk, user: models.User) -> dict:

    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Soru boş olamaz!")

    pet_context = ""
    if payload.pet_id is not None:
        pet = repositories.get_pet_by_id(db, payload.pet_id)
        # Başkasının patisinin bilgisi bağlama girmesin
        if pet and pet.owner_id == user.id:
            pet_context = f"Kullanıcının patisi: {pet.name}, tür: {pet.species}, ırk: {pet.breed}.\n"

    prompt = f"{_SYSTEM_PROMPT_PREFIX}{pet_context}Kullanıcının sorusu: {question}"
    answer = llm.generate_text(prompt)

    if answer is None:
        answer = _keyword_fallback_answer(question)

    return {"answer": answer}
