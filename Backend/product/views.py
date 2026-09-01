from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from Organization.models import Organization
from suppliers.models import Supplier
from .models import Product
from .serializers import ProductSerializer


class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.strip():
            return None

        token_str = auth_header.strip()
        if not token_str.lower().startswith("bearer"):
            return None

        parts = token_str.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip() or parts[1].strip().lower() in ["null", "undefined"]:
            return None

        raw_token = parts[1].strip()

        try:
            res = super().authenticate(request)
            if res is not None:
                return res
        except Exception:
            pass

        return None


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not getattr(self.request.user, "is_authenticated", False):
            return Product.objects.none()

        from django.db.models import Q
        supplier_id = self.request.query_params.get("supplier_id") or self.request.query_params.get("supplier")
        org_id = self.request.query_params.get("organization_id") or self.request.query_params.get("organization")

        base_filter = Q(organization__admin_id=self.request.user.admin_id) | Q(supplier__organization__admin_id=self.request.user.admin_id)

        if supplier_id:
            return Product.objects.filter(base_filter, supplier_id=supplier_id).distinct().order_by("product_id")

        if org_id:
            return Product.objects.filter(base_filter, organization_id=org_id).distinct().order_by("product_id")

        return Product.objects.filter(base_filter).distinct().order_by("product_id")

    def perform_create(self, serializer):
        organization = serializer.validated_data.get("organization")
        supplier = serializer.validated_data.get("supplier")

        # Automatically deduce organization if not provided
        if not organization and supplier and hasattr(supplier, "organization"):
            organization = supplier.organization

        if not organization and self.request.user.is_authenticated:
            user_org = self.request.user.organizations.first()
            if user_org:
                organization = user_org

        # Automatically deduce supplier if not provided
        if not supplier:
            from suppliers.models import Supplier
            if organization:
                supplier = Supplier.objects.filter(organization=organization).first()
            elif self.request.user.is_authenticated:
                user_org_ids = self.request.user.organizations.values_list("organization_id", flat=True)
                supplier = Supplier.objects.filter(organization_id__in=user_org_ids).first()

        serializer.save(organization=organization, supplier=supplier)





class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Product.objects.all().order_by("product_id")

    def get(self, request, *args, **kwargs):
        pk = self.kwargs.get("pk")

        # 1. Lookup by product_id
        product = Product.objects.filter(product_id=pk).first()
        if product:
            product_admin_id = None
            if product.organization:
                product_admin_id = product.organization.admin_id
            elif product.supplier and product.supplier.organization:
                product_admin_id = product.supplier.organization.admin_id

            if not self.request.user.is_authenticated or str(product_admin_id) != str(self.request.user.admin_id):
                return Response(
                    {"error": "Product not found or permission denied."},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = self.get_serializer(product)
            return Response(serializer.data)

        # 2. Fallback: Lookup by supplier_id
        if Supplier.objects.filter(supplier_id=pk).exists():
            products = Product.objects.filter(supplier_id=pk).order_by("product_id")
            serializer = self.get_serializer(products, many=True)
            return Response(serializer.data)

        return Response(
            {"error": f"Product or Supplier with ID {pk} not found."},
            status=status.HTTP_404_NOT_FOUND
        )


class ProductByOrganizationView(generics.ListAPIView):
    serializer_class = ProductSerializer
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        org_id = self.kwargs.get("organization_id")
        return Product.objects.filter(organization_id=org_id).order_by("product_id")


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

class ProductBulkUploadView(APIView):
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data
        if not isinstance(data, list):
            return Response({"error": "Expected a list of products"}, status=400)

        from suppliers.models import Supplier
        from product.models import Product
        from Organization.models import Organization
        from inventorypolicy.models import InventoryPolicy
        from inventorypolicy.views import _calculate_policy_data
        from django.db import transaction
        from django.db.models import Max

        created_count = 0
        user_org = request.user.organizations.first()

        with transaction.atomic():
            for item in data:
                name = item.get("name")
                if not name:
                    continue

                # Resolve supplier
                supplier_name = item.get("supplier")
                supplier = None
                if supplier_name:
                    supplier = Supplier.objects.filter(
                        supplier_name__iexact=supplier_name.strip(),
                        organization__admin_id=request.user.admin_id
                    ).first()

                # Resolve organization
                org_name = item.get("organization")
                organization = None
                if org_name:
                    organization = Organization.objects.filter(
                        organization_name__iexact=org_name.strip(),
                        admin_id=request.user.admin_id
                    ).first()
                if not organization:
                    organization = user_org

                # Create Product
                ordering_cost = float(item.get("ordering_cost") or 0.0)
                unit_price = float(item.get("unit_price") or ordering_cost or 250.0)

                max_id = Product.objects.aggregate(Max("product_id"))["product_id__max"] or 0
                product = Product(
                    product_id=max_id + 1,
                    product_name=name,
                    category=item.get("category") or "Bakery",
                    unit_price=unit_price,
                    organization=organization,
                    supplier=supplier
                )
                product.save()

                # Auto-calculate and save policy parameters
                service_level = float(item.get("service_level") or 95.0)
                holding_cost = float(item.get("holding_cost") or 1.0)
                if holding_cost <= 0:
                    holding_cost = 1.0
                stockout_cost = float(item.get("stockout_cost") or 0.0)
                opening_stock = int(item.get("opening_stock") or 0)

                # Fetch any available historical demand to compute safety stock / ROP
                from inventory.models import Inventory
                inventory_qs = Inventory.objects.filter(product=product).order_by("id")

                try:
                    calc_data = _calculate_policy_data(
                        inventory_qs=inventory_qs,
                        service_level=service_level,
                        ordering_cost=ordering_cost,
                        holding_cost=holding_cost,
                        stockout_cost=stockout_cost
                    )
                except Exception:
                    calc_data = {
                        "reorder_point": 0.0,
                        "reorder_quantity": 100.0,
                        "safety_stock": 0.0,
                        "holding_cost": holding_cost,
                        "ordering_cost": ordering_cost,
                        "stockout_cost": stockout_cost,
                        "service_level": service_level,
                        "z_value": 1.645
                    }

                InventoryPolicy.objects.create(
                    product=product,
                    opening_stock=opening_stock,
                    **calc_data
                )
                created_count += 1

        return Response({
            "message": f"Successfully imported {created_count} products",
            "count": created_count
        }, status=201)