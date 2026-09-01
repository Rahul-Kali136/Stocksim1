from django.db import models

from Organization.models import Organization
from product.models import Product



class InventorySummary(models.Model):

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="inventory_summaries"
    )


    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory_summaries"
    )


    opening_stock = models.IntegerField(
        default=0
    )


    closing_stock = models.IntegerField(
        default=0
    )


    total_demand = models.IntegerField(
        default=0
    )


    total_orders = models.IntegerField(
        default=0
    )


    stockout_days = models.IntegerField(
        default=0
    )


    inventory_cost = models.FloatField(
        default=0
    )


    average_inventory = models.FloatField(
        default=0
    )


    service_level = models.FloatField(
        default=0
    )


    created_at = models.DateTimeField(
        auto_now_add=True
    )


    updated_at = models.DateTimeField(
        auto_now=True
    )



    class Meta:

        db_table = "inventory_summary"

        ordering = [
            "-created_at"
        ]



    def __str__(self):

        return (
            f"{self.product.product_name} "
            f"- Inventory Summary"
        )