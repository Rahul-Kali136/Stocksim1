from django.urls import path

from .views import (
    InventorySummaryListCreateView,
    InventorySummaryDetailView
)



urlpatterns = [


    path(
        "",
        InventorySummaryListCreateView.as_view(),
        name="inventory-summary-list"
    ),


    path(
        "<int:pk>/",
        InventorySummaryDetailView.as_view(),
        name="inventory-summary-detail"
    )

]