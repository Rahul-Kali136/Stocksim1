from django.contrib import admin

from .models import InventorySummary



@admin.register(InventorySummary)
class InventorySummaryAdmin(admin.ModelAdmin):

    list_display = [

        "id",

        "organization",

        "product",

        "opening_stock",

        "closing_stock",

        "total_demand",

        "inventory_cost",

        "created_at"

    ]


    search_fields = [

        "product__product_name",

        "organization__organization_name"

    ]