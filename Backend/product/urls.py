from django.urls import path
from .views import *

urlpatterns = [

    path(
        "bulk-upload/",
        ProductBulkUploadView.as_view(),
        name="product-bulk-upload"
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


