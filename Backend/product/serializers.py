from rest_framework import serializers
from .models import Product
from suppliers.models import Supplier
from Organization.models import Organization


class ProductSerializer(serializers.ModelSerializer):
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(),
        source="supplier",
        required=False,
        allow_null=True
    )
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source="organization",
        required=False,
        allow_null=True
    )

    ordering_cost = serializers.FloatField(required=False, write_only=True)
    holding_cost = serializers.FloatField(required=False, write_only=True)
    stockout_cost = serializers.FloatField(required=False, write_only=True)
    opening_stock = serializers.IntegerField(required=False, write_only=True)
    service_level = serializers.IntegerField(required=False, write_only=True)
    z_value = serializers.FloatField(required=False, write_only=True)

    class Meta:
        model = Product
        fields = [
            "product_id",
            "product_name",
            "category",
            "unit_price",
            "organization_id",
            "supplier_id",
            "ordering_cost",
            "holding_cost",
            "stockout_cost",
            "opening_stock",
            "service_level",
            "z_value",
        ]

    def create(self, validated_data):
        ordering_cost = validated_data.pop("ordering_cost", 0.0)
        holding_cost = validated_data.pop("holding_cost", 0.0)
        stockout_cost = validated_data.pop("stockout_cost", 0.0)
        opening_stock = validated_data.pop("opening_stock", 0)
        service_level = validated_data.pop("service_level", 95)
        z_value = validated_data.pop("z_value", 1.645)

        product = super().create(validated_data)

        return product

    def update(self, instance, validated_data):
        ordering_cost = validated_data.pop("ordering_cost", None)
        holding_cost = validated_data.pop("holding_cost", None)
        stockout_cost = validated_data.pop("stockout_cost", None)
        opening_stock = validated_data.pop("opening_stock", None)
        service_level = validated_data.pop("service_level", None)
        z_value = validated_data.pop("z_value", None)

        product = super().update(instance, validated_data)

        return product

    def to_representation(self, instance):
        org_id = instance.organization_id
        if not org_id and instance.supplier and instance.supplier.organization_id:
            org_id = instance.supplier.organization_id

        policy = instance.inventory_policies.order_by("-id").first()
        policy_data = {
            "service_level": 95,
            "opening_stock": 0,
            "z_value": 1.645,
            "ordering_cost": 0.0,
            "holding_cost": 0.0,
            "stockout_cost": 0.0,
            "safety_stock": 0,
            "rop": 0,
            "roq": 0,
            "policy_id": None,
        }
        if policy:
            policy_data = {
                "service_level": policy.service_level,
                "opening_stock": policy.opening_stock,
                "z_value": policy.z_value,
                "ordering_cost": policy.ordering_cost,
                "holding_cost": policy.holding_cost,
                "stockout_cost": policy.stockout_cost,
                "safety_stock": policy.safety_stock,
                "rop": policy.reorder_point,
                "roq": policy.reorder_quantity,
                "policy_id": policy.id,
            }

        representation = {
            "product_id": instance.product_id,
            "product_name": instance.product_name,
            "category": instance.category,
            "unit_price": str(instance.unit_price),
            "organization_id": org_id,
            "supplier_id": instance.supplier_id,
        }
        representation.update(policy_data)
        return representation