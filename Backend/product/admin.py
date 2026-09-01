from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Product


@admin.register(Product)
class ProductAdmin(SimpleHistoryAdmin):

    list_display = (
        "product_id",
        "product_name",
        "category",
        "unit_price",
        "supplier",
    )

    search_fields = (
        "product_name",
        "category",
    )

    list_filter = (
        "category",
        "supplier",
    )