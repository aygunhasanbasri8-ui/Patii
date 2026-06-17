import logging
import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import core, llm, ml_model, repositories, schemas

logger = logging.getLogger(__name__)


def register_user(db: Session, payload: schemas.UserCreate) -> dict:
    db_user = repositories.get_user_by_email(db, payload.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı!")

    user = repositories.create_user(
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=core.hash_password(payload.password),
    )
    return {"message": "Kayıt başarılı!", "user_id": user.id}


def login_user(db: Session, payload: schemas.UserLogin) -> dict:
    user = repositories.get_user_by_email(db, payload.email)
    if not user or not core.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı!")

    token = core.create_access_token(user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_name": user.full_name,
        "user_id": user.id,
    }


def _get_user_from_token(db: Session, token: str):
    email = core.get_current_user_email(token)
    return repositories.get_user_by_email(db, email)


def add_pet_for_owner(db: Session, payload: schemas.PetCreate, token: str) -> dict:
    user = _get_user_from_token(db, token)
    pet = repositories.create_pet(
        db=db,
        name=payload.name,
        species=payload.species,
        breed=payload.breed,
        owner_id=user.id,
    )
    return {"message": f"{pet.name} güvenli şekilde eklendi!", "owner": user.email}


def get_owner_pets(db: Session, owner_id: int, token: str):
    user = _get_user_from_token(db, token)
    if user.id != owner_id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkin yok!")
    return repositories.get_pets_by_owner(db, owner_id)


def update_pet_for_owner(db: Session, pet_id: int, payload: schemas.PetUpdate, token: str) -> dict:
    user = _get_user_from_token(db, token)
    pet = repositories.get_pet_by_id(db, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")
    if pet.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkin yok!")
    repositories.update_pet(db, pet, payload.name, payload.species, payload.breed)
    return {"message": "Pati bilgileri güncellendi.", "pet_id": pet.id}


def remove_pet_for_owner(db: Session, pet_id: int, token: str) -> dict:
    user = _get_user_from_token(db, token)
    pet = repositories.get_pet_by_id(db, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")
    if pet.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkin yok!")
    repositories.delete_pet(db, pet)
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


def analyze_meow(db: Session, pet_id: int, token: str, audio_bytes: bytes | None = None) -> dict:
    core.get_current_user_email(token)
    pet = repositories.get_pet_by_id(db, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")

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


def add_reminder(db: Session, payload: schemas.ReminderCreate, token: str) -> dict:
    core.get_current_user_email(token)
    pet = repositories.get_pet_by_id(db, payload.pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")

    reminder = repositories.create_reminder(
        db=db,
        pet_id=payload.pet_id,
        text=f"{payload.title}: {payload.description}",
        date=payload.remind_at,
    )
    return {"message": "Hatırlatıcı başarıyla kuruldu!", "reminder_id": reminder.id}


def get_pet_reminders(db: Session, pet_id: int, token: str):
    core.get_current_user_email(token)
    return repositories.get_reminders_by_pet(db, pet_id)


def get_pet_reminder_history(db: Session, pet_id: int, token: str):
    core.get_current_user_email(token)
    reminders = repositories.get_reminders_by_pet(db, pet_id)
    today = datetime.utcnow().date()

    def is_past(reminder_date: str) -> bool:
        try:
            return datetime.strptime(reminder_date, "%d/%m/%Y").date() < today
        except ValueError:
            return False

    history = [rem for rem in reminders if is_past(rem.date)]
    return history


def update_reminder_for_owner(db: Session, rem_id: int, payload: schemas.ReminderUpdate, token: str) -> dict:
    user = _get_user_from_token(db, token)
    reminder = repositories.get_reminder_by_id(db, rem_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Hatırlatıcı bulunamadı!")
    pet = repositories.get_pet_by_id(db, reminder.pet_id)
    if pet.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkin yok!")
    repositories.update_reminder(
        db,
        reminder,
        text=f"{payload.title}: {payload.description}",
        date=payload.remind_at,
    )
    return {"message": "Hatırlatıcı güncellendi.", "reminder_id": reminder.id}


def remove_reminder(db: Session, rem_id: int, token: str) -> dict:
    core.get_current_user_email(token)
    reminder = repositories.get_reminder_by_id(db, rem_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Hatırlatıcı zaten yok!")

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


def ask_chatbot(db: Session, payload: schemas.ChatAsk, token: str) -> dict:
    core.get_current_user_email(token)

    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Soru boş olamaz!")

    pet_context = ""
    if payload.pet_id is not None:
        pet = repositories.get_pet_by_id(db, payload.pet_id)
        if pet:
            pet_context = f"Kullanıcının patisi: {pet.name}, tür: {pet.species}, ırk: {pet.breed}.\n"

    prompt = f"{_SYSTEM_PROMPT_PREFIX}{pet_context}Kullanıcının sorusu: {question}"
    answer = llm.generate_text(prompt)

    if answer is None:
        answer = _keyword_fallback_answer(question)

    return {"answer": answer}