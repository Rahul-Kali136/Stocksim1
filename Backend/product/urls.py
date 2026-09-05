from django.urls import path
from product.views import (
    ProductListCreateView,
    ProductDetailView,
    ProductByOrganizationView,
    ProductBulkUploadView,
    ProductBulkDeleteView,
)

urlpatterns = [

    path(
        "bulk-upload/",
        ProductBulkUploadView.as_view(),
        name="product-bulk-upload"
    ),

    path(
        "bulk-delete/",
        ProductBulkDeleteView.as_view(),
        name="product-bulk-delete"
    ),

    path(
        "",
        ProductListCreateView.as_view(),
        name="product-list"
    ),

    path(
        "<int:pk>/",
        ProductDetailView.as_view(),
        name="product-detail"
    ),

    path(
        "organization/<int:organization_id>/",
        ProductByOrganizationView.as_view(),
        name="product-by-organization"
    ),
]


