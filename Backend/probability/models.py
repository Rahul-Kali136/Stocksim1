from django.db import models
from product.models import Product


class ProbabilityDistribution(models.Model):

    probability_id = models.AutoField(primary_key=True)

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="probability_distributions",
        db_column="product_id"
    )

    # Demand
    demand_value = models.JSONField(default=list)

    demand_frequency = models.JSONField(default=list)

    demand_probability = models.JSONField(default=list)

    demand_cumulative_probability = models.JSONField(default=list)

    demand_random_interval = models.JSONField(default=list)

    # Lead Time
    lead_time_days = models.JSONField(default=list)

    lead_frequency = models.JSONField(default=list)

    lead_probability = models.JSONField(default=list)

    lead_cumulative_probability = models.JSONField(default=list)

    lead_random_interval = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "probability_distribution"
        ordering = ["probability_id"]

    def __str__(self):
        return f"{self.product.product_name}"