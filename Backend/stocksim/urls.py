"""
URL configuration for stocksim project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("authentication.urls")),
    path("api/organization/", include("Organization.urls")),
    path("api/suppliers/", include("suppliers.urls")),
    path("api/product/", include("product.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/probability/", include("probability.urls")),
    path("api/inventorypolicy/", include("inventorypolicy.urls")),
    path("api/simulation/", include("simulation.urls")),
    path("api/costanalysis/", include("costanalysis.urls")),
    path("api/policycomparison/", include("policycomparison.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/inventory-summary/",include("inventorysummary.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/notifications/",include("notifications.urls")),
    path("api/auditlogs/", include("auditlogs.urls")),
    path("api/subscription/", include("subscriptions.urls")),
    path("api/subscriptions/", include("subscriptions.urls")),
]
