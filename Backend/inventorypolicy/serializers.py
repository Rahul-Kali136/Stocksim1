from rest_framework import serializers

from .models import InventoryPolicy


class InventoryPolicySerializer(serializers.ModelSerializer):

    class Meta:

        model = InventoryPolicy

        fields = "__all__"