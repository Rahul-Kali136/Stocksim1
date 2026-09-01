from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action

from .models import Supplier
from .serializers import SupplierSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
from Organization.models import Organization


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


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    authentication_classes = [OptionalJWTAuthentication]

    def get_permissions(self):
        if getattr(self, "action", None) in ["list", "create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        organization = serializer.validated_data.get("organization")
        if not organization and self.request.user.is_authenticated:
            user_org = self.request.user.organizations.first()
            if user_org:
                organization = user_org
        serializer.save(organization=organization)

    def get_queryset(self):
        """
        GET /api/suppliers/

        Returns suppliers for the specified organization_id, or defaults to the logged-in admin's primary organization.
        """
        if not getattr(self.request.user, "is_authenticated", False):
            return Supplier.objects.none()

        org_id = (
            self.request.query_params.get("organization_id")
            or self.request.query_params.get("organization")
        )
        if org_id:
            return Supplier.objects.filter(
                organization_id=org_id,
                organization__admin_id=self.request.user.admin_id
            ).order_by("supplier_id")

        return Supplier.objects.filter(
            organization__admin_id=self.request.user.admin_id
        ).order_by("supplier_id")

    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/suppliers/<id>/

        Get suppliers by organization_id or supplier_id.
        Only registered organization_id can get results.
        No token needed for get by organization_id.
        """
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if auth_header and auth_header.strip():
            token_str = auth_header.strip()
            if token_str.lower().startswith("bearer"):
                parts = token_str.split(maxsplit=1)
                if len(parts) > 1 and parts[1].strip() and parts[1].strip().lower() not in ["null", "undefined"]:
                    return Response({
                        "error": "No need for access token when getting by organization_id."
                    }, status=400)

        pk = kwargs.get("pk")

        # 1. Lookup by organization_id first
        if Organization.objects.filter(organization_id=pk).exists():
            org = Organization.objects.filter(organization_id=pk).first()
            if not self.request.user.is_authenticated or str(org.admin_id) != str(self.request.user.admin_id):
                return Response(
                    {"error": "Organization not found or permission denied."},
                    status=status.HTTP_404_NOT_FOUND
                )
            suppliers = Supplier.objects.filter(organization_id=pk).order_by("supplier_id")
            if suppliers.exists():
                serializer = self.get_serializer(suppliers, many=True)
                return Response(serializer.data)
            return Response({
                "message": f"No suppliers found for organization_id {pk}."
            })

        # 2. Fallback: Lookup by supplier_id
        supplier = Supplier.objects.filter(supplier_id=pk).first()
        if supplier:
            if not self.request.user.is_authenticated or str(supplier.organization.admin_id) != str(self.request.user.admin_id):
                return Response(
                    {"error": "Supplier not found or permission denied."},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = self.get_serializer(supplier)
            return Response(serializer.data)

        return Response(
            {"error": f"Invalid organization_id or supplier_id {pk}. Only registered organization_id can get results."},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"organization/(?P<organization_id>\d+)"
    )
    def by_organization(self, request, organization_id=None):
        """
        GET /api/suppliers/organization/<organization_id>/

        Get all suppliers belonging to one organization.
        Only registered organization_id can get results.
        No token needed for get by organization_id.
        """
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if auth_header and auth_header.strip():
            token_str = auth_header.strip()
            if token_str.lower().startswith("bearer"):
                parts = token_str.split(maxsplit=1)
                if len(parts) > 1 and parts[1].strip() and parts[1].strip().lower() not in ["null", "undefined"]:
                    return Response({
                        "error": "No need for access token when getting by organization_id."
                    }, status=400)

        if not Organization.objects.filter(organization_id=organization_id).exists():
            return Response(
                {"error": f"Invalid organization_id {organization_id}. Only registered organization_id can get results."},
                status=status.HTTP_400_BAD_REQUEST
            )

        suppliers = Supplier.objects.filter(
            organization_id=organization_id
        ).order_by("supplier_id")

        if not suppliers.exists():
            return Response({
                "message": f"No suppliers found for organization_id {organization_id}."
            })

        serializer = self.get_serializer(suppliers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="bulk-upload")
    def bulk_upload(self, request):
        data = request.data
        if not isinstance(data, list):
            return Response({"error": "Expected a list of suppliers"}, status=400)

        from django.db import transaction
        from django.db.models import Max

        created_count = 0
        user_org = request.user.organizations.first()

        with transaction.atomic():
            for item in data:
                name = item.get("supplier_name")
                if not name:
                    continue

                organization = user_org
                max_id = Supplier.objects.aggregate(Max("supplier_id"))["supplier_id__max"] or 0

                Supplier.objects.create(
                    supplier_id=max_id + 1,
                    supplier_name=name,
                    business_type=item.get("business_type") or "Food Supplier",
                    email=item.get("email") or "",
                    phone=item.get("phone") or "",
                    address=item.get("address") or "",
                    organization=organization
                )
                created_count += 1

        return Response({
            "message": f"Successfully imported {created_count} suppliers",
            "count": created_count
        }, status=201)