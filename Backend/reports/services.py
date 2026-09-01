from product.models import Product
from simulation.models import MonteCarloSimulation
from costanalysis.models import InventoryCostAnalysis
from inventorypolicy.models import InventoryPolicy
from policycomparison.models import PolicyComparison



class ReportsService:


    @staticmethod
    def inventory_report(organization):

        products = Product.objects.filter(
            organization=organization
        )


        data = []


        for product in products:


            simulations = MonteCarloSimulation.objects.filter(
                product=product
            )


            total_demand = 0

            closing_stock_values = []


            for sim in simulations:


                try:

                    if isinstance(
                        sim.simulated_demand,
                        (int,float)
                    ):

                        total_demand += sim.simulated_demand


                except:

                    pass



                try:

                    closing_stock_values.append(
                        float(sim.closing_stock)
                    )

                except:

                    pass



            average_inventory = 0


            if closing_stock_values:

                average_inventory = (

                    sum(closing_stock_values)

                    /

                    len(closing_stock_values)

                )



            opening_stock = 0


            first_simulation = simulations.order_by(
                "day"
            ).first()



            if first_simulation:

                opening_stock = first_simulation.opening_stock



            data.append({

                "product_id":
                    product.product_id,


                "product_name":
                    product.product_name,


                "category":
                    product.category,


                "opening_stock":
                    opening_stock,


                "total_demand":
                    total_demand,


                "average_inventory":
                    round(
                        average_inventory,
                        2
                    )

            })


        return data




    @staticmethod
    def simulation_report(organization):


        simulations = MonteCarloSimulation.objects.filter(
            product__organization=organization
        )


        data=[]


        for sim in simulations:


            data.append({

                "simulation_id":
                    sim.id,


                "product":
                    sim.product.product_name,


                "day":
                    sim.day,


                "opening_stock":
                    sim.opening_stock,


                "random_demand":
                    sim.random_demand,


                "simulated_demand":
                    sim.simulated_demand,


                "closing_stock":
                    sim.closing_stock,


                "order_status":
                    sim.order_status,


                "random_lead":
                    sim.random_lead,


                "simulated_lead":
                    sim.simulated_lead,


                "arrival_day":
                    sim.arrival_day,


                "stock_received":
                    sim.stock_received

            })


        return data





    @staticmethod
    def cost_report(organization):


        costs = InventoryCostAnalysis.objects.filter(
            product__organization=organization
        )


        data=[]


        for cost in costs:


            total_cost = (

                cost.holding_cost +

                cost.ordering_cost +

                cost.stockout_cost

            )


            data.append({

                "id":
                    cost.id,


                "product":
                    cost.product.product_name,


                "holding_cost":
                    cost.holding_cost,


                "ordering_cost":
                    cost.ordering_cost,


                "stockout_cost":
                    cost.stockout_cost,


                "total_cost":
                    round(total_cost,2)

            })


        return data





    @staticmethod
    def policy_report(organization):


        policies = InventoryPolicy.objects.filter(
            product__organization=organization
        )


        data=[]


        for policy in policies:


            total_cost=(

                policy.holding_cost+

                policy.ordering_cost+

                policy.stockout_cost

            )


            data.append({

                "id":
                    policy.id,


                "product":
                    policy.product.product_name,


                "service_level":
                    policy.service_level,


                "z_value":
                    policy.z_value,


                "average_demand":
                    policy.average_demand,


                "average_lead_time":
                    policy.average_lead_time,


                "safety_stock":
                    policy.safety_stock,


                "reorder_point":
                    policy.reorder_point,


                "reorder_quantity":
                    policy.reorder_quantity,


                "annual_demand":
                    policy.annual_demand,


                "total_cost":
                    round(total_cost,2),


                "created_at":
                    policy.created_at

            })


        return data






    @staticmethod
    def policy_comparison_report(organization):


        comparisons = PolicyComparison.objects.filter(
            product__organization=organization
        )


        data=[]


        for item in comparisons:


            data.append({

                "id":
                    item.id,


                "product":
                    item.product.product_name,


                "safety_stock":
                    item.safety_stock,


                "reorder_point":
                    item.reorder_point,


                "reorder_quantity":
                    item.reorder_quantity,


                "total_inventory_cost":
                    item.total_inventory_cost,


                "recommendation":
                    item.recommendation

            })


        return data