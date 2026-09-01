from rest_framework import serializers

from .models import InventorySummary



class InventorySummarySerializer(
    serializers.ModelSerializer
):

    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True
    )


    organization_name = serializers.CharField(
        source="organization.organization_name",
        read_only=True
    )



    class Meta:

        model = InventorySummary


        fields = [

            "id",

            "organization",
            "organization_name",

            "product",
            "product_name",

            "opening_stock",

            "closing_stock",

            "total_demand",

            "total_orders",

            "stockout_days",

            "inventory_cost",

            "average_inventory",

            "service_level",

            "created_at",

            "updated_at"

        ]