from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog
from .serializers import (
    AuditLogSerializer,
    AuditLogCreateSerializer
)


class AuditLogListView(generics.ListCreateAPIView):

    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        organization = self.request.user.organizations.first()

        if organization:
            return AuditLog.objects.filter(
                organization=organization
            ).order_by("-created_at")

        return AuditLog.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AuditLogCreateSerializer
        return AuditLogSerializer

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            organization=self.request.user.organizations.first(),
            ip_address=self.get_client_ip()
        )

    def get_client_ip(self):
        x_forwarded_for = self.request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return self.request.META.get("REMOTE_ADDR")



class AuditLogDetailView(generics.RetrieveAPIView):

    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        organization = self.request.user.organizations.first()

        if organization:
            return AuditLog.objects.filter(
                organization=organization
            )

        return AuditLog.objects.none()



class AuditLogCreateView(generics.CreateAPIView):

    serializer_class = AuditLogCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


    def perform_create(self, serializer):

        serializer.save(
            user=self.request.user,
            organization=self.request.user.organizations.first(),
            ip_address=self.get_client_ip()
        )


    def get_client_ip(self):

        x_forwarded_for = self.request.META.get(
            "HTTP_X_FORWARDED_FOR"
        )

        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]

        return self.request.META.get(
            "REMOTE_ADDR"
        )



class AuditLogCountView(APIView):

    permission_classes = [
        permissions.IsAuthenticated
    ]


    def get(self, request):

        organization = request.user.organizations.first()

        count = AuditLog.objects.filter(
            organization=organization
        ).count()

        return Response(
            {
                "total_logs": count
            }
        )



class DeleteAuditLogView(generics.DestroyAPIView):

    permission_classes = [
        permissions.IsAuthenticated
    ]


    def get_queryset(self):

        organization = self.request.user.organizations.first()

        return AuditLog.objects.filter(
            organization=organization
        )



class PurgeAuditLogsView(APIView):

    permission_classes = [
        permissions.IsAuthenticated
    ]

    def delete(self, request):
        organization = request.user.organizations.first()
        if organization:
            AuditLog.objects.filter(organization=organization).delete()
            return Response({"message": "Audit logs purged successfully."}, status=204)
        return Response({"error": "No organization associated with user."}, status=400)