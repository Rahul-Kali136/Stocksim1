from rest_framework import serializers
from .models import PolicyComparison


class PolicyComparisonSerializer(serializers.ModelSerializer):

    policy_id = serializers.IntegerField(source="policy.id", read_only=True)
    cost_analysis_id = serializers.IntegerField(source="cost_analysis.id", read_only=True)
    product_id = serializers.IntegerField(source="product.product_id", read_only=True, default=None)
    service_level = serializers.IntegerField(source="policy.service_level", read_only=True, default=None)

    class Meta:
        model = PolicyComparison
        fields = [
            "id",
            "product_id",
            "policy_id",
            "cost_analysis_id",
            "safety_stock",
            "reorder_point",
            "reorder_quantity",
            "total_inventory_cost",
            "overall_score",
            "target_service_level",
            "recommendation",
            "created_at",
            "service_level",
        ]