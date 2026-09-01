from django.urls import path

from .views import (
    InventoryCostAnalysisAPIView,
    InventoryCostAnalysisDetail,
    InventoryCostAnalysisByProduct,
    InventoryCostAnalysisByAdmin,
)


urlpatterns = [
    # Frontend POST:
    # POST /api/costanalysis/
    path(
        "",
        InventoryCostAnalysisAPIView.as_view(),
        name="cost-analysis",
    ),

    # Optional:
    # POST /api/costanalysis/policy/2/
    path(
        "policy/<int:policy_id>/",
        InventoryCostAnalysisAPIView.as_view(),
        name="cost-analysis-policy",
    ),

    # GET/DELETE /api/costanalysis/1/
    path(
        "<int:pk>/",
        InventoryCostAnalysisDetail.as_view(),
        name="cost-analysis-detail",
    ),

    # GET /api/costanalysis/product/1/
    path(
        "product/<int:product_id>/",
        InventoryCostAnalysisByProduct.as_view(),
        name="cost-analysis-product",
    ),

    # GET /api/costanalysis/admin/1/
    path(
        "admin/<int:admin_id>/",
        InventoryCostAnalysisByAdmin.as_view(),
        name="cost-analysis-admin",
    ),
]
