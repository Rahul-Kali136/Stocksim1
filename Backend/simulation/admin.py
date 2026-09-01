from django.contrib import admin
from .models import MonteCarloSimulation


@admin.register(MonteCarloSimulation)
class MonteCarloSimulationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "policy",
        "product",
        "day",
        "opening_stock",
        "simulated_demand",
        "closing_stock",
        "order_status",
        "stock_received",
    )
    list_filter = ("order_status", "policy", "product")
    search_fields = ("product__product_name", "policy__id")

