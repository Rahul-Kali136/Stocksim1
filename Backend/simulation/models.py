from django.db import models
from django.utils import timezone
from product.models import Product
from inventorypolicy.models import InventoryPolicy


class MonteCarloSimulation(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        db_column="product_id",
        related_name="monte_carlo_simulations",
        null=True,
        blank=True,
    )

    policy = models.ForeignKey(
        InventoryPolicy,
        on_delete=models.CASCADE,
        db_column="policy_id",
        related_name="monte_carlo_simulations",
        null=True,
        blank=True,
    )

    day = models.JSONField(default=list)

    simulation_days = models.IntegerField(default=30, null=True, blank=True)

    opening_stock = models.JSONField(default=list)

    random_demand = models.JSONField(default=list)

    simulated_demand = models.JSONField(default=list)

    closing_stock = models.JSONField(default=list)

    order_status = models.JSONField(default=list)

    random_lead = models.JSONField(default=list)

    simulated_lead = models.JSONField(default=list)

    arrival_day = models.JSONField(default=list)

    stock_received = models.JSONField(default=list)

    created_at = models.DateTimeField(default=timezone.now, blank=True)

    class Meta:
        db_table = "monte_carlo_simulation"

    def save(self, *args, **kwargs):
        if not self.pk and not self.id:
            max_id = MonteCarloSimulation.objects.aggregate(models.Max("id"))["id__max"] or 0
            self.id = max_id + 1
        super().save(*args, **kwargs)

    def __str__(self):
        product_name = self.product.product_name if self.product else "Unassigned Product"
        return f"{product_name} - Policy {self.policy_id}"

