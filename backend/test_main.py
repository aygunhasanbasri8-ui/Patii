class TestRegister:
    def test_register_success(self, client):
        response = client.post("/api/auth/register", json={
            "full_name": "Ali Veli",
            "email": "ali@example.com",
            "password": "securepass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Kayıt başarılı!"
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
        assert "Boncuk" in response.json()["message"]

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