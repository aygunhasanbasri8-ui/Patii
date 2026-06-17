class TestChatbot:
    def test_ask_chatbot_success(self, client, auth_token):
        response = client.post(
            "/api/chatbot/ask",
            json={"question": "Kedim tüy döküyor, normal mi?"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert len(data["answer"]) > 0

    def test_ask_chatbot_with_existing_pet_id(self, client, registered_user, auth_token):
       
        login_resp = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        client.post("/api/pets/add", json={
            "name": "Tekir", "species": "Kedi", "breed": "Tekir"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        pets = client.get(
            f"/api/pets/my-pets/{login_resp.json()['user_id']}",
            headers={"Authorization": f"Bearer {auth_token}"},
        ).json()
        pet_id = pets[0]["id"]

        response = client.post(
            "/api/chatbot/ask",
            json={"question": "Aşı zamanı geldi mi?", "pet_id": pet_id},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        assert "answer" in response.json()

    def test_ask_chatbot_with_nonexistent_pet_id(self, client, auth_token):

        response = client.post(
            "/api/chatbot/ask",
            json={"question": "Aşı zamanı geldi mi?", "pet_id": 9999},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        assert "answer" in response.json()

    def test_ask_chatbot_empty_question(self, client, auth_token):
        response = client.post(
            "/api/chatbot/ask",
            json={"question": "   "},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 400

    def test_ask_chatbot_unknown_topic_returns_default(self, client, auth_token):
        response = client.post(
            "/api/chatbot/ask",
            json={"question": "kuantum fiziği nedir"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        assert "veterinere" in response.json()["answer"].lower()

    def test_ask_chatbot_no_auth(self, client):
        response = client.post("/api/chatbot/ask", json={"question": "merhaba"})
        assert response.status_code == 401