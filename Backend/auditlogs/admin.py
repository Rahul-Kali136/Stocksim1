from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin configuration for Audit Logs.
    """

    list_display = (
        "id",
        "user",
        "organization",
        "action",
        "module",
        "created_at",
    )

    list_filter = (
        "action",
        "module",
        "organization",
        "created_at",
    )

    search_fields = (
        "user__username",
        "organization__name",
        "module",
        "description",
        "ip_address",
    )

    ordering = (
        "-created_at",
    )

    readonly_fields = (
        "created_at",
    )

    autocomplete_fields = (
        "user",
        "organization",
    )

    fieldsets = (
        (
            "Audit Information",
            {
                "fields": (
                    "user",
                    "organization",
                    "action",
                    "module",
                    "description",
                )
            },
        ),
        (
            "Additional Information",
            {
                "fields": (
                    "ip_address",
                    "old_data",
                    "new_data",
                )
            },
        ),
        (
            "Timestamp",
            {
                "fields": (
                    "created_at",
                )
            },
        ),
    )

    actions = (
        "delete_selected_logs",
    )

    @admin.action(description="Delete selected audit logs")
    def delete_selected_logs(self, request, queryset):
        queryset.delete()