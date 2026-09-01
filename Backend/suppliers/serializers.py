from rest_framework import serializers
from .models import Supplier
from Organization.models import Organization
from product.models import Product


class SupplierSerializer(serializers.ModelSerializer):

    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source="organization",
        required=False,
        allow_null=True,
    )
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Supplier
        fields = [
            "supplier_id",
            "supplier_name",
            "business_type",
            "phone",
            "email",
            "address",
            "created_at",
            "organization_id",
            "product_id",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("product_id") is None and instance.organization_id:
            from product.models import Product
            prod = Product.objects.filter(organization_id=instance.organization_id).first() or Product.objects.first()
            if prod:
                data["product_id"] = prod.product_id
                if instance.pk:
                    instance.product = prod
                    instance.save(update_fields=["product"])
        return data