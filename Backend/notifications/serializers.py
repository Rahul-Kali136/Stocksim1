from rest_framework import serializers
from .models import Notification
from Organization.models import Organization
from product.models import Product


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying notifications.
    """

    user = serializers.StringRelatedField(read_only=True)
    organization = serializers.StringRelatedField(read_only=True)
    product = serializers.StringRelatedField(read_only=True)

    is_expired = serializers.ReadOnlyField()

    class Meta:

        model = Notification

        fields = [
            "id",
            "user",
            "organization",
            "product",
            "title",
            "message",
            "notification_type",
            "priority",
            "is_read",
            "is_expired",
            "created_at",
            "updated_at",
            "expires_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
            "is_expired",
        ]



class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating notifications.
    """

    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True
    )

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True
    )


    class Meta:

        model = Notification

        fields = [
            "organization",
            "product",
            "title",
            "message",
            "notification_type",
            "priority",
            "expires_at",
        ]



class NotificationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating notification status.
    """

    class Meta:

        model = Notification

        fields = [
            "is_read",
        ]



class NotificationCountSerializer(serializers.Serializer):
    """
    Serializer for notification count.
    """

    total = serializers.IntegerField()

    unread = serializers.IntegerField()

    read = serializers.IntegerField()



class NotificationMarkAllSerializer(serializers.Serializer):
    """
    Serializer for mark all notifications read.
    """

    mark_all = serializers.BooleanField(
        default=True
    )