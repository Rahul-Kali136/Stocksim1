from django.urls import path

from .views import (
    UploadInventory,
    InventoryByAdmin,
    InventoryByProduct,
    DeleteInventory,
)

urlpatterns = [

    path(
        "upload/",
        UploadInventory.as_view(),
        name="upload-inventory"
    ),

    path(
        "delete/product/<int:product_id>/",
        DeleteInventory.as_view(),
        name="delete-product-inventory"
    ),

    path(
        "delete/<int:admin_id>/",
        DeleteInventory.as_view(),
        name="delete-admin-inventory"
    ),

    path(
        "admin/<int:admin_id>/",
        InventoryByAdmin.as_view(),
        name="inventory-admin"
    ),

    path(
        "product/<int:product_id>/",
        InventoryByProduct.as_view(),
        name="inventory-product"
    ),

]