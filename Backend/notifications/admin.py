from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin configuration for Notification model.
    """

    list_display = (
        "id",
        "title",
        "user",
        "organization",
        "notification_type",
        "priority",
        "is_read",
        "created_at",
    )

    list_filter = (
        "notification_type",
        "priority",
        "is_read",
        "created_at",
    )

    search_fields = (
        "title",
        "message",
        "user__username",
        "organization__name",
        "product__name",
    )

    ordering = (
        "-created_at",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "user",
        "organization",
        "product",
    )

    actions = (
        "mark_as_read",
        "mark_as_unread",
    )

    fieldsets = (
        (
            "Notification Information",
            {
                "fields": (
                    "user",
                    "organization",
                    "product",
                    "title",
                    "message",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "notification_type",
                    "priority",
                    "is_read",
                    "expires_at",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @admin.action(description="Mark selected notifications as Read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description="Mark selected notifications as Unread")
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)