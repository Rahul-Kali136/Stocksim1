from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    AdminSummarySerializer,
)


import threading

def send_authentication_notification(user, subject, message):
    recipient_email = user.email

    def _send_email_async():
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"[Email Notification Error] Failed to send email to {recipient_email}: {e}")

    threading.Thread(target=_send_email_async, daemon=True).start()



# Change this import if your helper is in a different file

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            registration_password = request.data.get("password")
            user = serializer.save()

            send_authentication_notification(
                user=user,
                subject="Registration completed successfully",
                message=(
                    f"Hello {user.username},\n\n"
                    "Your StockSim registration was completed successfully. Please go to the login page and sign in with your credentials:\n\n"
                    f"Username: {user.username}\n"
                    f"Password: {registration_password}"
                ),
            )

            return Response(
                {
                    "message": "User Registered Successfully",
                    "admin_id": user.admin_id,
                    "username": user.username,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "role": user.role,
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

import uuid
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.settings import api_settings

from datetime import timedelta

class CompactAccessToken(AccessToken):
    lifetime = timedelta(days=1)

    @classmethod
    def for_user(cls, user):
        token = cls()
        token.payload.clear()
        token["token_type"] = cls.token_type
        token.set_exp(lifetime=cls.lifetime)
        token["jti"] = uuid.uuid4().hex[:6]
        token[api_settings.USER_ID_CLAIM] = user.pk
        return token


# ----------------------------
# Login
# ----------------------------

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data["user"]

            access_token = str(CompactAccessToken.for_user(user))

            send_authentication_notification(
                user,
                "New StockSim login",
                f"Hello {user.username},\n\n"
                "You have logged in to your StockSim account successfully.",
            )

            return Response(
                {
                    "message": "Login Successful",
                    "access_token": access_token,
                    "admin_id": user.admin_id,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



import random

# ----------------------------
# Forgot Password
# ----------------------------
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = ForgotPasswordSerializer(data=request.data)

        if serializer.is_valid():

            email = serializer.validated_data["email"]

            try:
                user = CustomUser.objects.get(email=email)

            except CustomUser.DoesNotExist:
                return Response(
                    {"error": "Email is not registered. OTP cannot be sent."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Generate 4-digit random OTP and hash it before saving
            otp = str(random.randint(1000, 9999))
            user.reset_otp = make_password(otp)
            user.save()

            message = f"""Hello {user.username},

You requested to reset your password.

Password Reset OTP: {otp}

Use this OTP to reset your password.

Thank You."""

            send_authentication_notification(
                user,
                "StockSim password reset request",
                message,
            )

            return Response(
                {
                    "message": "Password reset OTP sent to your email."
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



# ----------------------------
# Reset Password
# ----------------------------
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data.get("email")
        otp = serializer.validated_data.get("otp") or serializer.validated_data.get("token") or request.data.get("otp") or request.data.get("token")
        new_password = serializer.validated_data["new_password"]
        confirm_password = serializer.validated_data["confirm_password"]

        # Check passwords match
        if new_password != confirm_password:
            return Response(
                {"error": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check email is registered
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Email is not registered. Password reset is not allowed."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify OTP strictly using check_password for hashed OTPs
        if not otp or not user.reset_otp or not (check_password(str(otp).strip(), user.reset_otp) or str(user.reset_otp).strip() == str(otp).strip()):
            return Response(
                {"error": "Invalid or Expired OTP. Password reset is not allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password and preserve hashed reset_otp in database table
        user.set_password(new_password)
        user.save()

        send_authentication_notification(
            user,
            "Password reset successful - StockSim",
            (
                f"Hello {user.username},\n\n"
                "Your StockSim account password has been reset successfully.\n\n"
                f"Username: {user.username}\n"
                f"New Password: {new_password}\n\n"
                "You can now log in to your account with your new password.\n\n"
                "If you did not perform this action, please contact support immediately."
            ),
        )

        return Response(
            {"message": "Password Reset Successfully"},
            status=status.HTTP_200_OK
        )



from rest_framework_simplejwt.authentication import JWTAuthentication

class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.strip():
            return None

        token_str = auth_header.strip()
        if not token_str.lower().startswith("bearer"):
            return None

        parts = token_str.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip() or parts[1].strip().lower() in ["null", "undefined"]:
            return None

        raw_token = parts[1].strip()

        try:
            res = super().authenticate(request)
            if res is not None:
                return res
        except Exception:
            pass

        return None


# ----------------------------
# Get Admin by admin_id
# ----------------------------
class AdminDetailView(APIView):
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, admin_id=None):
        pk = admin_id or (request.user.admin_id if getattr(request.user, "is_authenticated", False) else 1)

        try:
            user = CustomUser.objects.get(admin_id=pk)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": f"Admin with admin_id {pk} does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ----------------------------
# Admin Summary Detail (Get Admin Summary by admin_id)
# ----------------------------
class AdminSummaryDetailView(APIView):
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, admin_id=None):
        pk = admin_id or (request.user.admin_id if getattr(request.user, "is_authenticated", False) else 1)

        try:
            admin_obj = CustomUser.objects.get(admin_id=pk)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": f"Admin with admin_id {pk} does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminSummarySerializer(admin_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SendEmailOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = request.data.get("email")
        if not new_email:
            return Response({"error": "Email is required"}, status=400)
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store in user model (hashed)
        user = request.user
        user.reset_otp = make_password(otp)
        user.save()
        
        # Send mail
        subject = "StockSim Email Verification OTP"
        message = f"Hello {user.username},\n\nYour 6-digit verification OTP to update your email address is: {otp}\n\nThank you."
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[new_email],
                fail_silently=False,
            )
        except Exception as e:
            return Response({"error": f"Failed to send email: {str(e)}"}, status=500)
            
        return Response({"message": "OTP sent successfully"})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email")
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not email or not current_password or not new_password:
            return Response({"error": "Missing parameters"}, status=400)

        try:
            if "@" in str(email):
                user = CustomUser.objects.get(email=email)
            else:
                user = CustomUser.objects.get(username=email)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if not user.check_password(current_password):
            return Response({"error": "Incorrect current password"}, status=400)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password changed successfully"})


# ----------------------------
# Profile View (GET/PUT by email)
# ----------------------------
class ProfileView(APIView):
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get("email")
        if not email:
            return Response({"error": "Email parameter is required"}, status=400)
        try:
            if "@" in str(email):
                user = CustomUser.objects.get(email=email)
            else:
                user = CustomUser.objects.get(username=email)
        except CustomUser.DoesNotExist:
            try:
                user = CustomUser.objects.get(username=email)
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found"}, status=404)
        
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        email = request.query_params.get("email")
        if not email:
            return Response({"error": "Email parameter is required"}, status=400)
        try:
            if "@" in str(email):
                user = CustomUser.objects.get(email=email)
            else:
                user = CustomUser.objects.get(username=email)
        except CustomUser.DoesNotExist:
            try:
                user = CustomUser.objects.get(username=email)
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

        # Update fields
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        new_email = request.data.get("email")
        new_username = request.data.get("username")
        phone_number = request.data.get("phone_number")
        otp = request.data.get("otp")
        avatar = request.data.get("avatar")

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if new_email is not None:
            # Verify OTP
            if not otp or not user.reset_otp or not (check_password(str(otp).strip(), user.reset_otp) or str(user.reset_otp).strip() == str(otp).strip()):
                return Response({"error": "Invalid or Expired OTP. Email update not allowed."}, status=400)
            user.email = new_email
            user.reset_otp = None
        if new_username is not None:
            user.username = new_username
        if phone_number is not None:
            user.phone_number = phone_number
        if avatar is not None:
            user.avatar = avatar

        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)




