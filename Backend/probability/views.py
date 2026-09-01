from collections import Counter
from django.db import connection

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from inventory.models import Inventory
from product.models import Product

from .models import ProbabilityDistribution
from .serializers import ProbabilityDistributionSerializer


def reset_probability_sequence():
    """
    Resets the probability_distribution table auto-increment sequence based on existing IDs.
    If table is empty, resets next auto_increment sequence to 1.
    If table is not empty, resets next auto_increment sequence to MAX(probability_id) + 1.
    """
    try:
        with connection.cursor() as cursor:
            engine = connection.vendor
            if engine == 'mysql':
                cursor.execute("SELECT COALESCE(MAX(probability_id), 0) FROM probability_distribution;")
                max_id = cursor.fetchone()[0]
                next_id = max_id + 1 if max_id > 0 else 1
                cursor.execute(f"ALTER TABLE probability_distribution AUTO_INCREMENT = {next_id};")
            elif engine == 'sqlite':
                cursor.execute("SELECT COALESCE(MAX(probability_id), 0) FROM probability_distribution;")
                max_id = cursor.fetchone()[0]
                cursor.execute("UPDATE sqlite_sequence SET seq = %s WHERE name = 'probability_distribution';", [max_id])
            elif engine == 'postgresql':
                cursor.execute("SELECT setval(pg_get_serial_sequence('probability_distribution', 'probability_id'), COALESCE(max(probability_id), 1), max(probability_id) IS NOT NULL) FROM probability_distribution;")
    except Exception:
        pass


class GenerateProbability(APIView):

    def post(self, request):

        product_id = request.data.get("product_id")

        if not product_id:
            return Response(
                {"message": "product_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = Product.objects.get(product_id=product_id)

        except Product.DoesNotExist:
            return Response(
                {"message": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        inventory = Inventory.objects.filter(product=product)

        if not inventory.exists():

            return Response(
                {"message": "Inventory not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        ProbabilityDistribution.objects.filter(
            product=product
        ).delete()
        reset_probability_sequence()

        demand = []
        lead = []
        for inv in inventory:
            if isinstance(inv.demand, list):
                demand.extend(inv.demand)
            elif inv.demand is not None:
                demand.append(inv.demand)

            if isinstance(inv.lead_time, list):
                lead.extend(inv.lead_time)
            elif inv.lead_time is not None:
                lead.append(inv.lead_time)

        demand_counter = Counter(demand)
        lead_counter = Counter(lead)

        total_demand = len(demand)
        total_lead = len(lead)

        demand_values = []
        demand_frequency = []
        demand_probability = []
        demand_cp = []
        demand_interval = []

        cp = 0
        start = 0

        for value in sorted(demand_counter.keys()):

            freq = demand_counter[value]

            prob = round(freq / total_demand, 3)

            cp += prob

            end = round(cp * 100) - 1

            if end < start:
                end = start

            demand_values.append(value)
            demand_frequency.append(freq)
            demand_probability.append(prob)
            demand_cp.append(round(cp, 3))
            demand_interval.append(f"{start}-{end}")

            start = end + 1

        lead_values = []
        lead_frequency = []
        lead_probability = []
        lead_cp = []
        lead_interval = []

        cp = 0
        start = 0

        for value in sorted(lead_counter.keys()):

            freq = lead_counter[value]

            prob = round(freq / total_lead, 3)

            cp += prob

            end = round(cp * 100) - 1

            if end < start:
                end = start

            lead_values.append(value)
            lead_frequency.append(freq)
            lead_probability.append(prob)
            lead_cp.append(round(cp, 3))
            lead_interval.append(f"{start}-{end}")

            start = end + 1

        probability = ProbabilityDistribution.objects.create(

            product=product,

            demand_value=demand_values,
            demand_frequency=demand_frequency,
            demand_probability=demand_probability,
            demand_cumulative_probability=demand_cp,
            demand_random_interval=demand_interval,

            lead_time_days=lead_values,
            lead_frequency=lead_frequency,
            lead_probability=lead_probability,
            lead_cumulative_probability=lead_cp,
            lead_random_interval=lead_interval,

        )

        serializer = ProbabilityDistributionSerializer(probability)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class ProbabilityDistributionByProduct(APIView):

    def get(self, request, product_id):

        try:

            probability = ProbabilityDistribution.objects.get(
                product_id=product_id
            )

        except ProbabilityDistribution.DoesNotExist:

            return Response(
                {
                    "message": "Probability not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProbabilityDistributionSerializer(probability)

        return Response(serializer.data)

    def delete(self, request, product_id):

        deleted = ProbabilityDistribution.objects.filter(
            product_id=product_id
        ).delete()

        if deleted[0] == 0:

            return Response(
                {
                    "message": "Probability not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        reset_probability_sequence()

        return Response(
            {
                "message": "Deleted Successfully"
            },
            status=status.HTTP_200_OK
        )