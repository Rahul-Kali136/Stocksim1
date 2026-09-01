from inventorysummary.models import InventorySummary
from simulation.models import MonteCarloSimulation
from costanalysis.models import InventoryCostAnalysis


class InventorySummaryService:

    @staticmethod
    def generate_summary(product):

        simulation = (
            MonteCarloSimulation.objects.filter(product=product)
            .order_by("-id")
            .first()
        )

        cost = (
            InventoryCostAnalysis.objects.filter(product=product)
            .order_by("-id")
            .first()
        )

        opening_stock = 0
        closing_stock = 0
        total_demand = 0
        total_orders = 0
        stockout_days = 0
        average_inventory = 0
        inventory_cost = 0
        service_level = 0

        if simulation:

            # Opening Stock
            if isinstance(simulation.opening_stock, list):
                if len(simulation.opening_stock) > 0:
                    opening_stock = simulation.opening_stock[0]

            # Closing Stock
            if isinstance(simulation.closing_stock, list):
                if len(simulation.closing_stock) > 0:
                    closing_stock = simulation.closing_stock[-1]
                    average_inventory = (
                        sum(simulation.closing_stock)
                        / len(simulation.closing_stock)
                    )

            # Total Demand
            if isinstance(simulation.simulated_demand, list):
                total_demand = sum(simulation.simulated_demand)

            # Total Orders
            if isinstance(simulation.order_status, list):
                total_orders = sum(
                    1
                    for x in simulation.order_status
                    if str(x).lower() != "no order"
                )

            # Stockout Days
            if isinstance(simulation.closing_stock, list):
                stockout_days = sum(
                    1
                    for x in simulation.closing_stock
                    if x <= 0
                )

            if isinstance(simulation.simulated_demand, list):

                days = len(simulation.simulated_demand)

                if days > 0:
                    service_level = (
                        (days - stockout_days)
                        / days
                    ) * 100

        if cost:
            inventory_cost = cost.total_inventory_cost

        summary, created = InventorySummary.objects.update_or_create(
            product=product,
            defaults={
                "organization": product.organization,
                "opening_stock": opening_stock,
                "closing_stock": closing_stock,
                "total_demand": total_demand,
                "total_orders": total_orders,
                "stockout_days": stockout_days,
                "inventory_cost": inventory_cost,
                "average_inventory": average_inventory,
                "service_level": service_level,
            },
        )

        return summary

    @staticmethod
    def generate_all():

        from product.models import Product

        for product in Product.objects.all():
            InventorySummaryService.generate_summary(product)