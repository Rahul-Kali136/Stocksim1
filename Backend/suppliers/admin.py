from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(SimpleHistoryAdmin):

    list_display = (
        "supplier_id",
        "supplier_name",
        "business_type",
        "phone",
        "email",
        "address",
        "organization",
        "created_at",
    )

    search_fields = (
        "supplier_name",
        "email",
        "phone",
    )

    list_filter = (
        "business_type",
        "organization",
    )