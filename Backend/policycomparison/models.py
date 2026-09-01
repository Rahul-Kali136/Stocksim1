from django.db import models

from product.models import Product
from inventorypolicy.models import InventoryPolicy
from costanalysis.models import InventoryCostAnalysis


class PolicyComparison(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        db_column="product_id",
        related_name="policy_comparisons",
        null=True,
        blank=True,
    )

    policy = models.ForeignKey(
        InventoryPolicy,
        on_delete=models.CASCADE
    )

    cost_analysis = models.ForeignKey(
        InventoryCostAnalysis,
        on_delete=models.CASCADE
    )

    safety_stock = models.PositiveIntegerField(default=0)

    reorder_point = models.PositiveIntegerField(default=0)

    reorder_quantity = models.PositiveIntegerField(default=0)

    total_inventory_cost = models.FloatField()

    overall_score = models.FloatField(default=0.0)

    target_service_level = models.PositiveIntegerField(default=95)

    recommendation = models.CharField(
        max_length=50,
        default="Not Recommended"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "policy_comparison"

    def __str__(self):
        product_name = self.product.product_name if self.product else "Unassigned Product"
        return f"{product_name} - Policy {self.policy.id}"