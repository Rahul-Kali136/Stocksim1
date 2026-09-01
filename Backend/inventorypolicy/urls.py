from django.urls import path
from .views import (
    CalculateInventoryPolicy,
    InventoryPolicyByAdmin,
    InventoryPolicyDetail,
    InventoryPolicyByProductAll,
)

urlpatterns = [
    path("calculate/", CalculateInventoryPolicy.as_view(), name="calculate-policy"),
    path("admin/<int:admin_id>/", InventoryPolicyByAdmin.as_view(), name="policy-by-admin"),
    path("<int:pk>/", InventoryPolicyDetail.as_view(), name="policy-detail-pk"),
    path("<int:pk>/edit/", InventoryPolicyDetail.as_view(), name="edit-policy-pk"),
    path("<int:pk>/delete/", InventoryPolicyDetail.as_view(), name="delete-policy-pk"),
    path("product/<int:product_id>/all/", InventoryPolicyByProductAll.as_view(), name="policy-by-product-all"),
]