class TestGlobalExceptionHandler:
    def test_unexpected_exception_returns_500(self, client, registered_user, auth_token, monkeypatch):
        import app.services as svc
        from fastapi.testclient import TestClient
        from main import app as _app

        def broken_service(*args, **kwargs):
            raise RuntimeError("Simulated unexpected error")

        monkeypatch.setattr(svc, "get_owner_pets", broken_service)

        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        user_id = login_resp.json()["user_id"]

        # raise_server_exceptions=False: exception handler'ın çalışmasına izin verir.
        with TestClient(_app, raise_server_exceptions=False) as safe_client:
            response = safe_client.get(
                f"/api/pets/my-pets/{user_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
            )

        assert response.status_code == 500
        assert response.json()["detail"] == "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."


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
        response = client.post("/api/pets/add", json={
            "name": "Boncuk",
            "species": "Kedi",
            "breed": "Tekir",
        }, headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert "Boncuk" in response.json()["message"]

    def test_add_pet_no_auth(self, client):
        response = client.post("/api/pets/add", json={
            "name": "Boncuk",
            "species": "Kedi",
            "breed": "Tekir",
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
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        response = client.get(f"/api/pets/my-pets/{user_id}", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert response.json() == []

    def test_get_my_pets_no_auth(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        user_id = login_resp.json()["user_id"]
        response = client.get(f"/api/pets/my-pets/{user_id}")
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

    def test_update_reminder(self, client, registered_user, auth_token):
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        user_id = login_resp.json()["user_id"]
        pet_id = self._create_pet(client, auth_token, user_id)

        add_resp = client.post("/api/reminders/add", json={
            "pet_id": pet_id,
            "title": "Eski Başlık",
            "description": "Eski açıklama",
            "remind_at": "10/05/2026",
        }, headers={"Authorization": f"Bearer {auth_token}"})
        rem_id = add_resp.json()["reminder_id"]

        response = client.put(
            f"/api/reminders/{rem_id}",
            json={"title": "Yeni Başlık", "description": "Yeni açıklama", "remind_at": "20/05/2026"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Hatırlatıcı güncellendi."
        assert data["reminder_id"] == rem_id

    def test_update_reminder_not_found(self, client, auth_token):
        response = client.put(
            "/api/reminders/9999",
            json={"title": "X", "description": "Y", "remind_at": "01/01/2027"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404

    def test_update_reminder_forbidden(self, client):
        def _reg_login(email):
            client.post("/api/auth/register", json={
                "full_name": "Test", "email": email, "password": "pass123"
            })
            resp = client.post("/api/auth/login", json={"email": email, "password": "pass123"})
            d = resp.json()
            return d["user_id"], d["access_token"]

        user_a_id, token_a = _reg_login("rem_a@test.com")
        _, token_b = _reg_login("rem_b@test.com")

        client.post("/api/pets/add", json={
            "name": "Minnak", "species": "Kedi", "breed": "Tekir"
        }, headers={"Authorization": f"Bearer {token_a}"})
        pets = client.get(
            f"/api/pets/my-pets/{user_a_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        ).json()
        pet_id = pets[0]["id"]

        add_resp = client.post("/api/reminders/add", json={
            "pet_id": pet_id, "title": "Aşı", "description": "Karma", "remind_at": "01/06/2026"
        }, headers={"Authorization": f"Bearer {token_a}"})
        rem_id = add_resp.json()["reminder_id"]

        response = client.put(
            f"/api/reminders/{rem_id}",
            json={"title": "Hack", "description": "Hack", "remind_at": "01/01/2027"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 403

    def test_update_reminder_no_auth(self, client):
        response = client.put(
            "/api/reminders/1",
            json={"title": "X", "description": "Y", "remind_at": "01/01/2027"},
        )
        assert response.status_code == 401

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


class TestBOLA:
    """Broken Object Level Authorization — sadece yetkisiz erişim 403 döndürmeli."""

    def _register_and_login(self, client, email, password="pass123"):
        client.post("/api/auth/register", json={
            "full_name": "Test User", "email": email, "password": password
        })
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        data = resp.json()
        return data["user_id"], data["access_token"]

    def test_get_another_users_pets_returns_403(self, client):
        user_a_id, token_a = self._register_and_login(client, "a@bola.com")
        _, token_b = self._register_and_login(client, "b@bola.com")

        response = client.get(
            f"/api/pets/my-pets/{user_a_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 403

    def test_update_another_users_pet_returns_403(self, client):
        user_a_id, token_a = self._register_and_login(client, "a@bola.com")
        _, token_b = self._register_and_login(client, "b@bola.com")

        client.post("/api/pets/add", json={
            "name": "Boncuk", "species": "Kedi", "breed": "Tekir"
        }, headers={"Authorization": f"Bearer {token_a}"})

        pets = client.get(
            f"/api/pets/my-pets/{user_a_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        ).json()
        pet_id = pets[0]["id"]

        response = client.put(
            f"/api/pets/{pet_id}",
            json={"name": "Hacked", "species": "Kedi", "breed": "Tekir"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 403

    def test_delete_another_users_pet_returns_403(self, client):
        user_a_id, token_a = self._register_and_login(client, "a@bola.com")
        _, token_b = self._register_and_login(client, "b@bola.com")

        client.post("/api/pets/add", json={
            "name": "Boncuk", "species": "Kedi", "breed": "Tekir"
        }, headers={"Authorization": f"Bearer {token_a}"})

        pets = client.get(
            f"/api/pets/my-pets/{user_a_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        ).json()
        pet_id = pets[0]["id"]

        response = client.delete(
            f"/api/pets/{pet_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 403