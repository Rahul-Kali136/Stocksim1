from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying Audit Logs.
    """

    user = serializers.StringRelatedField(
        read_only=True
    )

    organization = serializers.StringRelatedField(
        read_only=True
    )

    user_email = serializers.SerializerMethodField()
    details = serializers.CharField(source='description', read_only=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AuditLog

        fields = [
            "id",
            "user",
            "organization",
            "action",
            "module",
            "details",
            "description",
            "user_email",
            "timestamp",
            "ip_address",
            "old_data",
            "new_data",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "organization",
            "created_at",
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user and obj.user.email else (obj.user.username if obj.user else "System")


class AuditLogCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating Audit Logs.
    """

    details = serializers.CharField(write_only=True, required=False)
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = AuditLog

        fields = [
            "action",
            "module",
            "description",
            "details",
            "old_data",
            "new_data",
        ]

    def create(self, validated_data):
        details = validated_data.pop("details", None)
        if details and not validated_data.get("description"):
            validated_data["description"] = details
        if not validated_data.get("module"):
            validated_data["module"] = "General"
        return super().create(validated_data)


class AuditLogDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving Audit Log details.
    """

    user = serializers.StringRelatedField(read_only=True)
    organization = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = AuditLog

        fields = [
            "id",
            "user",
            "organization",
            "action",
            "module",
            "description",
            "ip_address",
            "old_data",
            "new_data",
            "created_at",
        ]