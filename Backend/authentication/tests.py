from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class AuthenticationOTPHashTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="otpuser",
            email="otpuser@example.com",
            password="oldpassword123"
        )

    def test_forgot_password_hashes_otp_in_database(self):
        url = "/api/forgot-password/"
        response = self.client.post(url, {"email": self.user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        # Verify reset_otp is present and hashed with PBKDF2/SHA256
        self.assertIsNotNone(self.user.reset_otp)
        self.assertTrue(self.user.reset_otp.startswith("pbkdf2_sha256$"))

    def test_reset_password_with_hashed_otp(self):
        # Trigger forgot password to generate hashed OTP
        self.client.post("/api/forgot-password/", {"email": self.user.email}, format="json")
        self.user.refresh_from_db()

        url = "/api/reset-password/"
        wrong_resp = self.client.post(url, {
            "email": self.user.email,
            "otp": "0000",
            "new_password": "newpassword123",
            "confirm_password": "newpassword123"
        }, format="json")
        self.assertEqual(wrong_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_model_save_hashes_reset_otp_when_values_are_plain_text(self):
        self.user.reset_otp = "1234"
        self.user.save()
        self.user.refresh_from_db()

        self.assertIsNotNone(self.user.reset_otp)
        self.assertTrue(self.user.reset_otp.startswith("pbkdf2_sha256$"))

    def test_get_user_by_authentication_and_get_admin_by_id(self):
        # Obtain JWT token via login
        login_resp = self.client.post("/api/login/", {
            "username": "otpuser",
            "password": "oldpassword123"
        }, format="json")
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.data["access_token"]

        # Authenticate header
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 1. GET admin by admin_id (/api/admin-profile/<admin_id>/)
        admin_detail_resp = self.client.get(f"/api/admin-profile/{self.user.admin_id}/")
        self.assertEqual(admin_detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_detail_resp.data["admin_id"], self.user.admin_id)
        self.assertEqual(admin_detail_resp.data["email"], "otpuser@example.com")

        # 2. GET admin for unauthorized admin_id returns 403 FORBIDDEN
        forbidden_resp = self.client.get("/api/admin-profile/99999/")
        self.assertEqual(forbidden_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_summary_get_by_id_and_permission_check(self):
        login_resp = self.client.post("/api/login/", {
            "username": "otpuser",
            "password": "oldpassword123"
        }, format="json")
        token = login_resp.data["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 1. GET BY ID matching user admin_id
        summary_id_resp = self.client.get(f"/api/admin-summary/{self.user.admin_id}/")
        self.assertEqual(summary_id_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(summary_id_resp.data["admin_id"], self.user.admin_id)
        self.assertEqual(summary_id_resp.data["email"], "otpuser@example.com")
        self.assertIn("organizations", summary_id_resp.data)
        self.assertIn("suppliers", summary_id_resp.data)
        self.assertIn("products", summary_id_resp.data)

        # 3. GET BY ID for unauthorized admin_id returns 403 FORBIDDEN
        forbidden_resp = self.client.get("/api/admin-summary/99999/")
        self.assertEqual(forbidden_resp.status_code, status.HTTP_403_FORBIDDEN)





