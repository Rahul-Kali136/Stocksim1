from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics

from product.models import Product
from simulation.models import MonteCarloSimulation
from inventorypolicy.models import InventoryPolicy

from .models import InventoryCostAnalysis
from .serializers import InventoryCostAnalysisSerializer


def get_policy_product(policy, sims_to_use=None, request=None):
    if policy and policy.product_id:
        try:
            return policy.product
        except Product.DoesNotExist:
            pass

    if request:
        req_pid = (
            request.data.get("product_id")
            or request.data.get("product")
            or (
                hasattr(request, "query_params")
                and request.query_params.get("product_id")
            )
        )

        if req_pid:
            try:
                p_obj = Product.objects.filter(pk=req_pid).first()
                if p_obj:
                    return p_obj
            except Exception:
                pass

    if sims_to_use:
        for sim in sims_to_use:
            if sim.product_id:
                try:
                    return sim.product
                except Product.DoesNotExist:
                    pass

    return Product.objects.first()


class InventoryCostAnalysisAPIView(APIView):

    def post(self, request, policy_id=None):

        raw_policy_id = (
            policy_id
            or request.data.get("policy_id")
            or request.data.get("policy_number")
            or request.data.get("policy")
        )

        if isinstance(raw_policy_id, dict):
            target_policy_id = (
                raw_policy_id.get("id")
                or raw_policy_id.get("policy_id")
                or raw_policy_id.get("pk")
            )
        else:
            target_policy_id = raw_policy_id

        if target_policy_id:
            try:
                policy = InventoryPolicy.objects.get(
                    pk=target_policy_id
                )
            except (
                InventoryPolicy.DoesNotExist,
                ValueError,
                TypeError,
            ):
                return Response(
                    {
                        "message": (
                            f"Inventory Policy with ID "
                            f"'{target_policy_id}' not found."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            policy_sims = (
                MonteCarloSimulation.objects
                .filter(policy=policy)
                .order_by("day")
            )

            all_sims = (
                MonteCarloSimulation.objects
                .all()
                .order_by("day")
            )

            sims_to_use = (
                policy_sims
                if policy_sims.exists()
                else all_sims
            )

            if not sims_to_use.exists():
                return Response(
                    {
                        "message":
                            "Run Monte Carlo Simulation First"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            sim_days = 0
            tot_opening = 0
            tot_demand = 0
            tot_orders = 0
            stkout_qty = 0

            for row in sims_to_use:

                if isinstance(row.day, list):

                    sim_days += len(row.day)

                    if isinstance(row.opening_stock, list):
                        tot_opening += sum(
                            row.opening_stock
                        )

                    if isinstance(
                        row.simulated_demand,
                        list,
                    ):
                        tot_demand += sum(
                            row.simulated_demand
                        )

                    if isinstance(
                        row.order_status,
                        list,
                    ):
                        tot_orders += (
                            row.order_status.count(
                                "Order Placed"
                            )
                        )

                    if isinstance(
                        row.closing_stock,
                        list,
                    ):
                        stkout_qty += sum(
                            abs(cs)
                            for cs in row.closing_stock
                            if cs is not None and cs < 0
                        )

                else:

                    sim_days += 1

                    tot_opening += (
                        row.opening_stock or 0
                    )

                    tot_demand += (
                        row.simulated_demand or 0
                    )

                    if (
                        row.order_status ==
                        "Order Placed"
                    ):
                        tot_orders += 1

                    if (
                        row.closing_stock is not None
                        and row.closing_stock < 0
                    ):
                        stkout_qty += abs(
                            row.closing_stock
                        )

            avg_inv = (
                tot_opening / sim_days
                if sim_days > 0
                else 0
            )

            product_obj = get_policy_product(
                policy,
                sims_to_use,
                request,
            )

            if (
                policy
                and not policy.product_id
                and product_obj
            ):
                policy.product = product_obj
                policy.save(
                    update_fields=["product"]
                )

            p_holding = policy.holding_cost if policy.holding_cost is not None else (product_obj.holding_cost if product_obj else 0)
            p_ordering = policy.ordering_cost if policy.ordering_cost is not None else (product_obj.ordering_cost if product_obj else 0)
            p_stockout = policy.stockout_cost if policy.stockout_cost is not None else (product_obj.stockout_cost if product_obj else 0)

            holding_cost = round(
                avg_inv * float(p_holding or 0),
                2,
            )

            ordering_cost = round(
                tot_orders * float(p_ordering or 0),
                2,
            )

            stockout_cost = round(
                stkout_qty * float(p_stockout or 0),
                2,
            )

            total_inventory_cost = round(
                holding_cost
                + ordering_cost
                + stockout_cost,
                2,
            )

            cost = InventoryCostAnalysis.objects.create(
                policy=policy,
                product=product_obj,
                simulation_days=sim_days,
                average_inventory=round(avg_inv, 2),
                total_demand=tot_demand,
                total_orders=tot_orders,
                stockout_quantity=stkout_qty,
                holding_cost=holding_cost,
                ordering_cost=ordering_cost,
                stockout_cost=stockout_cost,
                total_inventory_cost=total_inventory_cost,
            )

            serializer = (
                InventoryCostAnalysisSerializer(
                    cost
                )
            )

            return Response(
                {
                    "message":
                        "Inventory Cost Analysis "
                        "Completed Successfully",
                    "policy_id": policy.id,
                    "data": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        simulation = (
            MonteCarloSimulation.objects
            .all()
            .order_by("day")
        )

        if not simulation.exists():
            return Response(
                {
                    "message":
                        "Run Monte Carlo Simulation First"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        policies = (
            InventoryPolicy.objects
            .all()
            .order_by("id")
        )

        if not policies.exists():
            return Response(
                {
                    "message":
                        "Inventory Policy Not Found"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []

        for policy in policies:

            policy_sims = (
                MonteCarloSimulation.objects
                .filter(policy=policy)
                .order_by("day")
            )

            sims_to_use = (
                policy_sims
                if policy_sims.exists()
                else simulation
            )

            sim_days = 0
            tot_opening = 0
            tot_demand = 0
            tot_orders = 0
            stkout_qty = 0

            for row in sims_to_use:

                if isinstance(row.day, list):

                    sim_days += len(row.day)

                    if isinstance(
                        row.opening_stock,
                        list,
                    ):
                        tot_opening += sum(
                            row.opening_stock
                        )

                    if isinstance(
                        row.simulated_demand,
                        list,
                    ):
                        tot_demand += sum(
                            row.simulated_demand
                        )

                    if isinstance(
                        row.order_status,
                        list,
                    ):
                        tot_orders += (
                            row.order_status.count(
                                "Order Placed"
                            )
                        )

                    if isinstance(
                        row.closing_stock,
                        list,
                    ):
                        stkout_qty += sum(
                            abs(cs)
                            for cs in row.closing_stock
                            if cs is not None
                            and cs < 0
                        )

                else:

                    sim_days += 1

                    tot_opening += (
                        row.opening_stock or 0
                    )

                    tot_demand += (
                        row.simulated_demand or 0
                    )

                    if (
                        row.order_status ==
                        "Order Placed"
                    ):
                        tot_orders += 1

                    if (
                        row.closing_stock is not None
                        and row.closing_stock < 0
                    ):
                        stkout_qty += abs(
                            row.closing_stock
                        )

            avg_inv = (
                tot_opening / sim_days
                if sim_days > 0
                else 0
            )

            product_obj = get_policy_product(
                policy,
                sims_to_use,
                request,
            )

            if (
                policy
                and not policy.product_id
                and product_obj
            ):
                policy.product = product_obj
                policy.save(
                    update_fields=["product"]
                )

            p_holding = policy.holding_cost if policy.holding_cost is not None else (product_obj.holding_cost if product_obj else 0)
            p_ordering = policy.ordering_cost if policy.ordering_cost is not None else (product_obj.ordering_cost if product_obj else 0)
            p_stockout = policy.stockout_cost if policy.stockout_cost is not None else (product_obj.stockout_cost if product_obj else 0)

            holding_cost = round(
                avg_inv * float(p_holding or 0),
                2,
            )

            ordering_cost = round(
                tot_orders * float(p_ordering or 0),
                2,
            )

            stockout_cost = round(
                stkout_qty * float(p_stockout or 0),
                2,
            )

            total_inventory_cost = round(
                holding_cost
                + ordering_cost
                + stockout_cost,
                2,
            )

            cost, _ = (
                InventoryCostAnalysis.objects
                .update_or_create(
                    policy=policy,
                    defaults={
                        "product": product_obj,
                        "simulation_days": sim_days,
                        "average_inventory":
                            round(avg_inv, 2),
                        "total_demand": tot_demand,
                        "total_orders": tot_orders,
                        "stockout_quantity":
                            stkout_qty,
                        "holding_cost":
                            holding_cost,
                        "ordering_cost":
                            ordering_cost,
                        "stockout_cost":
                            stockout_cost,
                        "total_inventory_cost":
                            total_inventory_cost,
                    },
                )
            )

            results.append(cost)

        serializer = (
            InventoryCostAnalysisSerializer(
                results,
                many=True,
            )
        )

        return Response(
            {
                "message":
                    "Inventory Cost Analysis "
                    "Completed Successfully",
                "total_policies":
                    policies.count(),
                "data":
                    serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class InventoryCostAnalysisDetail(
    generics.RetrieveDestroyAPIView
):
    queryset = InventoryCostAnalysis.objects.all()
    serializer_class = (
        InventoryCostAnalysisSerializer
    )


class InventoryCostAnalysisByProduct(APIView):

    def get(self, request, product_id):

        queryset = (
            InventoryCostAnalysis.objects
            .filter(
                Q(product_id=product_id)
                | Q(policy__product_id=product_id)
            )
            .distinct()
            .order_by("-id")
        )

        if not queryset.exists():
            return Response(
                {
                    "message":
                        f"No cost analysis found "
                        f"for Product ID {product_id}"
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            InventoryCostAnalysisSerializer(
                queryset,
                many=True,
            )
        )

        return Response(
            {
                "message":
                    f"Cost analysis data for "
                    f"Product ID {product_id}",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class InventoryCostAnalysisByAdmin(APIView):

    def get(self, request, admin_id):

        queryset = (
            InventoryCostAnalysis.objects
            .filter(
                Q(
                    product__organization__admin_id=
                    admin_id
                )
                | Q(
                    product__supplier__organization__admin_id=
                    admin_id
                )
                | Q(
                    policy__product__organization__admin_id=
                    admin_id
                )
                | Q(
                    policy__product__supplier__organization__admin_id=
                    admin_id
                )
            )
            .distinct()
            .order_by("-id")
        )

        if not queryset.exists():
            return Response(
                {
                    "message":
                        f"No cost analysis found "
                        f"for Admin ID {admin_id}"
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            InventoryCostAnalysisSerializer(
                queryset,
                many=True,
            )
        )

        return Response(
            {
                "message":
                    f"Cost analysis data for "
                    f"Admin ID {admin_id}",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
