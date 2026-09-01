from django.urls import path
from .views import (
    OrganizationListCreateView,
    OrganizationDetailView,
    OrganizationByAdminView,
    OrganizationBulkUploadView,
)

urlpatterns = [
    path(
        "bulk-upload/",
        OrganizationBulkUploadView.as_view(),
        name="organization-bulk-upload",
    ),
    path(
        "",
        OrganizationListCreateView.as_view(),
        name="organization-list",
    ),
    path(
        "<int:pk>/",
        OrganizationDetailView.as_view(),
        name="organization-detail",
    ),
    path(
        "admin/<int:admin_id>/",
        OrganizationByAdminView.as_view(),
        name="organization-by-admin",
    ),
]