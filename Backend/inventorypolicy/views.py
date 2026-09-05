import math
from statistics import stdev

from django.db.models import Avg, Sum, Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from inventory.models import Inventory
from product.models import Product

from .models import InventoryPolicy
from .serializers import InventoryPolicySerializer


def _calculate_policy_data(inventory_qs, service_level, ordering_cost, holding_cost, stockout_cost):
    z_values = {
    90: 1.28,
    90.5: 1.31,
    91: 1.34,
    91.5: 1.37,
    92: 1.41,
    92.5: 1.44,
    93: 1.48,
    93.5: 1.51,
    94: 1.55,
    94.5: 1.60,
    95: 1.65,
    95.5: 1.70,
    96: 1.75,
    96.5: 1.81,
    97: 1.88,
    97.5: 1.96,
    98: 2.05,
    98.5: 2.17,
    99: 2.33,
    99.1: 2.37,
    99.2: 2.41,
    99.3: 2.46,
    99.4: 2.51,
    99.5: 2.58,
    99.6: 2.65,
    99.7: 2.75,
    99.8: 2.88,
    99.9: 3.09,
}

    try:
        sl_float = float(service_level)
        sl_key = int(sl_float) if sl_float.is_integer() else sl_float
    except (ValueError, TypeError):
        sl_key = service_level

    if sl_key not in z_values:
        raise ValueError("Invalid Service Level. Must be one of the supported values (e.g., 90, 95, 97, 98, 99).")

    z = z_values[sl_key]

    if holding_cost <= 0:
        holding_cost = 0.00001

    demand_list = []
    lead_list = []
    for inv in inventory_qs:
        if isinstance(inv.demand, list):
            demand_list.extend(inv.demand)
        elif inv.demand is not None:
            demand_list.append(inv.demand)

        if isinstance(inv.lead_time, list):
            lead_list.extend(inv.lead_time)
        elif inv.lead_time is not None:
            lead_list.append(inv.lead_time)

    average_demand = (sum(demand_list) / len(demand_list)) if demand_list else 0
    average_lead_time = (sum(lead_list) / len(lead_list)) if lead_list else 0
    annual_demand = sum(demand_list)

    sd = stdev(demand_list) if len(demand_list) > 1 else 0

    safety_stock = round(z * sd * math.sqrt(average_lead_time))

    reorder_point = round(
        (average_demand * average_lead_time) + safety_stock
    )

    ordering_cost_calc = max(0.0, ordering_cost)
    reorder_quantity = round(
        math.sqrt((2 * annual_demand * ordering_cost_calc) / holding_cost)
    )

    return {
        "service_level": service_level,
        "z_value": z,
        "average_demand": round(average_demand, 2),
        "average_lead_time": round(average_lead_time, 2),
        "annual_demand": int(annual_demand),
        "safety_stock": safety_stock,
        "reorder_point": reorder_point,
        "reorder_quantity": reorder_quantity,
        "ordering_cost": ordering_cost,
        "holding_cost": holding_cost,
        "stockout_cost": stockout_cost,
    }


class CalculateInventoryPolicy(APIView):

    def post(self, request):
        product_id = request.data.get("product_id") or request.data.get("product")
        if not product_id:
            return Response(
                {"message": "product_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = Product.objects.get(pk=product_id)
        except (Product.DoesNotExist, ValueError, TypeError):
            return Response(
                {"message": f"Product with ID '{product_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        inventory_qs = Inventory.objects.filter(product=product)

        try:
            service_level = int(request.data.get("service_level"))
            ordering_cost = float(request.data.get("ordering_cost"))
            holding_cost = float(request.data.get("holding_cost"))
            stockout_cost = float(request.data.get("stockout_cost", 0.0))
            opening_stock = int(request.data.get("opening_stock", 0))
        except (TypeError, ValueError):
            return Response(
                {"message": "Invalid Input Values for cost parameters or service level."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            calc_data = _calculate_policy_data(
                inventory_qs, service_level, ordering_cost, holding_cost, stockout_cost
            )
        except ValueError as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        policy = InventoryPolicy.objects.create(
            product=product,
            opening_stock=opening_stock,
            **calc_data
        )

        # Trigger real-time low-stock alert to supplier if opening_stock is below ROP
        if policy.opening_stock <= policy.reorder_point:
            from django.core.mail import send_mail
            from django.conf import settings
            import threading

            def send_low_stock_notification():
                try:
                    supplier = getattr(product, "supplier", None)
                    if not supplier and hasattr(product, "suppliers"):
                        supplier = product.suppliers.first()
                    if supplier and supplier.email:
                        subject = f"[StockSim Alert] Low Stock Level Warning: {product.product_name}"
                        message = (
                            f"Hello {supplier.supplier_name},\n\n"
                            f"This is an automated low-stock warning from StockSim for product: {product.product_name}.\n\n"
                            f"The current stock level is {policy.opening_stock} Units, which is below the Reorder Point (ROP) threshold of {policy.reorder_point} Units.\n\n"
                            f"A replenishment request of {policy.reorder_quantity} Units has been initiated.\n\n"
                            f"Best Regards,\n"
                            f"StockSim Inventory Management"
                        )
                        html_message = f"""
                        <html>
                        <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fffbeb; color: #1e293b; padding: 20px; margin: 0;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #fef3c7;">
                                <!-- Header -->
                                <div style="background-color: #d97706; color: #ffffff; padding: 24px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">⚠️ LOW STOCK ALERT</h1>
                                    <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Inventory Level Below ROP Threshold</p>
                                </div>
                                
                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; font-weight: 600; margin-top: 0; color: #1e293b;">Dear {supplier.supplier_name},</p>
                                    <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                                        Our inventory systems have detected that the current stock level for <strong>{product.product_name}</strong> has fallen below its critical Reorder Point (ROP) threshold.
                                    </p>
                                    
                                    <!-- Alert Details Table -->
                                    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
                                        <thead>
                                            <tr style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b;">
                                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #78350f;">Metric</th>
                                                <th style="padding: 12px; text-align: right; font-weight: 600; color: #78350f;">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 12px; font-weight: 600; color: #1e293b;">Current Stock Level</td>
                                                <td style="padding: 12px; text-align: right; font-weight: 700; color: #dc2626;">{policy.opening_stock} Units</td>
                                            </tr>
                                            <tr style="background-color: #fafafa; border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 12px; color: #64748b;">Reorder Point (ROP)</td>
                                                <td style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">{policy.reorder_point} Units</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px; color: #64748b;">Suggested Order Quantity (ROQ)</td>
                                                <td style="padding: 12px; text-align: right; font-weight: 700; color: #2563eb;">{policy.reorder_quantity} Units</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    <!-- Order Status -->
                                    <div style="background-color: #ecfdf5; border: 1px dashed #10b981; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0 0 0;">
                                        <span style="display: block; font-size: 14px; font-weight: 700; color: #065f46; text-transform: uppercase;">✓ Auto-Reorder Triggered</span>
                                        <span style="display: block; font-size: 12px; color: #047857; margin-top: 4px;">A replenishment request for {policy.reorder_quantity} units has been auto-placed.</span>
                                    </div>
                                </div>
                                
                                <!-- Footer -->
                                <div style="background-color: #fbfbfb; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; font-size: 13px; color: #64748b;">&copy; 2026 StockSim Inc. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """
                        send_mail(
                            subject=subject,
                            message=message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[supplier.email],
                            fail_silently=False,
                            html_message=html_message,
                        )
                        # Send SMS alert to supplier
                        if supplier.phone:
                            from simulation.views import send_sms_via_twilio
                            sms_text = f"[StockSim Warning] Low stock level detected for {product.product_name}. Current Stock: {policy.opening_stock} units. ROP threshold: {policy.reorder_point} units."
                            send_sms_via_twilio(supplier.phone, sms_text)
                except Exception as ex:
                    print(f"[Low Stock Alert Error] Failed to send alert: {ex}")

            threading.Thread(target=send_low_stock_notification, daemon=True).start()

        serializer = InventoryPolicySerializer(policy)
        return Response(
            {
                "message": "Inventory Policy calculated and saved successfully",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class InventoryPolicyByAdmin(APIView):

    def get(self, request, admin_id):
        policies = InventoryPolicy.objects.filter(
            Q(product__organization__admin_id=admin_id) |
            Q(product__supplier__organization__admin_id=admin_id)
        ).distinct().order_by("id")

        if not policies.exists():
            return Response([], status=status.HTTP_200_OK)

        serializer = InventoryPolicySerializer(policies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InventoryPolicyByProductAll(APIView):
    """
    GET /api/inventorypolicy/product/<product_id>/all/ -> List all policies for a Product
    """

    def get(self, request, product_id):
        policies = InventoryPolicy.objects.filter(product_id=product_id).select_related("product").order_by("-id")
        serializer = InventoryPolicySerializer(policies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InventoryPolicyDetail(APIView):
    """
    Retrieve, update, or delete a specific inventory policy by primary key (pk / id)
    """

    def get_object(self, pk):
        try:
            return InventoryPolicy.objects.get(pk=pk)
        except (InventoryPolicy.DoesNotExist, ValueError, TypeError):
            return None

    def get(self, request, pk):
        policy = self.get_object(pk)
        if not policy:
            return Response(
                {"message": f"Inventory policy with ID '{pk}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = InventoryPolicySerializer(policy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        policy = self.get_object(pk)
        if not policy:
            return Response(
                {"message": f"Inventory policy with ID '{pk}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        product = policy.product
        inventory_qs = Inventory.objects.filter(product=product)

        try:
            service_level = int(request.data.get("service_level", policy.service_level))
            ordering_cost = float(request.data.get("ordering_cost", policy.ordering_cost))
            holding_cost = float(request.data.get("holding_cost", policy.holding_cost))
            stockout_cost = float(request.data.get("stockout_cost", policy.stockout_cost))
        except (TypeError, ValueError):
            return Response(
                {"message": "Invalid Input Values for cost parameters or service level."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            calc_data = _calculate_policy_data(
                inventory_qs, service_level, ordering_cost, holding_cost, stockout_cost
            )
        except ValueError as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        for key, val in calc_data.items():
            setattr(policy, key, val)
        policy.save()

        serializer = InventoryPolicySerializer(policy)
        return Response(
            {
                "message": "Inventory Policy recalculated and updated successfully",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        policy = self.get_object(pk)
        if not policy:
            return Response(
                {"message": f"Inventory policy with ID '{pk}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        policy.delete()
        return Response(
            {"message": f"Inventory policy with ID '{pk}' deleted successfully"},
            status=status.HTTP_200_OK
        )






