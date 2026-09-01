from django.db import models
from product.models import Product


class InventoryPolicy(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        db_column="product_id",
        related_name="inventory_policies",
        null=True,
        blank=True,
    )

    service_level = models.PositiveIntegerField()

    opening_stock = models.IntegerField(default=0)

    z_value = models.FloatField()

    average_demand = models.FloatField()

    average_lead_time = models.FloatField()

    safety_stock = models.PositiveIntegerField()

    reorder_point = models.PositiveIntegerField()

    reorder_quantity = models.PositiveIntegerField()

    annual_demand = models.PositiveIntegerField()

    ordering_cost = models.FloatField(default=0.0)

    holding_cost = models.FloatField(default=0.0)

    stockout_cost = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_policy"

    def __str__(self):
        product_name = self.product.product_name if self.product else "Unassigned Product"
        return f"{product_name} - Policy {self.id}"