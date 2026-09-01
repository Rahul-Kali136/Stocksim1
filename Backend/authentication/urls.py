from django.urls import path
from .views import *
urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),

    path("login/", LoginView.as_view(), name="login"),

    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),

    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),

    path("admin-profile/<int:admin_id>/", AdminDetailView.as_view(), name="admin-profile"),

    path("admin-summary/<int:admin_id>/", AdminSummaryDetailView.as_view(), name="admin-summary-detail"),

    path("profile/", ProfileView.as_view(), name="profile"),

    path("profile/send-otp/", SendEmailOTPView.as_view(), name="send-profile-otp"),

    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
