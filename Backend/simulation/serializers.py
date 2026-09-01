from rest_framework import serializers
from .models import MonteCarloSimulation


class MonteCarloSimulationSerializer(serializers.ModelSerializer):

    policy_id = serializers.IntegerField(source="policy.id", read_only=True)
    product_id = serializers.IntegerField(source="product.product_id", read_only=True)

    class Meta:
        model = MonteCarloSimulation
        fields = [
            "id",
            "product_id",
            "policy_id",
            "day",
            "simulation_days",
            "opening_stock",
            "random_demand",
            "simulated_demand",
            "closing_stock",
            "order_status",
            "random_lead",
            "simulated_lead",
            "arrival_day",
            "stock_received",
            "created_at",
        ]