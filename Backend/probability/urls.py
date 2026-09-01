from django.urls import path

from .views import (
    GenerateProbability,
    ProbabilityDistributionByProduct,
)

urlpatterns = [

    # Generate Probability for one Product
    path(
        "generate-probability/",
        GenerateProbability.as_view(),
        name="generate-probability",
    ),

    # Get / Delete all Probability records of one Product
    path(
        "product/<int:product_id>/",
        ProbabilityDistributionByProduct.as_view(),
        name="probability-by-product",
    ),

]