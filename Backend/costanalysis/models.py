from django.db import models
from product.models import Product
from inventorypolicy.models import InventoryPolicy


class InventoryCostAnalysis(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        db_column="product_id",
        related_name="cost_analyses",
        null=True,
        blank=True,
    )

    policy = models.ForeignKey(
        InventoryPolicy,
        on_delete=models.CASCADE,
        db_column="policy_id",
        related_name="cost_analysis",
    )

    simulation_days = models.PositiveIntegerField()
    average_inventory = models.FloatField()
    total_demand = models.PositiveIntegerField()
    total_orders = models.PositiveIntegerField()
    stockout_quantity = models.PositiveIntegerField()
    holding_cost = models.FloatField()
    ordering_cost = models.FloatField()
    stockout_cost = models.FloatField()
    total_inventory_cost = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_cost_analysis"

    def __str__(self):
        product_name = "Unknown Product"
        if self.product:
            product_name = self.product.product_name

        policy_name = "Unknown Policy"
        if self.policy:
            policy_name = self.policy.policy_name

        return f"{product_name} - {policy_name} - Cost Analysis"
