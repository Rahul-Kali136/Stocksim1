from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from .models import CustomUser


from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import CustomUser


# -----------------------------
# Register Serializer
# -----------------------------
class RegisterSerializer(serializers.ModelSerializer):

    class Meta:
        model = CustomUser
        fields = (
            "admin_id",
            "email",
            "phone_number",
            "username",
            "password",
            "first_name",
            "last_name",
            "state",
            "created_at",
        )

        read_only_fields = (
            "admin_id",
            "created_at",
        )

        extra_kwargs = {
            "password": {
                "write_only": True
            }
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        username = validated_data.get("username")

        if not username or not username.strip():
            email = validated_data.get("email")
            base = (email or "user").split("@")[0].strip()
            base = base.replace(" ", "_") or "user"
            validated_data["username"] = base

        user = CustomUser.objects.create_user(
            password=password,
            **validated_data,
        )
        return user


# -----------------------------
# Login Serializer
# -----------------------------
from django.db.models import Q

class LoginSerializer(serializers.Serializer):

    username = serializers.CharField()

    password = serializers.CharField(write_only=True)

    def validate(self, attrs):

        username_input = attrs.get("username")
        password = attrs.get("password")

        user_obj = CustomUser.objects.filter(Q(username=username_input) | Q(email=username_input)).first()

        if not user_obj:
            raise serializers.ValidationError(
                "Username is not registered. Login not allowed."
            )

        if not user_obj.check_password(password):
            raise serializers.ValidationError(
                "Incorrect password. Login not allowed."
            )

        attrs["user"] = user_obj

        return attrs


# -----------------------------
# Forgot Password Serializer
# -----------------------------
class ForgotPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField()


# -----------------------------
# Reset Password Serializer
# -----------------------------
class ResetPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField()

    token = serializers.CharField(required=False)
    otp = serializers.CharField(required=False)

    new_password = serializers.CharField(write_only=True)

    confirm_password = serializers.CharField(write_only=True)


# -----------------------------
# User / Admin Serializer
# -----------------------------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = (
            "admin_id",
            "username",
            "email",
            "phone_number",
            "role",
            "first_name",
            "last_name",
            "avatar",
            "created_at",
            "updated_at",
        )


# -----------------------------
# Admin Summary Serializer
# -----------------------------
class AdminSummarySerializer(serializers.ModelSerializer):
    admin_name = serializers.CharField(source="username")
    organization_count = serializers.SerializerMethodField()
    organizations = serializers.SerializerMethodField()
    supplier_count = serializers.SerializerMethodField()
    suppliers = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "admin_id",
            "admin_name",
            "email",
            "organization_count",
            "organizations",
            "supplier_count",
            "suppliers",
            "product_count",
            "products",
        )

    def get_organization_count(self, obj):
        from Organization.models import Organization
        return Organization.objects.filter(admin_id=obj.admin_id).count()

    def get_organizations(self, obj):
        from Organization.models import Organization
        qs = Organization.objects.filter(admin_id=obj.admin_id)
        return [
            {
                "organization_id": item.organization_id,
                "organization_name": item.organization_name
            }
            for item in qs
        ]

    def get_supplier_count(self, obj):
        from suppliers.models import Supplier
        return Supplier.objects.filter(organization__admin_id=obj.admin_id).count()

    def get_suppliers(self, obj):
        from suppliers.models import Supplier
        qs = Supplier.objects.filter(organization__admin_id=obj.admin_id)
        return [
            {
                "supplier_id": item.supplier_id,
                "supplier_name": item.supplier_name
            }
            for item in qs
        ]

    def get_product_count(self, obj):
        from product.models import Product
        from django.db.models import Q
        return Product.objects.filter(
            Q(organization__admin_id=obj.admin_id) | Q(supplier__organization__admin_id=obj.admin_id)
        ).distinct().count()

    def get_products(self, obj):
        from product.models import Product
        from django.db.models import Q
        qs = Product.objects.filter(
            Q(organization__admin_id=obj.admin_id) | Q(supplier__organization__admin_id=obj.admin_id)
        ).distinct()
        return [
            {
                "product_id": item.product_id,
                "product_name": item.product_name
            }
            for item in qs
        ]

