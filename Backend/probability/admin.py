from django.contrib import admin

# Register your models here.

from .models import ProbabilityDistribution


@admin.register(ProbabilityDistribution)
class ProbabilityDistributionAdmin(admin.ModelAdmin):
    list_display = (
        "probability_id",
        "demand_value",
        "demand_frequency",
        "lead_time_days",
        "lead_frequency",
    )

    search_fields = (
        "probability_id",
        "demand_value",
        "lead_time_days",
    )