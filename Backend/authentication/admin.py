from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "admin_id",
        "email",
        "phone_number",
        "username",
        "created_at",
    )

    search_fields = (
        "username",
        "email",
    )

    ordering = (
        "admin_id",
    )

    fieldsets = (
        (None, {
            "fields": (
                "username",
                "password",
            )
        }),
        ("Personal Info", {
            "fields": (
                "email",
                "phone_number",
            )
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        ("Dates", {
            "fields": (
                "last_login",
                "date_joined",
                "created_at",
            )
        }),
    )