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
        holding_cost = validated_data.pop("holding_cost", 1.0)
        stockout_cost = validated_data.pop("stockout_cost", 0.0)
        opening_stock = validated_data.pop("opening_stock", 0)
        service_level = validated_data.pop("service_level", 95)
        z_value = validated_data.pop("z_value", 1.645)

        product = super().create(validated_data)

        from inventorypolicy.models import InventoryPolicy
        InventoryPolicy.objects.create(
            product=product,
            opening_stock=opening_stock,
            ordering_cost=ordering_cost,
            holding_cost=holding_cost,
            stockout_cost=stockout_cost,
            service_level=service_level,
            z_value=z_value,
            average_demand=0.0,
            average_lead_time=0.0,
            safety_stock=0,
            reorder_point=0,
            reorder_quantity=100,
            annual_demand=0,
        )

        return product

    def update(self, instance, validated_data):
        ordering_cost = validated_data.pop("ordering_cost", None)
        holding_cost = validated_data.pop("holding_cost", None)
        stockout_cost = validated_data.pop("stockout_cost", None)
        opening_stock = validated_data.pop("opening_stock", None)
        service_level = validated_data.pop("service_level", None)
        z_value = validated_data.pop("z_value", None)

        product = super().update(instance, validated_data)

        from inventorypolicy.models import InventoryPolicy
        policy = product.inventory_policies.order_by("-id").first()
        if not policy:
            policy = InventoryPolicy(
                product=product,
                average_demand=0.0,
                average_lead_time=0.0,
                safety_stock=0,
                reorder_point=0,
                reorder_quantity=100,
                annual_demand=0,
            )
            policy.ordering_cost = ordering_cost if ordering_cost is not None else 0.0
            policy.holding_cost = holding_cost if holding_cost is not None else 1.0
            policy.stockout_cost = stockout_cost if stockout_cost is not None else 0.0
            policy.opening_stock = opening_stock if opening_stock is not None else 0
            policy.service_level = service_level if service_level is not None else 95
            policy.z_value = z_value if z_value is not None else 1.645
            policy.save()
        else:
            if ordering_cost is not None: policy.ordering_cost = ordering_cost
            if holding_cost is not None: policy.holding_cost = holding_cost
            if stockout_cost is not None: policy.stockout_cost = stockout_cost
            if opening_stock is not None: policy.opening_stock = opening_stock
            if service_level is not None: policy.service_level = service_level
            if z_value is not None: policy.z_value = z_value
            policy.save()

        return product

    def to_representation(self, instance):
        org_id = instance.organization_id
        if not org_id and instance.supplier and instance.supplier.organization_id:
            org_id = instance.supplier.organization_id

        policies = list(instance.inventory_policies.all())
        policy = policies[0] if policies else None
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