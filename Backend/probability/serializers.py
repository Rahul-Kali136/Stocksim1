from rest_framework import serializers
from .models import ProbabilityDistribution


class ProbabilityDistributionSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProbabilityDistribution

        fields = [

            "probability_id",

            "product",

            "demand_value",
            "demand_frequency",
            "demand_probability",
            "demand_cumulative_probability",
            "demand_random_interval",

            "lead_time_days",
            "lead_frequency",
            "lead_probability",
            "lead_cumulative_probability",
            "lead_random_interval",

            "created_at",

        ]

        read_only_fields = [

            "probability_id",
            "created_at",

        ]