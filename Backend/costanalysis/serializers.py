from rest_framework import serializers
from .models import InventoryCostAnalysis
from product.models import Product


class InventoryCostAnalysisSerializer(serializers.ModelSerializer):

    policy_id = serializers.IntegerField(
        source="policy.id",
        read_only=True
    )

    product_id = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()

    average_inventory = serializers.SerializerMethodField()
    holding_cost = serializers.SerializerMethodField()
    ordering_cost = serializers.SerializerMethodField()
    stockout_cost = serializers.SerializerMethodField()
    total_inventory_cost = serializers.SerializerMethodField()

    class Meta:
        model = InventoryCostAnalysis
        fields = [
            "id",
            "product_id",
            "product",
            "policy_id",
            "simulation_days",
            "average_inventory",
            "total_demand",
            "total_orders",
            "stockout_quantity",
            "holding_cost",
            "ordering_cost",
            "stockout_cost",
            "total_inventory_cost",
            "created_at",
        ]

    def get_product_id(self, obj):
        if obj.product_id:
            return obj.product_id

        if obj.product:
            return obj.product.product_id

        if obj.policy and obj.policy.product_id:
            return obj.policy.product_id

        first_p = Product.objects.first()
        return first_p.product_id if first_p else None

    def get_product(self, obj):
        return self.get_product_id(obj)

    def get_average_inventory(self, obj):
        return round(float(obj.average_inventory or 0.0), 2)

    def get_holding_cost(self, obj):
        return round(float(obj.holding_cost or 0.0), 2)

    def get_ordering_cost(self, obj):
        return round(float(obj.ordering_cost or 0.0), 2)

    def get_stockout_cost(self, obj):
        return round(float(obj.stockout_cost or 0.0), 2)

    def get_total_inventory_cost(self, obj):
        return round(float(obj.total_inventory_cost or 0.0), 2)
