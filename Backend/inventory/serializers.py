from rest_framework import serializers
from .models import Inventory


class InventorySerializer(serializers.ModelSerializer):
    product_id = serializers.ReadOnlyField(source="product.product_id")

    class Meta:
        model = Inventory
        fields = [
            "id",
            "product_id",
            "date",
            "demand",
            "lead_time",
        ]