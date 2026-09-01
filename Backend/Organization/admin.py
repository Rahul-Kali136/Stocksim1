from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(SimpleHistoryAdmin):
    list_display = (
        "organization_id",
        "organization_name",
        "organization_type",
        "location",
        "created_at",
    )

    search_fields = (
        "organization_name",
        "organization_type",
        "location",
    )

    list_filter = (
        "organization_type",
        "location",
    )

    ordering = (
        "organization_name",
    )