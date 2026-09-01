from django.urls import path

from .views import (
    PolicyComparisonAPIView,
    PolicyComparisonByProduct,
    PolicyComparisonByAdmin,
)

urlpatterns = [
    # List and Run Policy Comparison
    path("", PolicyComparisonAPIView.as_view(), name="policy-comparison-list"),
    path("run/", PolicyComparisonAPIView.as_view(), name="run-policy-comparison"),
    path("run/<int:product_id>/", PolicyComparisonAPIView.as_view(), name="run-policy-comparison-id"),

    # Get Comparisons by Product ID
    path("product/<int:product_id>/", PolicyComparisonByProduct.as_view(), name="policy-comparison-by-product"),

    # Get Comparisons by Admin ID
    path("admin/", PolicyComparisonByAdmin.as_view(), name="policy-comparison-by-admin"),
]
