from django.urls import path

from .views import (
    MonteCarloSimulationAPIView,
    MonteCarloSimulationByPolicy,
    MonteCarloSimulationByAdmin,
    MonteCarloSimulationEditView,
    MonteCarloSimulationDetail,
)

urlpatterns = [

    path(
        "run/",
        MonteCarloSimulationAPIView.as_view(),
        name="run-simulation"
    ),

    path(
        "run/<int:policy_id>/",
        MonteCarloSimulationAPIView.as_view(),
        name="run-simulation-id"
    ),

    path(
        "policy/<int:policy_id>/",
        MonteCarloSimulationByPolicy.as_view(),
        name="simulation-by-policy"
    ),

    path(
        "admin/<int:admin_id>/",
        MonteCarloSimulationByAdmin.as_view(),
        name="simulation-by-admin"
    ),

    path(
        "edit/",
        MonteCarloSimulationEditView.as_view(),
        name="edit-simulation"
    ),

    path(
        "edit/<int:policy_id>/",
        MonteCarloSimulationEditView.as_view(),
        name="edit-simulation-id"
    ),

    path(
        "<int:pk>/",
        MonteCarloSimulationDetail.as_view(),
        name="simulation-detail"
    ),
]






