from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from authentication.models import CustomUser
from Organization.models import Organization
from suppliers.models import Supplier
from product.models import Product
from inventorypolicy.models import InventoryPolicy
from probability.models import ProbabilityDistribution
from simulation.models import MonteCarloSimulation
from costanalysis.models import InventoryCostAnalysis


class CostAnalysisApiTests(APITestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="admin_cost@example.com",
            password="testpassword123",
            username="admincostuser",
            role="ADMIN",
            first_name="Admin",
            last_name="User"
        )

        self.org = Organization.objects.create(
            organization_name="Cost Org",
            organization_type="Retail",
            location="City",
            admin=self.user
        )

        self.supplier = Supplier.objects.create(
            supplier_name="Cost Supplier",
            business_type="Wholesale",
            phone="1234567890",
            email="supplier_cost@example.com",
            address="123 Street",
            organization=self.org
        )

        self.product = Product.objects.create(
            product_name="Cost Product",
            category="Electronics",
            unit_price=200.00,
            organization=self.org,
            supplier=self.supplier
        )

        self.policy = InventoryPolicy.objects.create(
            product=self.product,
            service_level=95,
            z_value=1.65,
            average_demand=25.0,
            average_lead_time=3.0,
            annual_demand=750,
            safety_stock=10,
            reorder_point=85,
            reorder_quantity=100,
            ordering_cost=50.0,
            holding_cost=2.5,
            stockout_cost=10.0
        )

        ProbabilityDistribution.objects.create(
            product=self.product,
            demand_value=10,
            demand_frequency=5,
            demand_probability=0.5,
            demand_cumulative_probability=0.5,
            demand_random_interval="00 - 49",
            lead_time_days=2,
            lead_frequency=5,
            lead_probability=0.5,
            lead_cumulative_probability=0.5,
            lead_random_interval="00 - 49"
        )

        # Create MonteCarloSimulation records
        for day in range(1, 6):
            MonteCarloSimulation.objects.create(
                policy=self.policy,
                product=self.product,
                day=day,
                opening_stock=50,
                random_demand=20,
                simulated_demand=10,
                closing_stock=40,
                order_status="Order Placed" if day == 1 else "No"
            )

    def test_calculate_cost_analysis_all(self):
        url = reverse("inventory-cost-analysis")
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", response.data)
        self.assertEqual(InventoryCostAnalysis.objects.count(), 1)

    def test_calculate_cost_analysis_by_policy(self):
        url = reverse("inventory-cost-analysis")
        response = self.client.post(url, {"policy_id": self.policy.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["policy_id"], self.policy.id)
        self.assertEqual(InventoryCostAnalysis.objects.filter(policy=self.policy).count(), 1)

    def test_get_cost_analysis_by_product(self):
        calc_url = reverse("inventory-cost-analysis")
        self.client.post(calc_url, {"policy_id": self.policy.id}, format="json")

        url = reverse("cost-analysis-by-product", kwargs={"product_id": self.product.product_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)

    def test_get_cost_analysis_by_admin(self):
        calc_url = reverse("inventory-cost-analysis")
        self.client.post(calc_url, {"policy_id": self.policy.id}, format="json")

        url = reverse("cost-analysis-by-admin", kwargs={"admin_id": self.user.admin_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)

    def test_get_nonexistent_product(self):
        url = reverse("cost-analysis-by-product", kwargs={"product_id": 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_nonexistent_admin(self):
        url = reverse("cost-analysis-by-admin", kwargs={"admin_id": 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
