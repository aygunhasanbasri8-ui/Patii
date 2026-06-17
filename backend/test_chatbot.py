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

    def test_ask_chatbot_with_pet_id(self, client, auth_token):
        response = client.post(
            "/api/chatbot/ask",
            json={"question": "Aşı zamanı geldi mi?", "pet_id": 1},
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
