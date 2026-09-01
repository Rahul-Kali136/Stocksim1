from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from .models import Organization
from .serializers import OrganizationSerializer

class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except Exception:
            return None

class OrganizationListCreateView(generics.ListCreateAPIView):
    serializer_class = OrganizationSerializer
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        admin_id = self.request.query_params.get("admin_id") or self.request.query_params.get("admin")
        user_is_auth = getattr(self.request.user, "is_authenticated", False)
        
        if admin_id:
            if user_is_auth:
                if str(admin_id) != str(getattr(self.request.user, "admin_id", None)) and not getattr(self.request.user, "is_superuser", False):
                    return Organization.objects.none()
            return Organization.objects.filter(admin_id=admin_id)

        user_admin_id = getattr(self.request.user, "admin_id", None) if user_is_auth else None
        if user_admin_id is not None:
            return Organization.objects.filter(admin_id=user_admin_id)
        return Organization.objects.none()

    def get(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if not getattr(self.request.user, "is_authenticated", False):
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated("Authentication credentials are required.")
        serializer.save(admin=self.request.user)

class OrganizationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrganizationSerializer
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get_object(self):
        pk = self.kwargs.get("pk")
        from authentication.models import CustomUser
        
        # 1. Lookup by registered admin_id foreign key first
        if CustomUser.objects.filter(admin_id=pk).exists():
            obj = Organization.objects.filter(admin_id=pk).first()
            if not obj:
                from rest_framework.exceptions import NotFound
                raise NotFound(detail=f"No organization created for registered admin_id '{pk}'.")
            return obj

        # 2. Fallback: Lookup by organization_id primary key
        obj = Organization.objects.filter(organization_id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound(detail=f"Organization for ID or Admin ID '{pk}' not found.")

        # Enforce authentication & permissions for state-changing HTTP methods
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            if not self.request.user or not self.request.user.is_authenticated:
                self.permission_denied(self.request, message="Authentication token required to modify organization.")
            if not self.request.user.is_superuser and str(obj.admin_id) != str(getattr(self.request.user, "admin_id", None)):
                self.permission_denied(self.request, message="Permission denied. You can only modify your own organization.")

        return obj

    def get(self, request, *args, **kwargs):
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if auth_header and auth_header.strip():
            token_str = auth_header.strip()
            if token_str.lower().startswith("bearer"):
                parts = token_str.split(maxsplit=1)
                if len(parts) > 1 and parts[1].strip() and parts[1].strip().lower() not in ["null", "undefined"]:
                    return Response({
                        "error": "No need for access token when getting by admin_id."
                    }, status=400)

        pk = self.kwargs.get("pk")
        
        # Look up strictly by admin_id foreign key
        qs_admin = Organization.objects.filter(admin_id=pk).order_by("admin_id", "organization_id")
        if qs_admin.exists():
            serializer = self.get_serializer(qs_admin, many=True)
            return Response(serializer.data)

        # If admin_id has no organizations in the table:
        return Response({
            "message": f"No organization found for admin_id {pk}."
        })

class OrganizationByAdminView(generics.ListAPIView):
    serializer_class = OrganizationSerializer
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        admin_id = self.kwargs.get("admin_id")
        return Organization.objects.filter(admin_id=admin_id)

    def get(self, request, *args, **kwargs):
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if auth_header and auth_header.strip():
            token_str = auth_header.strip()
            if token_str.lower().startswith("bearer"):
                parts = token_str.split(maxsplit=1)
                if len(parts) > 1 and parts[1].strip() and parts[1].strip().lower() not in ["null", "undefined"]:
                    return Response({
                        "error": "No need for access token when getting by admin_id."
                    }, status=400)

        admin_id = self.kwargs.get("admin_id")
        qs = Organization.objects.filter(admin_id=admin_id)
        if qs.exists():
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)

        return Response({
            "error": "not a valid id"
        }, status=400)


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

class OrganizationBulkUploadView(APIView):
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data
        if not isinstance(data, list):
            return Response({"error": "Expected a list of organizations"}, status=400)

        created_count = 0
        organizations_to_create = []

        for item in data:
            name = item.get("organization_name")
            desc = item.get("organization_type") or ""
            loc = item.get("location") or ""
            if not name:
                continue

            organizations_to_create.append(
                Organization(
                    organization_name=name,
                    organization_type=desc,
                    location=loc,
                    admin=request.user
                )
            )

        if organizations_to_create:
            max_id = Organization.objects.aggregate(models.Max("organization_id"))["organization_id__max"] or 0
            for i, org in enumerate(organizations_to_create):
                org.organization_id = max_id + i + 1
                org.save()
            created_count = len(organizations_to_create)

        return Response({
            "message": f"Successfully imported {created_count} organizations",
            "count": created_count
        }, status=201)
