import pandas as pd
from django.db.models import Q
from django.db import connection

from django.contrib.auth import get_user_model
User = get_user_model()

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Inventory
from .serializers import InventorySerializer
from product.models import Product\
    

def reset_inventory_sequence():
    """
    Resets the inventory table auto-increment sequence based on existing IDs.
    If table is empty, resets next auto_increment sequence to 1.
    If table is not empty, resets next auto_increment sequence to MAX(id) + 1.
    """
    try:
        with connection.cursor() as cursor:
            engine = connection.vendor
            if engine == 'mysql':
                cursor.execute("SELECT COALESCE(MAX(id), 0) FROM inventory;")
                max_id = cursor.fetchone()[0]
                next_id = max_id + 1 if max_id > 0 else 1
                cursor.execute(f"ALTER TABLE inventory AUTO_INCREMENT = {next_id};")
            elif engine == 'sqlite':
                cursor.execute("SELECT COALESCE(MAX(id), 0) FROM inventory;")
                max_id = cursor.fetchone()[0]
                cursor.execute("UPDATE sqlite_sequence SET seq = %s WHERE name = 'inventory';", [max_id])
            elif engine == 'postgresql':
                cursor.execute("SELECT setval(pg_get_serial_sequence('inventory', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM inventory;")
    except Exception:
        pass


class UploadInventory(APIView):
    """
    POST /api/inventory/upload/
    Upload Historical Demand Excel for a product
    """

    def post(self, request):

        file = request.FILES.get("file")

        # Extract product_id from form-data body or query parameters
        product_id = (
            request.data.get("product_id")
            or request.data.get("product")
            or request.query_params.get("product_id")
            or request.query_params.get("product")
        )

        if not file:
            return Response(
                {"message": "File not found. Please attach an Excel file with key 'file'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = None
        if product_id:
            try:
                product = Product.objects.get(pk=product_id)
            except (Product.DoesNotExist, ValueError, TypeError):
                return Response(
                    {"message": f"Product with ID '{product_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        try:
            df = pd.read_excel(file)
        except Exception as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        row_has_product = any(
            col in df.columns for col in ["Product ID", "product_id", "Product", "product"]
        )

        if not product and not row_has_product:
            return Response(
                {"message": "product_id is required. Please provide product_id in form-data/query parameters or inside the Excel sheet."},
                status=status.HTTP_400_BAD_REQUEST
            )

        required_columns = [
            "Date",
            "Demand",
            "Lead Time",
        ]

        if not all(col in df.columns for col in required_columns):
            return Response(
                {
                    "message": "Excel must contain Date, Demand and Lead Time columns"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Pre-convert dates to YYYY-MM-DD strings
        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")

        # Pre-fetch fallback product and product mapping
        fallback_product = Product.objects.first() if not product else product
        product_map = {}
        if row_has_product:
            product_map = {p.product_id: p for p in Product.objects.all()}

        product_col_name = next(
            (col for col in ["Product ID", "product_id", "Product", "product"] if col in df.columns),
            None
        )

        grouped_records = {}

        rows_dict = df.to_dict("records")
        for row in rows_dict:
            row_product = product

            if not row_product and product_col_name:
                p_val = row.get(product_col_name)
                if pd.notna(p_val):
                    try:
                        p_val_int = int(p_val)
                        row_product = product_map.get(p_val_int)
                    except (ValueError, TypeError):
                        pass

            if not row_product:
                row_product = fallback_product

            if not row_product:
                continue

            if row_product not in grouped_records:
                grouped_records[row_product] = {
                    "date": [],
                    "demand": [],
                    "lead_time": []
                }

            date_val = str(row["Date"])
            demand_val = 0 if pd.isna(row["Demand"]) else int(row["Demand"])
            lead_time_val = 0 if pd.isna(row["Lead Time"]) else int(row["Lead Time"])

            grouped_records[row_product]["date"].append(date_val)
            grouped_records[row_product]["demand"].append(demand_val)
            grouped_records[row_product]["lead_time"].append(lead_time_val)

        # Delete existing inventory for target products and reset sequence
        for prod_obj in grouped_records.keys():
            Inventory.objects.filter(product=prod_obj).delete()

        reset_inventory_sequence()

        created_or_updated = []
        for prod_obj, data_dict in grouped_records.items():
            inv_obj = Inventory.objects.create(
                product=prod_obj,
                date=data_dict["date"],
                demand=data_dict["demand"],
                lead_time=data_dict["lead_time"],
            )
            created_or_updated.append(inv_obj)

        serializer = InventorySerializer(created_or_updated, many=True)

        return Response(
            {
                "message": "Inventory Uploaded Successfully",
                "count": len(created_or_updated),
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED
        )


class InventoryList(APIView):
    """
    Retrieve all inventory records
    """

    def get(self, request):
        queryset = Inventory.objects.all().order_by("id")
        serializer = InventorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InventoryDetail(APIView):
    """
    Retrieve, update, or delete a specific inventory record
    """

    def get_object(self, pk):
        try:
            return Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return None

    def get(self, request, pk):
        inventory = self.get_object(pk)
        if not inventory:
            return Response(
                {"message": "Inventory record not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = InventorySerializer(inventory)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        inventory = self.get_object(pk)
        if not inventory:
            return Response(
                {"message": "Inventory record not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = InventorySerializer(inventory, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "Inventory record updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        inventory = self.get_object(pk)
        if not inventory:
            return Response(
                {"message": "Inventory record not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = InventorySerializer(inventory, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "Inventory record updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        inventory = self.get_object(pk)
        if not inventory:
            return Response(
                {"message": "Inventory record not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        inventory.delete()
        reset_inventory_sequence()
        return Response(
            {"message": "Inventory record deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )


class InventoryByAdmin(APIView):

    def get(self, request, admin_id):

        inventories = Inventory.objects.filter(
            Q(product__organization__admin_id=admin_id) |
            Q(product__supplier__organization__admin_id=admin_id)
        ).distinct().order_by("id")

        if not inventories.exists():
            return Response(
                {
                    "message": f"No inventory found for Admin ID {admin_id}"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = InventorySerializer(
            inventories,
            many=True
        )

        return Response(
            {

                "count": inventories.count(),
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, admin_id):
        queryset = Inventory.objects.filter(
            Q(product__organization__admin_id=admin_id) |
            Q(product__supplier__organization__admin_id=admin_id)
        )
        count = queryset.count()
        if count == 0:
            return Response(
                {"message": f"No uploaded inventory found for Admin ID {admin_id}"},
                status=status.HTTP_404_NOT_FOUND
            )
        queryset.delete()
        reset_inventory_sequence()
        return Response(
            {
                "message": f"Successfully deleted {count} uploaded inventory record(s) for Admin ID {admin_id}",
                "deleted_count": count
            },
            status=status.HTTP_200_OK
        )


class InventoryByProduct(APIView):
    """
    GET /api/inventory/product/<product_id>/ -> Get inventory of one Product
    DELETE /api/inventory/product/<product_id>/ -> Delete product id Inventory
    """

    def get(self, request, product_id):
        queryset = Inventory.objects.filter(product_id=product_id).order_by("id")
        serializer = InventorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, product_id):
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({"message": f"Product with ID '{product_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        # Delete existing
        Inventory.objects.filter(product=product).delete()
        reset_inventory_sequence()

        inv = Inventory.objects.create(
            product=product,
            date=request.data.get("date", []),
            demand=request.data.get("demand", []),
            lead_time=request.data.get("lead_time", []),
        )
        serializer = InventorySerializer(inv)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, product_id):
        queryset = Inventory.objects.filter(product_id=product_id)
        count = queryset.count()
        queryset.delete()
        reset_inventory_sequence()
        return Response(
            {
                "message": f"Successfully deleted {count} uploaded inventory record(s) for product_id {product_id}",
                "deleted_count": count
            },
            status=status.HTTP_200_OK
        )


class DeleteInventory(APIView):
    """
    Delete uploaded inventory dataset by admin_id or product_id
    """

    def delete(self, request, admin_id=None, product_id=None):
        admin_id = (
            admin_id
            or request.data.get("admin_id")
            or request.data.get("admin")
            or request.query_params.get("admin_id")
            or request.query_params.get("admin")
        )

        product_id = (
            product_id
            or request.data.get("product_id")
            or request.data.get("product")
            or request.query_params.get("product_id")
            or request.query_params.get("product")
        )

        if admin_id:
            queryset = Inventory.objects.filter(
                Q(product__organization__admin_id=admin_id) |
                Q(product__supplier__organization__admin_id=admin_id)
            )
            count = queryset.count()
            if count == 0:
                return Response(
                    {"message": f"No uploaded inventory found for Admin ID {admin_id}"},
                    status=status.HTTP_404_NOT_FOUND
                )
            queryset.delete()
            reset_inventory_sequence()
            return Response(
                {
                    "message": f"Successfully deleted {count} uploaded inventory record(s) for Admin ID {admin_id}",
                    "deleted_count": count
                },
                status=status.HTTP_200_OK
            )

        elif product_id:
            queryset = Inventory.objects.filter(product_id=product_id)
            count = queryset.count()
            if count == 0:
                return Response(
                    {"message": f"No uploaded inventory found for Product ID {product_id}"},
                    status=status.HTTP_404_NOT_FOUND
                )
            queryset.delete()
            reset_inventory_sequence()
            return Response(
                {
                    "message": f"Successfully deleted {count} uploaded inventory record(s) for Product ID {product_id}",
                    "deleted_count": count
                },
                status=status.HTTP_200_OK
            )

        else:
            return Response(
                {"message": "Please specify admin_id or product_id to delete inventory records."},
                status=status.HTTP_400_BAD_REQUEST
            )