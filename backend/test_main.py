import io

from PIL import Image

from app import uploads
from app.models import User


def _image_bytes(fmt: str) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "orange").save(buf, fmt)
    return buf.getvalue()


class TestRegister:
    def test_register_success(self, client):
        response = client.post("/api/auth/register", json={
            "full_name": "Ali Veli",
            "email": "ali@example.com",
            "password": "securepass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Kayıt başarılı" in data["message"]
        assert "user_id" in data

    def test_register_duplicate_email(self, client, registered_user):
        response = client.post("/api/auth/register", json={
            "full_name": "Duplicate User",
            "email": registered_user["email"],
            "password": "anotherpass"
        })
        assert response.status_code == 400
        assert "zaten kayıtlı" in response.json()["detail"]

    def test_register_missing_fields(self, client):
        response = client.post("/api/auth/register", json={
            "email": "incomplete@example.com"
        })
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client, registered_user):
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_name"] == registered_user["full_name"]

    def test_login_wrong_password(self, client, registered_user):
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/auth/login", json={
            "email": "noone@example.com",
            "password": "whatever"
        })
        assert response.status_code == 401

    def test_login_locks_after_repeated_failures(self, client, registered_user):
        wrong = {"email": registered_user["email"], "password": "yanlis"}
        for _ in range(5):
            assert client.post("/api/auth/login", json=wrong).status_code == 401

        # Doğru parola bile kilitliyken geçmemeli
        locked = client.post("/api/auth/login", json=registered_user)
        assert locked.status_code == 429
        assert int(locked.headers["Retry-After"]) > 0

    def test_login_limit_is_per_ip_and_email(self, client, registered_user):
        wrong = {"email": registered_user["email"], "password": "yanlis"}
        for _ in range(5):
            client.post("/api/auth/login", json=wrong, headers={"X-Forwarded-For": "1.1.1.1"})

        # Aynı hesap başka IP'den, ya da başka hesap aynı IP'den etkilenmemeli
        other_ip = client.post("/api/auth/login", json=registered_user, headers={"X-Forwarded-For": "2.2.2.2"})
        assert other_ip.status_code == 200
        other_user = client.post("/api/auth/login", json={"email": "yok@example.com", "password": "x"},
                                 headers={"X-Forwarded-For": "1.1.1.1"})
        assert other_user.status_code == 401

    def test_login_success_resets_failure_count(self, client, registered_user):
        wrong = {"email": registered_user["email"], "password": "yanlis"}
        for _ in range(4):
            client.post("/api/auth/login", json=wrong)
        assert client.post("/api/auth/login", json=registered_user).status_code == 200
        for _ in range(4):
            assert client.post("/api/auth/login", json=wrong).status_code == 401


class TestPets:
    def test_add_pet(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]

        response = client.post("/api/pets/add", json={
            "name": "Boncuk",
            "species": "Kedi",
            "breed": "Tekir",
            "owner_id": user_id
        }, headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "Boncuk" in data["message"]
        assert "pet_id" in data  # avatar özelliğiyle pet_id dönmeli

    def test_add_pet_with_icon_avatar(self, client, registered_user, auth_token):
        response = client.post("/api/pets/add", json={
            "name": "Minnak",
            "species": "Kedi",
            "breed": "British",
            "avatar_type": "icon",
            "avatar_value": "🐱",
        }, headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "pet_id" in data

        # Patiyi getirince avatar alanları dönmeli
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pets = client.get(
            f"/api/pets/my-pets/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        ).json()
        assert pets[0]["avatar_type"] == "icon"
        assert pets[0]["avatar_value"] == "🐱"

    def _add_pet(self, client, auth_token):
        resp = client.post("/api/pets/add", json={
            "name": "Pamuk",
            "species": "Kedi",
            "breed": "Van",
        }, headers={"Authorization": f"Bearer {auth_token}"})
        return resp.json()["pet_id"]

    def _upload(self, client, auth_token, pet_id, content, name="avatar.png", mime="image/png"):
        return client.post(
            f"/api/pets/{pet_id}/avatar",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": (name, content, mime)},
        )

    def test_upload_pet_avatar_photo(self, client, registered_user, auth_token):
        pet_id = self._add_pet(client, auth_token)

        # Expo uzantıya bakıp image/jpg gibi geçersiz bir tür yollayabiliyor; ad ve tür görmezden gelinmeli
        resp = self._upload(client, auth_token, pet_id, _image_bytes("JPEG"), "../../x.html", "image/jpg")
        assert resp.status_code == 200
        data = resp.json()
        assert data["avatar_type"] == "photo"
        assert data["avatar_value"].startswith("/static/uploads/pet_")
        assert data["avatar_value"].endswith(".jpg") and ".." not in data["avatar_value"]
        assert client.get(data["avatar_value"]).headers["x-content-type-options"] == "nosniff"

    def test_old_avatar_file_is_removed(self, client, registered_user, auth_token):
        pet_id = self._add_pet(client, auth_token)
        first = self._upload(client, auth_token, pet_id, _image_bytes("JPEG")).json()["avatar_value"]
        second = self._upload(client, auth_token, pet_id, _image_bytes("PNG")).json()["avatar_value"]

        # Yeni fotoğraf eskisinin yerini alınca eski dosya diskte birikmesin
        assert client.get(first).status_code == 404
        assert client.get(second).status_code == 200

        client.delete(f"/api/pets/{pet_id}", headers={"Authorization": f"Bearer {auth_token}"})
        assert client.get(second).status_code == 404

    def test_upload_pet_avatar_strips_exif(self, client, registered_user, auth_token):
        pet_id = self._add_pet(client, auth_token)
        exif = Image.Exif()
        exif[0x010F] = "GizliMarka"
        buf = io.BytesIO()
        Image.new("RGB", (8, 8)).save(buf, "JPEG", exif=exif)

        value = self._upload(client, auth_token, pet_id, buf.getvalue()).json()["avatar_value"]
        stored = client.get(value).content
        assert b"GizliMarka" not in stored
        assert not Image.open(io.BytesIO(stored)).getexif()

    def test_upload_pet_avatar_rejects_non_image(self, client, registered_user, auth_token):
        pet_id = self._add_pet(client, auth_token)

        html = b"<html><script>alert(1)</script></html>"
        assert self._upload(client, auth_token, pet_id, html, "a.png").status_code == 415
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        assert self._upload(client, auth_token, pet_id, svg, "a.svg", "image/svg+xml").status_code == 415
        assert self._upload(client, auth_token, pet_id, _image_bytes("GIF"), "a.gif", "image/gif").status_code == 415

    def test_upload_pet_avatar_rejects_oversized(self, client, registered_user, auth_token):
        pet_id = self._add_pet(client, auth_token)

        too_big = _image_bytes("PNG") + b"\x00" * (uploads.MAX_AVATAR_BYTES + 1)
        assert self._upload(client, auth_token, pet_id, too_big).status_code == 413

    def test_my_pets_me_matches_legacy_endpoint(self, client, registered_user, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        user_id = client.post("/api/auth/login", json=registered_user).json()["user_id"]
        self._add_pet(client, auth_token)

        me = client.get("/api/pets/me", headers=headers)
        assert me.status_code == 200 and len(me.json()) == 1
        assert me.json() == client.get(f"/api/pets/my-pets/{user_id}", headers=headers).json()
        assert client.get("/api/pets/me").status_code == 401

    def test_add_pet_no_auth(self, client):
        response = client.post("/api/pets/add", json={
            "name": "Boncuk",
            "species": "Kedi",
            "breed": "Tekir",
            "owner_id": 1
        })
        assert response.status_code == 401

    def test_get_my_pets(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]

        client.post("/api/pets/add", json={
            "name": "Pamuk",
            "species": "Kedi",
            "breed": "Van",
            "owner_id": user_id
        }, headers={"Authorization": f"Bearer {auth_token}"})

        response = client.get(
            f"/api/pets/my-pets/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        pets = response.json()
        assert len(pets) == 1
        assert pets[0]["name"] == "Pamuk"

    def test_get_my_pets_empty(self, client, registered_user, auth_token):
        # Kullanıcının kendi ID'si ile sorgu yapması, hiç pati eklemediyse
        # boş liste döndürmelidir.
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]

        response = client.get(f"/api/pets/my-pets/{user_id}", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert response.json() == []

    def test_get_my_pets_other_owner_forbidden(self, client, auth_token):
        # BOLA düzeltmesi: token sahibi kendisine ait olmayan bir owner_id
        # ile sorgu yaparsa 403 dönmelidir (404 veya 200 boş liste değil).
        response = client.get("/api/pets/my-pets/999", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 403

    def test_get_my_pets_no_auth(self, client):
        response = client.get("/api/pets/my-pets/999")
        assert response.status_code == 401

    def test_update_and_delete_pet(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        client.post("/api/pets/add", json={
            "name": "Misket",
            "species": "Kedi",
            "breed": "Tekir",
            "owner_id": user_id
        }, headers={"Authorization": f"Bearer {auth_token}"})

        pets_resp = client.get(
            f"/api/pets/my-pets/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        pet_id = pets_resp.json()[0]["id"]

        update_resp = client.put(
            f"/api/pets/{pet_id}",
            json={"name": "Misket2", "species": "Kedi", "breed": "British"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert update_resp.status_code == 200

        delete_resp = client.delete(
            f"/api/pets/{pet_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert delete_resp.status_code == 200


class TestAnalyzeMeow:
    def _create_pet(self, client, auth_token, user_id):
        client.post("/api/pets/add", json={
            "name": "Tekir",
            "species": "Kedi",
            "breed": "Tekir",
            "owner_id": user_id
        }, headers={"Authorization": f"Bearer {auth_token}"})
        pets = client.get(
            f"/api/pets/my-pets/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        ).json()
        return pets[0]["id"]

    def test_analyze_meow(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        response = client.post(
            f"/api/analyze/meow?pet_id={pet_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["pet_id"] == pet_id
        assert data["status"] == "Analiz Tamamlandı"
        assert "result" in data
        # Test ortamında ml_models/ klasörü altında eğitilmiş model
        # dosyaları olmadığı için sistem stub davranışına düşmelidir.
        assert data["source"] == "stub"

    def test_analyze_meow_with_audio_file_falls_back_to_stub(self, client, registered_user, auth_token):
        # Model dosyaları yokken bile bir ses dosyası gönderildiğinde
        # sistem çökmemeli, stub'a düşüp 200 dönmelidir.
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        fake_audio = b"RIFF....WAVEfmt "  # gerçek bir .wav olmasına gerek yok, model zaten yüklü değil
        response = client.post(
            f"/api/analyze/meow?pet_id={pet_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"audio": ("test.wav", fake_audio, "audio/wav")},
        )
        assert response.status_code == 200
        assert response.json()["source"] == "stub"

    def test_analyze_meow_pet_not_found(self, client, auth_token):
        response = client.post(
            "/api/analyze/meow?pet_id=9999",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404

    def test_analyze_meow_no_auth(self, client):
        response = client.post("/api/analyze/meow?pet_id=1")
        assert response.status_code == 401


class TestReminders:
    def _create_pet(self, client, auth_token, user_id):
        client.post("/api/pets/add", json={
            "name": "Minnak",
            "species": "Kedi",
            "breed": "British",
            "owner_id": user_id
        }, headers={"Authorization": f"Bearer {auth_token}"})
        pets = client.get(
            f"/api/pets/my-pets/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        ).json()
        return pets[0]["id"]

    def test_add_reminder(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        response = client.post("/api/reminders/add", json={
            "pet_id": pet_id,
            "title": "Aşı",
            "description": "Karma aşı zamanı",
            "remind_at": "15/04/2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert response.json()["message"] == "Hatırlatıcı başarıyla kuruldu!"

    def test_add_reminder_pet_not_found(self, client, auth_token):
        response = client.post("/api/reminders/add", json={
            "pet_id": 9999,
            "title": "Aşı",
            "description": "Karma aşı",
            "remind_at": "15/04/2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 404

    def test_get_pet_reminders(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        client.post("/api/reminders/add", json={
            "pet_id": pet_id,
            "title": "Veteriner",
            "description": "Kontrol randevusu",
            "remind_at": "20/04/2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})

        response = client.get(
            f"/api/reminders/pet/{pet_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        reminders = response.json()
        assert len(reminders) == 1

    def test_delete_reminder(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        add_resp = client.post("/api/reminders/add", json={
            "pet_id": pet_id,
            "title": "Mama",
            "description": "Mama al",
            "remind_at": "10/04/2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        rem_id = add_resp.json()["reminder_id"]

        response = client.delete(
            f"/api/reminders/{rem_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Hatırlatıcı silindi."

    def test_delete_reminder_not_found(self, client, auth_token):
        response = client.delete(
            "/api/reminders/9999",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404

    def test_reminders_no_auth(self, client):
        add_resp = client.post("/api/reminders/add", json={
            "pet_id": 1,
            "title": "NoAuth",
            "description": "Test",
            "remind_at": "01/01/2027"
        })
        list_resp = client.get("/api/reminders/pet/1")
        delete_resp = client.delete("/api/reminders/1")

        assert add_resp.status_code == 401
        assert list_resp.status_code == 401
        assert delete_resp.status_code == 401

    def test_reminder_history(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        client.post("/api/reminders/add", json={
            "pet_id": pet_id,
            "title": "Eski Aşı",
            "description": "Geçmiş kayıt",
            "remind_at": "01/01/2020"
        }, headers={"Authorization": f"Bearer {auth_token}"})

        history_resp = client.get(
            f"/api/reminders/history/pet/{pet_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert history_resp.status_code == 200
        assert len(history_resp.json()) >= 1

class TestOwnership:
    def test_other_user_cannot_touch_pet_data(self, client, db_session, registered_user, auth_token):
        owner_h = {"Authorization": f"Bearer {auth_token}"}
        pet_id = client.post("/api/pets/add", json={"name": "Pamuk", "species": "Kedi", "breed": "Van"},
                             headers=owner_h).json()["pet_id"]
        rem_id = client.post("/api/reminders/add", json={
            "pet_id": pet_id, "title": "Aşı", "description": "x", "remind_at": "01/01/2030",
        }, headers=owner_h).json()["reminder_id"]

        client.post("/api/auth/register", json={"full_name": "Baska", "email": "baska@example.com", "password": "pass1234"})
        db_session.query(User).filter(User.email == "baska@example.com").update({"is_verified": True})
        db_session.commit()
        token = client.post("/api/auth/login", json={"email": "baska@example.com", "password": "pass1234"}).json()["access_token"]
        other_h = {"Authorization": f"Bearer {token}"}

        assert client.get(f"/api/reminders/pet/{pet_id}", headers=other_h).status_code == 403
        assert client.get(f"/api/reminders/history/pet/{pet_id}", headers=other_h).status_code == 403
        assert client.post("/api/reminders/add", json={
            "pet_id": pet_id, "title": "x", "description": "x", "remind_at": "01/01/2030",
        }, headers=other_h).status_code == 403
        assert client.delete(f"/api/reminders/{rem_id}", headers=other_h).status_code == 403
        assert client.post(f"/api/analyze/meow?pet_id={pet_id}", headers=other_h).status_code == 403

        # Sahibi etkilenmemeli
        assert client.get(f"/api/reminders/pet/{pet_id}", headers=owner_h).status_code == 200
