from rest_framework import serializers
from .models import Organization

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'
        # Crucial: This allows the serializer to pass validation without an 'admin' key in JSON
        read_only_fields = ['admin']
