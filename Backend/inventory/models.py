from django.db import models
from django.conf import settings
from product.models import Product
class Inventory(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="inventories",
        db_column="product_id",
        null=True,
        blank=True
    )

    date = models.JSONField(default=list)

    demand = models.JSONField(default=list)

    lead_time = models.JSONField(default=list)

    class Meta:
        db_table = "inventory"

    def __str__(self):
        product_name = self.product.product_name if self.product else "Unassigned Product"
        return f"Inventory #{self.id} - {product_name}"