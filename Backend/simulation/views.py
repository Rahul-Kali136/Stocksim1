from django.shortcuts import render
from django.db.models import Q
import random

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics

from subscriptions.services import usage_service

from product.models import Product
from probability.models import ProbabilityDistribution
from inventorypolicy.models import InventoryPolicy

from .models import MonteCarloSimulation
from .serializers import MonteCarloSimulationSerializer


def get_policy_product(policy, request=None):
    if policy and policy.product_id:
        try:
            return policy.product
        except Product.DoesNotExist:
            pass

    if request:
        req_pid = (
            request.data.get("product_id")
            or request.data.get("product")
            or (hasattr(request, "query_params") and request.query_params.get("product_id"))
        )
        if req_pid:
            try:
                p_obj = Product.objects.filter(pk=req_pid).first()
                if p_obj:
                    return p_obj
            except Exception:
                pass

    return Product.objects.first()


def run_monte_carlo_simulation(policy, simulation_days, opening_stock, request=None, target_sim_id=None):
    ROP = policy.reorder_point
    ROQ = policy.reorder_quantity

    if request and hasattr(request, "data"):
        custom_rop = request.data.get("rop")
        custom_roq = request.data.get("roq")
        if custom_rop is not None:
            try:
                ROP = int(custom_rop)
            except (ValueError, TypeError):
                pass
        if custom_roq is not None:
            try:
                ROQ = int(custom_roq)
            except (ValueError, TypeError):
                pass

    policy_product = get_policy_product(policy, request)
    if policy and not policy.product_id and policy_product:
        policy.product = policy_product
        policy.save(update_fields=["product"])

    if policy_product:
        rows = list(ProbabilityDistribution.objects.filter(product=policy_product))
    else:
        rows = []

    if not rows:
        rows = list(ProbabilityDistribution.objects.all())

    def get_simulated_value(data_type, random_number):
        for row in rows:
            if data_type == "Demand" and row.demand_random_interval and row.demand_value is not None:
                if isinstance(row.demand_random_interval, list):
                    for i, interval_item in enumerate(row.demand_random_interval):
                        try:
                            interval_str = str(interval_item).replace("–", "-").replace("—", "-")
                            parts = interval_str.split("-")
                            if len(parts) == 2:
                                start, end = int(parts[0].strip()), int(parts[1].strip())
                                if start <= random_number <= end:
                                    if isinstance(row.demand_value, list) and i < len(row.demand_value):
                                        return row.demand_value[i]
                        except (ValueError, TypeError, AttributeError):
                            pass
                else:
                    try:
                        interval_str = str(row.demand_random_interval).replace("–", "-").replace("—", "-")
                        parts = interval_str.split("-")
                        if len(parts) == 2:
                            start, end = int(parts[0].strip()), int(parts[1].strip())
                            if start <= random_number <= end:
                                return row.demand_value
                    except (ValueError, TypeError, AttributeError):
                        pass

            elif data_type == "LeadTime" and row.lead_random_interval and row.lead_time_days is not None:
                if isinstance(row.lead_random_interval, list):
                    for i, interval_item in enumerate(row.lead_random_interval):
                        try:
                            interval_str = str(interval_item).replace("–", "-").replace("—", "-")
                            parts = interval_str.split("-")
                            if len(parts) == 2:
                                start, end = int(parts[0].strip()), int(parts[1].strip())
                                if start <= random_number <= end:
                                    if isinstance(row.lead_time_days, list) and i < len(row.lead_time_days):
                                        return row.lead_time_days[i]
                        except (ValueError, TypeError, AttributeError):
                            pass
                else:
                    try:
                        interval_str = str(row.lead_random_interval).replace("–", "-").replace("—", "-")
                        parts = interval_str.split("-")
                        if len(parts) == 2:
                            start, end = int(parts[0].strip()), int(parts[1].strip())
                            if start <= random_number <= end:
                                return row.lead_time_days
                    except (ValueError, TypeError, AttributeError):
                        pass

        if data_type == "Demand" and policy and policy.average_demand:
            std_dev = max(1.0, policy.average_demand * 0.2)
            simulated_val = int(round(random.gauss(policy.average_demand, std_dev)))
            return max(0, simulated_val)
        elif data_type == "LeadTime" and policy and policy.average_lead_time:
            std_dev = max(0.5, policy.average_lead_time * 0.2)
            simulated_val = int(round(random.gauss(policy.average_lead_time, std_dev)))
            return max(1, simulated_val)

        return 0

    order_pending = False
    arrival_day = None
    current_stock = opening_stock

    day_list = []
    opening_stock_list = []
    random_demand_list = []
    simulated_demand_list = []
    closing_stock_list = []
    order_status_list = []
    random_lead_list = []
    simulated_lead_list = []
    arrival_day_list = []
    stock_received_list = []

    for day in range(1, simulation_days + 1):
        random_demand = random.randint(0, 99)
        simulated_demand = get_simulated_value("Demand", random_demand) or 0

        opening_stock_today = current_stock
        closing_stock = opening_stock_today - simulated_demand

        order_status = "No"
        random_lead = None
        simulated_lead = None
        stock_received = 0
        arrival_day_value = None

        # ---------- ROP Check ----------
        if not order_pending and closing_stock <= ROP:
            random_lead = random.randint(0, 99)
            simulated_lead = get_simulated_value("LeadTime", random_lead) or 0
            arrival_day = day + simulated_lead
            arrival_day_value = arrival_day
            order_status = "Order Placed"
            order_pending = True

        # ---------- Pending Order ----------
        elif order_pending:
            order_status = "Pending"

        # ---------- Receive Stock ----------
        if order_pending and day == arrival_day:
            opening_stock_today += ROQ
            stock_received = ROQ
            closing_stock = opening_stock_today - simulated_demand
            order_status = "Received"
            order_pending = False
            arrival_day = None

        current_stock = closing_stock

        day_list.append(day)
        opening_stock_list.append(opening_stock_today)
        random_demand_list.append(random_demand)
        simulated_demand_list.append(simulated_demand)
        closing_stock_list.append(closing_stock)
        order_status_list.append(order_status)
        random_lead_list.append(random_lead)
        simulated_lead_list.append(simulated_lead)
        arrival_day_list.append(arrival_day_value)
        stock_received_list.append(stock_received)

    simulation = None
    if target_sim_id:
        simulation = MonteCarloSimulation.objects.filter(pk=target_sim_id).first()
    if not simulation:
        simulation = MonteCarloSimulation(policy=policy)

    simulation.product = policy_product
    simulation.day = day_list
    simulation.simulation_days = simulation_days
    simulation.opening_stock = opening_stock_list
    simulation.random_demand = random_demand_list
    simulation.simulated_demand = simulated_demand_list
    simulation.closing_stock = closing_stock_list
    simulation.order_status = order_status_list
    simulation.random_lead = random_lead_list
    simulation.simulated_lead = simulated_lead_list
    simulation.arrival_day = arrival_day_list
    simulation.stock_received = stock_received_list
    simulation.save()

    try:
        from inventorysummary.services import InventorySummaryService
        InventorySummaryService.generate_summary(policy.product)
    except Exception:
        pass

    try:
        trigger_supplier_alerts(policy, order_status_list, ROP, ROQ)
    except Exception:
        pass

    return [simulation]


def extract_policy_id(request, url_policy_id=None):
    if url_policy_id is not None:
        return url_policy_id

    raw_policy = (
        request.data.get("policy_id")
        or request.data.get("policy_number")
        or request.data.get("policy")
    )
    if raw_policy is None:
        return None

    if isinstance(raw_policy, dict):
        return raw_policy.get("id") or raw_policy.get("policy_id") or raw_policy.get("pk")

    return raw_policy


def extract_simulation_days(request, default=10):
    val = None
    keys = (
        "simulation_days",
        "simulations_days",
        "simulation_day",
        "simulations_day",
        "sim_days",
        "days",
        "num_days",
        "number_of_days",
    )
    if hasattr(request, "data") and hasattr(request.data, "get"):
        for k in keys:
            if request.data.get(k) is not None:
                val = request.data.get(k)
                break
    if val is None and hasattr(request, "query_params") and hasattr(request.query_params, "get"):
        for k in keys:
            if request.query_params.get(k) is not None:
                val = request.query_params.get(k)
                break
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return default


def extract_opening_stock(request):
    val = None
    keys = ("opening_stock", "initial_stock", "stock")
    if hasattr(request, "data") and hasattr(request.data, "get"):
        for k in keys:
            v = request.data.get(k)
            if v is not None:
                if isinstance(v, list):
                    continue
                try:
                    val = int(v)
                    break
                except (ValueError, TypeError):
                    pass
    if val is None and hasattr(request, "query_params") and hasattr(request.query_params, "get"):
        for k in keys:
            if request.query_params.get(k) is not None:
                val = request.query_params.get(k)
                break
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return None


class MonteCarloSimulationAPIView(APIView):

    def post(self, request, policy_id=None):
        if hasattr(request, 'user') and request.user.is_authenticated:
            has_limit = usage_service.check_run_limit(request.user)
            if not has_limit:
                return Response(
                    {
                        "success": False,
                        "error": "RUN_LIMIT_EXCEEDED",
                        "message": "You have reached your plan's simulation run limit."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            # We consume a run only after successfully processing below, or right here if we prefer:
            usage_service.consume_run(request.user)
            
        # Repair any existing MonteCarloSimulation rows with null product_id
        null_sims = MonteCarloSimulation.objects.filter(product__isnull=True)
        if null_sims.exists():
            first_prod = Product.objects.first()
            for sim in null_sims:
                if sim.policy and sim.policy.product:
                    sim.product = sim.policy.product
                elif first_prod:
                    sim.product = first_prod
                sim.save(update_fields=["product"])

        target_policy_id = extract_policy_id(request, policy_id)

        # Check if the frontend passed the raw simulation data to save directly
        if request.data and "day" in request.data and "opening_stock" in request.data:
            policy = InventoryPolicy.objects.filter(pk=target_policy_id).first()
            if not policy:
                return Response(
                    {"message": f"Inventory Policy or Simulation with ID {target_policy_id} not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create a new simulation row instead of updating the first one found for the policy
            simulation = MonteCarloSimulation(policy=policy)
            
            simulation.product = policy.product
            simulation.day = request.data.get("day")
            simulation.simulation_days = request.data.get("simulation_days") or len(request.data.get("day"))
            simulation.opening_stock = request.data.get("opening_stock")
            simulation.random_demand = request.data.get("random_demand")
            simulation.simulated_demand = request.data.get("simulated_demand")
            simulation.closing_stock = request.data.get("closing_stock")
            simulation.order_status = request.data.get("order_status")
            simulation.random_lead = request.data.get("random_lead")
            simulation.simulated_lead = request.data.get("simulated_lead")
            simulation.arrival_day = request.data.get("arrival_day")
            simulation.stock_received = request.data.get("stock_received")
            simulation.save()

            try:
                from inventorysummary.services import InventorySummaryService
                InventorySummaryService.generate_summary(policy.product)
            except Exception:
                pass

            try:
                trigger_supplier_alerts(
                    policy,
                    simulation.order_status,
                    request.data.get("rop") or policy.reorder_point,
                    request.data.get("roq") or policy.reorder_quantity
                )
            except Exception:
                pass

            serializer = MonteCarloSimulationSerializer(simulation)
            return Response(
                {
                    "message": "Monte Carlo Simulation Saved Successfully from Frontend Data",
                    "simulation_days": len(simulation.day),
                    "data": [serializer.data]
                },
                status=status.HTTP_201_CREATED
            )

        simulation_days = extract_simulation_days(request, default=10)
        user_opening_stock = extract_opening_stock(request)

        policies_to_run = []
        if target_policy_id:
            policy = InventoryPolicy.objects.filter(pk=target_policy_id).first()
            if not policy:
                sim = MonteCarloSimulation.objects.filter(pk=target_policy_id).first()
                if sim and sim.policy:
                    policy = sim.policy
            if not policy:
                return Response(
                    {"message": f"Inventory Policy or Simulation with ID {target_policy_id} not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            if MonteCarloSimulation.objects.filter(policy=policy).exists() or MonteCarloSimulation.objects.filter(pk=target_policy_id).exists():
                return MonteCarloSimulationEditView().handle_edit(request, policy_id=target_policy_id)
            policies_to_run.append(policy)
        else:
            all_policies = list(InventoryPolicy.objects.all().order_by("id"))
            policies_to_run = [
                p for p in all_policies
                if not MonteCarloSimulation.objects.filter(policy=p).exists()
            ]
            if not policies_to_run:
                if not all_policies:
                    return Response(
                        {"message": "Inventory Policy not found."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Auto-edit existing first policy simulation instead of erroring out
                first_policy = all_policies[0]
                return MonteCarloSimulationEditView().handle_edit(request, policy_id=first_policy.id)

        all_simulation_records = []
        for policy in policies_to_run:
            policy_product = get_policy_product(policy, request)
            if user_opening_stock is not None:
                opening_stock = user_opening_stock
            elif policy and hasattr(policy, 'opening_stock') and policy.opening_stock is not None:
                opening_stock = policy.opening_stock
            else:
                opening_stock = 0

            records = run_monte_carlo_simulation(policy, simulation_days, opening_stock, request)
            all_simulation_records.extend(records)

        serializer = MonteCarloSimulationSerializer(all_simulation_records, many=True)

        return Response(
            {
                "message": "Monte Carlo Simulation Completed Successfully",
                "simulation_days": simulation_days,
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class MonteCarloSimulationEditView(APIView):
    """
    PUT/POST/PATCH /api/simulation/edit/ or /api/simulation/edit/<policy_id>/
    Edits simulation parameters for policy_id, simulation_days, and opening_stock,
    and re-runs the Monte Carlo simulation.
    """

    def handle_edit(self, request, policy_id=None):
        target_id = extract_policy_id(request, policy_id)

        if not target_id:
            return Response(
                {"message": "policy_id or simulation id is required in URL path or request body."},
                status=status.HTTP_400_BAD_REQUEST
            )

        sim_obj = MonteCarloSimulation.objects.filter(pk=target_id).first()
        target_sim_id = None
        if sim_obj:
            policy = sim_obj.policy
            target_sim_id = sim_obj.id
        else:
            policy = InventoryPolicy.objects.filter(pk=target_id).first()
            if policy:
                sim_obj = MonteCarloSimulation.objects.filter(policy=policy).first()
                if sim_obj:
                    target_sim_id = sim_obj.id

        if not policy:
            return Response(
                {"message": f"Inventory Policy or Simulation with ID {target_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        existing_days = len(sim_obj.day) if (sim_obj and isinstance(sim_obj.day, list) and len(sim_obj.day) > 0) else 10
        simulation_days = extract_simulation_days(request, default=existing_days)

        user_opening_stock = extract_opening_stock(request)
        policy_product = get_policy_product(policy, request)

        if user_opening_stock is not None:
            opening_stock = user_opening_stock
        elif sim_obj and isinstance(sim_obj.opening_stock, list) and len(sim_obj.opening_stock) > 0:
            opening_stock = sim_obj.opening_stock[0]
        elif policy and hasattr(policy, 'opening_stock') and policy.opening_stock is not None:
            opening_stock = policy.opening_stock
        else:
            opening_stock = 0

        simulation_records = run_monte_carlo_simulation(
            policy,
            simulation_days,
            opening_stock,
            request=request,
            target_sim_id=target_sim_id
        )
        serializer = MonteCarloSimulationSerializer(simulation_records, many=True)

        return Response(
            {
                "message": "Monte Carlo Simulation updated successfully",
                "policy_id": policy.id,
                "simulation_days": simulation_days,
                "opening_stock": opening_stock,
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def put(self, request, policy_id=None):
        return self.handle_edit(request, policy_id)

    def post(self, request, policy_id=None):
        return self.handle_edit(request, policy_id)

    def patch(self, request, policy_id=None):
        return self.handle_edit(request, policy_id)


def repair_null_product_simulations():
    null_sims = MonteCarloSimulation.objects.filter(product__isnull=True)
    if null_sims.exists():
        first_prod = Product.objects.first()
        for sim in null_sims:
            if sim.policy and sim.policy.product:
                sim.product = sim.policy.product
            elif first_prod:
                sim.product = first_prod
            sim.save(update_fields=["product"])


class MonteCarloSimulationList(APIView):

    def get(self, request):
        repair_null_product_simulations()
        queryset = MonteCarloSimulation.objects.all().order_by("id")
        serializer = MonteCarloSimulationSerializer(queryset, many=True)
        return Response(serializer.data)


class MonteCarloSimulationDetail(APIView):
    def get(self, request, pk):
        repair_null_product_simulations()
        sim = MonteCarloSimulation.objects.filter(pk=pk).first()
        if not sim:
            return Response(
                {"message": f"Simulation with ID '{pk}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = MonteCarloSimulationSerializer(sim)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return MonteCarloSimulationEditView().handle_edit(request, policy_id=pk)

    def patch(self, request, pk):
        return MonteCarloSimulationEditView().handle_edit(request, policy_id=pk)

    def post(self, request, pk):
        return MonteCarloSimulationEditView().handle_edit(request, policy_id=pk)

    def delete(self, request, pk):
        sim = MonteCarloSimulation.objects.filter(pk=pk).first()
        if not sim:
            return Response(
                {"message": f"Simulation with ID '{pk}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        sim.delete()
        return Response(
            {"message": f"Simulation with ID '{pk}' deleted successfully."},
            status=status.HTTP_200_OK
        )


class MonteCarloSimulationByPolicy(APIView):
    """
    GET /api/simulation/policy/<policy_id>/ -> Get Monte Carlo simulation details by Policy ID
    PUT/PATCH/POST /api/simulation/policy/<policy_id>/ -> Edit Monte Carlo simulation for Policy ID
    DELETE /api/simulation/policy/<policy_id>/ -> Delete Monte Carlo simulation for Policy ID
    """

    def get(self, request, policy_id):
        repair_null_product_simulations()
        queryset = MonteCarloSimulation.objects.filter(policy_id=policy_id).order_by("id")

        if not queryset.exists():
            return Response(
                {"message": f"No simulation found for Policy ID {policy_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MonteCarloSimulationSerializer(queryset, many=True)
        return Response(
            {
                "message": f"Simulations data for Policy ID {policy_id}",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def put(self, request, policy_id):
        return MonteCarloSimulationEditView().handle_edit(request, policy_id=policy_id)

    def patch(self, request, policy_id):
        return MonteCarloSimulationEditView().handle_edit(request, policy_id=policy_id)

    def post(self, request, policy_id):
        return MonteCarloSimulationEditView().handle_edit(request, policy_id=policy_id)

    def delete(self, request, policy_id):
        queryset = MonteCarloSimulation.objects.filter(policy_id=policy_id)

        if not queryset.exists():
            return Response(
                {"message": f"No simulation found for Policy ID {policy_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        deleted_count, _ = queryset.delete()
        return Response(
            {
                "message": f"Simulations for Policy ID {policy_id} deleted successfully",
                "deleted_count": deleted_count
            },
            status=status.HTTP_200_OK
        )


class MonteCarloSimulationByAdmin(APIView):
    """
    GET /api/simulation/admin/<admin_id>/ -> Get Monte Carlo simulation details by Admin ID
    """

    def get(self, request, admin_id):
        repair_null_product_simulations()
        queryset = MonteCarloSimulation.objects.filter(
            Q(product__organization__admin_id=admin_id) |
            Q(product__supplier__organization__admin_id=admin_id) |
            Q(policy__product__organization__admin_id=admin_id) |
            Q(policy__product__supplier__organization__admin_id=admin_id)
        ).distinct().order_by("id")

        if not queryset.exists():
            return Response(
                {"message": f"No simulation found for Admin ID {admin_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MonteCarloSimulationSerializer(queryset, many=True)
        return Response(
            {
                "message": f"Simulations data for Admin ID {admin_id}",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )


def trigger_supplier_alerts(policy, order_status_list, rop_val, roq_val):
    from django.core.mail import send_mail
    import threading
    from django.conf import settings

    def send_supplier_notifications():
        try:
            product = policy.product
            if product:
                supplier = getattr(product, "supplier", None)
                if not supplier and hasattr(product, "suppliers"):
                    supplier = product.suppliers.first()
                if supplier and (supplier.email or supplier.phone):
                    reorders = [i for i, status in enumerate(order_status_list) if "Order" in str(status)]
                    if reorders:
                        subject = f"[StockSim] Purchase Order Request: {product.product_name}"
                        message = (
                            f"Hello {supplier.supplier_name},\n\n"
                            f"This is an automated notification from StockSim for product: {product.product_name}.\n\n"
                            f"During our inventory simulation run of {len(order_status_list)} days, "
                            f"there were {len(reorders)} replenishment orders triggered (ROP: {rop_val}, ROQ: {roq_val}).\n\n"
                            f"A total of {len(reorders)} orders have been automatically dispatched to you.\n\n"
                            f"Best Regards,\n"
                            f"StockSim Inventory Management"
                        )
                        
                        # Professional HTML Template
                        html_message = f"""
                        <html>
                        <body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; margin: 0;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
                                <!-- Header -->
                                <div style="background-color: #2563eb; color: #ffffff; padding: 24px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">STOCKSIM ORDER DISPATCH</h1>
                                    <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Automated Inventory Replenishment Engine</p>
                                </div>
                                
                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; font-weight: 600; margin-top: 0; color: #1e293b;">Dear {supplier.supplier_name},</p>
                                    <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                                        An automated inventory replenishment schedule has been generated based on our latest demand simulation models. A purchase request has been authorized for the product below:
                                    </p>
                                    
                                    <!-- Order Summary Table -->
                                    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
                                        <thead>
                                            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #334155;">Product Details</th>
                                                <th style="padding: 12px; text-align: right; font-weight: 600; color: #334155;">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 12px; font-weight: 600; color: #1e293b;">{product.product_name}</td>
                                                <td style="padding: 12px; text-align: right; font-weight: 600; color: #2563eb;">{roq_val} Units</td>
                                            </tr>
                                            <tr style="background-color: #fafafa; border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 12px; color: #64748b;">Reorder Point (ROP) Threshold</td>
                                                <td style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">{rop_val} Units</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px; color: #64748b;">Simulated Orders Count</td>
                                                <td style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">{len(reorders)} Times</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    <!-- Order Status -->
                                    <div style="background-color: #ecfdf5; border: 1px dashed #10b981; border-radius: 8px; padding: 16px; text-align: center; margin: 32px 0 16px 0;">
                                        <span style="display: block; font-size: 15px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">✓ ORDER STATUS: PLACED & DISPATCHED</span>
                                        <span style="display: block; font-size: 12px; color: #047857; margin-top: 4px;">This replenishment order was automatically triggered and dispatched by the StockSim Auto-Reorder system. No manual action is required.</span>
                                    </div>
                                </div>
                                
                                <!-- Footer -->
                                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; font-size: 13px; color: #64748b;">&copy; 2026 StockSim Inc. All rights reserved.</p>
                                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">This is a system-generated transaction notification. Please do not reply directly to this email.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """

                        # Send Email
                        if supplier.email:
                            send_mail(
                                subject=subject,
                                message=message,
                                from_email=settings.DEFAULT_FROM_EMAIL,
                                recipient_list=[supplier.email],
                                fail_silently=False,
                                html_message=html_message,
                            )
                            print(f"[StockSim Alert] Email successfully sent to supplier {supplier.supplier_name} at {supplier.email}")

                        # Send SMS via Twilio (or fallback to log)
                        if supplier.phone:
                            sms_text = f"[StockSim Alert] replenishment order triggered for {product.product_name}. Quantity: {roq_val} units. ROP: {rop_val} units."
                            send_sms_via_twilio(supplier.phone, sms_text)
        except Exception as ex:
            print(f"[StockSim Notification Error] Failed to send supplier alerts: {ex}")

    threading.Thread(target=send_supplier_notifications, daemon=True).start()


def send_sms_via_twilio(phone_number, message_text):
    from django.conf import settings
    from twilio.rest import Client
    
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", None)
    token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
    from_number = getattr(settings, "TWILIO_PHONE_NUMBER", None)
    
    if sid and token and from_number and not sid.startswith("ACXXXX"):
        try:
            client = Client(sid, token)
            message = client.messages.create(
                body=message_text,
                from_=from_number,
                to=phone_number
            )
            print(f"[StockSim Twilio SMS] Successfully sent SMS to {phone_number}: {message.sid}")
            return True
        except Exception as e:
            print(f"[StockSim Twilio SMS Error] Failed to send SMS to {phone_number}: {e}")
    else:
        print(f"[StockSim Twilio SMS Mock] Sent to {phone_number}: {message_text}")
    return False



