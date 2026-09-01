from django.urls import path

from .views import (
    AuditLogListView,
    AuditLogDetailView,
    AuditLogCreateView,
    AuditLogCountView,
    DeleteAuditLogView,
    PurgeAuditLogsView
)


urlpatterns = [

    path(
        "",
        AuditLogListView.as_view()
    ),

    path(
        "create/",
        AuditLogCreateView.as_view()
    ),

    path(
        "purge/",
        PurgeAuditLogsView.as_view()
    ),

    path(
        "count/",
        AuditLogCountView.as_view()
    ),

    path(
        "<int:pk>/",
        AuditLogDetailView.as_view()
    ),

    path(
        "<int:pk>/delete/",
        DeleteAuditLogView.as_view()
    ),

]