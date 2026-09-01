from product.models import Product
from simulation.models import MonteCarloSimulation
from costanalysis.models import InventoryCostAnalysis
from policycomparison.models import PolicyComparison
from inventorysummary.models import InventorySummary


class DashboardService:

    @staticmethod
    def get_total(value):
        """
        Converts JSONField values into a numeric total.
        Handles list, int, float and None.
        """
        if value is None:
            return 0

        if isinstance(value, list):
            total = 0
            for item in value:
                try:
                    total += float(item)
                except (TypeError, ValueError):
                    continue
            return total

        try:
            return float(value)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def get_average(value):
        """
        Returns average of JSONField list.
        """
        if isinstance(value, list) and len(value) > 0:
            numeric = []

            for item in value:
                try:
                    numeric.append(float(item))
                except (TypeError, ValueError):
                    pass

            if numeric:
                return sum(numeric) / len(numeric)

        return 0

    @staticmethod
    def get_dashboard_summary(organization):

        total_products = Product.objects.filter(
            organization=organization
        ).count()

        total_simulations = MonteCarloSimulation.objects.filter(
            product__organization=organization
        ).count()

        analyses = InventoryCostAnalysis.objects.filter(
            product__organization=organization
        )

        total_inventory_cost = 0

        for analysis in analyses:
            total_inventory_cost += (
                float(analysis.holding_cost or 0)
                + float(analysis.ordering_cost or 0)
                + float(analysis.stockout_cost or 0)
            )

        return {
            "total_products": total_products,
            "total_simulations": total_simulations,
            "total_inventory_cost": round(total_inventory_cost, 2),
        }

    @staticmethod
    def inventory_summary(organization):

        summaries = InventorySummary.objects.filter(
            organization=organization
        )

        data = []

        for item in summaries:

            data.append({
                "product": item.product.product_name,
                "opening_stock": item.opening_stock,
                "closing_stock": item.closing_stock,
                "total_demand": item.total_demand,
                "total_orders": item.total_orders,
                "stockout_days": item.stockout_days,
                "inventory_cost": item.inventory_cost,
                "average_inventory": item.average_inventory,
                "service_level": item.service_level,
            })

        return data

    @staticmethod
    def statistics(organization):

        simulations = MonteCarloSimulation.objects.filter(
            product__organization=organization
        )

        total_demand = 0
        total_orders = 0
        total_stockout = 0
        closing_stock_average = []

        for sim in simulations:

            total_demand += DashboardService.get_total(
                sim.simulated_demand
            )

            total_orders += DashboardService.get_total(
                sim.order_status
            )

            total_stockout += DashboardService.get_total(
                sim.stock_received
            )

            if isinstance(sim.closing_stock, list):
                closing_stock_average.extend(sim.closing_stock)

        average_closing_stock = 0

        if closing_stock_average:
            average_closing_stock = (
                sum(closing_stock_average)
                / len(closing_stock_average)
            )

        return {

            "total_demand": total_demand,

            "total_orders": total_orders,

            "average_closing_stock": round(
                average_closing_stock,
                2
            ),

            "stock_received": total_stockout

        }

    @staticmethod
    def recent_simulations(organization):

        simulations = MonteCarloSimulation.objects.filter(
            product__organization=organization
        ).order_by("-created_at")[:10]

        data = []

        for sim in simulations:

            from costanalysis.models import InventoryCostAnalysis
            cost = InventoryCostAnalysis.objects.filter(product=sim.product).order_by("-id").first()
            total_cost = cost.total_inventory_cost if cost else 0.0
            
            # Count the number of stockout days in closing stock array
            stockout_days = 0
            days_count = len(sim.closing_stock) if sim.closing_stock else 0
            if sim.closing_stock:
                stockout_days = sum(1 for cs in sim.closing_stock if cs <= 0)
            stockout_risk = (stockout_days / days_count * 100) if days_count > 0 else (100.0 - (sim.policy.service_level if sim.policy else 95.0))

            data.append({

                "id": sim.id,

                "product": (
                    sim.product.product_name
                    if sim.product else None
                ),

                "policy": (
                    str(sim.policy)
                    if sim.policy else None
                ),

                "days": sim.simulation_days or (len(sim.day) if sim.day else 30),

                "rop": round(sim.policy.reorder_point, 1) if sim.policy else 0,
                
                "roq": round(sim.policy.reorder_quantity, 1) if sim.policy else 0,

                "service_level": round(sim.policy.service_level, 1) if sim.policy else 95.0,

                "stockout_risk": round(stockout_risk, 1),

                "total_cost": total_cost,

                "simulated_demand": sim.simulated_demand,

                "opening_stock": sim.opening_stock,

                "closing_stock": sim.closing_stock,

                "order_status": sim.order_status,

                "created_at": sim.created_at

            })

        return data

    @staticmethod
    def top_products(organization):

        products = Product.objects.filter(
            organization=organization
        )

        result = []

        for product in products:

            total_demand = 0

            simulations = MonteCarloSimulation.objects.filter(
                product=product
            )

            for sim in simulations:

                total_demand += DashboardService.get_total(
                    sim.simulated_demand
                )

            result.append({

                "product": product.product_name,

                "total_demand": total_demand

            })

        result.sort(
            key=lambda x: x["total_demand"],
            reverse=True
        )

        return result[:5]

    @staticmethod
    def best_policy(organization):

        policies = PolicyComparison.objects.filter(
            product__organization=organization
        ).order_by("total_inventory_cost")

        data = []

        for policy in policies:

            data.append({

                "product": (
                    policy.product.product_name
                    if policy.product else None
                ),

                "policy_id": policy.id,

                "total_cost": float(
                    policy.total_inventory_cost or 0
                ),

                "recommendation": policy.recommendation

            })

        return data