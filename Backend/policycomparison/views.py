from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics

from product.models import Product
from costanalysis.models import InventoryCostAnalysis

from .models import PolicyComparison
from .serializers import PolicyComparisonSerializer


def get_cost_product(cost):
    if not cost or not cost.product_id:
        return None
    try:
        return cost.product
    except Product.DoesNotExist:
        return None


def extract_product_id(request, url_product_id=None):
    if url_product_id is not None:
        return url_product_id

    raw_product = (
        request.data.get("product_id")
        or request.data.get("product")
        or request.query_params.get("product_id")
    )
    if raw_product is None:
        return None

    if isinstance(raw_product, dict):
        return raw_product.get("product_id") or raw_product.get("id") or raw_product.get("pk")

    return raw_product


class PolicyComparisonAPIView(APIView):
    """
    GET /api/policycomparison/ or GET /api/policycomparison/run/ -> Get all policy comparisons
    POST /api/policycomparison/run/ or POST /api/policycomparison/run/<product_id>/ -> Run policy comparison
    """

    def get(self, request):
        queryset = PolicyComparison.objects.select_related("policy", "cost_analysis", "product").all().order_by("total_inventory_cost")
        serializer = PolicyComparisonSerializer(queryset, many=True)
        return Response(
            {
                "message": "All policy comparisons retrieved successfully",
                "count": queryset.count(),
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def post(self, request, product_id=None):
        target_product_id = extract_product_id(request, product_id)

        if not target_product_id:
            return Response(
                {"message": "product_id is required in request body or URL path. Example payload: {\"product_id\": 1}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        cost_qs = InventoryCostAnalysis.objects.filter(
            Q(product_id=target_product_id) | Q(policy__product_id=target_product_id)
        ).select_related("policy", "product").order_by("-created_at")

        if not cost_qs.exists():
            return Response(
                {"message": f"Run Inventory Cost Analysis for Product ID {target_product_id} First"},
                status=status.HTTP_400_BAD_REQUEST
            )

        cost_list_all = list(cost_qs)
        
        # Only keep the latest CostAnalysis for each unique policy
        policy_latest_cost = {}
        for c in cost_list_all:
            # Since it's ordered by -created_at, the first one we see is the latest
            if c.policy_id not in policy_latest_cost:
                policy_latest_cost[c.policy_id] = c

        cost_list = list(policy_latest_cost.values())
        
        unique_costs = sorted(list(set(c.total_inventory_cost for c in cost_list)))
        best_cost = unique_costs[0] if unique_costs else None
        better_cost = unique_costs[1] if len(unique_costs) > 1 else None

        comparison_list = []
        for cost in cost_list:
            if cost.total_inventory_cost == best_cost:
                recommendation = "Best"
            elif better_cost is not None and cost.total_inventory_cost == better_cost:
                recommendation = "Recommended"
            else:
                recommendation = "Not Recommended"

            comparison, _ = PolicyComparison.objects.update_or_create(
                policy=cost.policy,
                defaults={
                    "product": get_cost_product(cost),
                    "cost_analysis": cost,
                    "safety_stock": cost.policy.safety_stock if cost.policy else 0,
                    "reorder_point": cost.policy.reorder_point if cost.policy else 0,
                    "reorder_quantity": cost.policy.reorder_quantity if cost.policy else 0,
                    "total_inventory_cost": cost.total_inventory_cost,
                    "recommendation": recommendation,
                    "overall_score": 100.0 if recommendation == "Best" else (85.0 if recommendation == "Recommended" else 60.0),
                    "target_service_level": cost.policy.service_level if cost.policy else 95,
                }
            )
            comparison_list.append(comparison)

        saved_comparisons = PolicyComparison.objects.filter(
            Q(product_id=target_product_id) | Q(policy__product_id=target_product_id)
        ).select_related("policy", "cost_analysis", "product").order_by("total_inventory_cost")
        serializer = PolicyComparisonSerializer(saved_comparisons, many=True)
        return Response(
            {
                "message": f"Policy Comparison Completed Successfully for Product ID {target_product_id}",
                "product_id": target_product_id,
                "count": saved_comparisons.count(),
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )


        # Fetch inventory cost analysis data
        cost_list = list(
            InventoryCostAnalysis.objects
            .select_related("policy", "product")
            .all()
            .order_by("policy_id")
        )

        if not cost_list:
            return Response(
                {"message": "Run Inventory Cost Analysis First"},
                status=status.HTTP_400_BAD_REQUEST
            )

        products_map = {}
        for c in cost_list:
            pid = c.product.product_id if c.product else None
            products_map.setdefault(pid, []).append(c)

        comparison_list = []
        for pid, p_costs in products_map.items():
            unique_costs = sorted(list(set(c.total_inventory_cost for c in p_costs)))
            best_cost = unique_costs[0]
            better_cost = unique_costs[1] if len(unique_costs) > 1 else None

            for cost in p_costs:
                if cost.total_inventory_cost == best_cost:
                    recommendation = "Best"
                elif better_cost is not None and cost.total_inventory_cost == better_cost:
                    recommendation = "Recommended"
                else:
                    recommendation = "Not Recommended"

                comparison, _ = PolicyComparison.objects.update_or_create(
                    policy=cost.policy,
                    defaults={
                        "product": cost.product,
                        "cost_analysis": cost,
                        "safety_stock": cost.policy.safety_stock if cost.policy else 0,
                        "reorder_point": cost.policy.reorder_point if cost.policy else 0,
                        "reorder_quantity": cost.policy.reorder_quantity if cost.policy else 0,
                        "total_inventory_cost": cost.total_inventory_cost,
                        "recommendation": recommendation,
                    }
                )
                comparison_list.append(comparison)

        # Delete any comparisons whose policies no longer exist in cost_list
        valid_policy_ids = [c.policy_id for c in cost_list if c.policy_id]
        PolicyComparison.objects.exclude(policy_id__in=valid_policy_ids).delete()

        saved_comparisons = PolicyComparison.objects.select_related("policy", "cost_analysis", "product").all().order_by("total_inventory_cost")

        serializer = PolicyComparisonSerializer(saved_comparisons, many=True)

        return Response(
            {
                "message": "Policy Comparison Completed Successfully",
                "count": saved_comparisons.count(),
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )



class PolicyComparisonByProduct(APIView):
    """
    GET /api/policycomparison/product/<product_id>/ -> Get policy comparisons by Product ID
    """

    def get(self, request, product_id):
        queryset = (
            PolicyComparison.objects
            .filter(Q(product_id=product_id) | Q(policy__product_id=product_id))
            .select_related("policy", "cost_analysis", "product")
            .distinct()
            .order_by("total_inventory_cost")
        )

        if not queryset.exists():
            return Response(
                {
                    "message": f"No policy comparison found for Product ID {product_id}",
                    "data": []
                },
                status=status.HTTP_200_OK
            )

        serializer = PolicyComparisonSerializer(queryset, many=True)
        return Response(
            {
                "message": f"Policy comparison data for Product ID {product_id}",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )


class PolicyComparisonByAdmin(APIView):
    """
    GET /api/policycomparison/admin/<admin_id>/ -> Get policy comparisons by Admin ID
    """

    def get(self, request):
        admin_id = getattr(request.user, 'admin_id', None)
        if admin_id is None:
            return Response({"message": "User is not an admin"}, status=status.HTTP_401_UNAUTHORIZED)
        
        queryset = (
            PolicyComparison.objects
            .filter(
                Q(product__organization__admin_id=admin_id) |
                Q(product__supplier__organization__admin_id=admin_id) |
                Q(policy__product__organization__admin_id=admin_id) |
                Q(policy__product__supplier__organization__admin_id=admin_id)
            )
            .select_related("policy", "cost_analysis", "product")
            .distinct()
            .order_by("total_inventory_cost")
        )

        if not queryset.exists():
            return Response(
                {
                    "message": f"No policy comparison found for Admin ID {admin_id}",
                    "data": []
                },
                status=status.HTTP_200_OK
            )

        serializer = PolicyComparisonSerializer(queryset, many=True)
        return Response(
            {
                "message": f"Policy comparison data for Admin ID {admin_id}",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )