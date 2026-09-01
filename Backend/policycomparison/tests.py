from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from authentication.models import CustomUser
from Organization.models import Organization
from suppliers.models import Supplier
from product.models import Product
from inventorypolicy.models import InventoryPolicy
from costanalysis.models import InventoryCostAnalysis
from policycomparison.models import PolicyComparison


class PolicyComparisonApiTests(APITestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="admin_comp@example.com",
            password="testpassword123",
            username="admincompuser",
            role="ADMIN",
            first_name="Admin",
            last_name="User"
        )

        self.org = Organization.objects.create(
            organization_name="Comp Org",
            organization_type="Retail",
            location="City",
            admin=self.user
        )

        self.supplier = Supplier.objects.create(
            supplier_name="Comp Supplier",
            business_type="Wholesale",
            phone="1234567890",
            email="supplier_comp@example.com",
            address="123 Street",
            organization=self.org
        )

        self.product = Product.objects.create(
            product_name="Comp Product",
            category="Electronics",
            unit_price=200.00,
            organization=self.org,
            supplier=self.supplier
        )

        self.policy1 = InventoryPolicy.objects.create(
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

        self.policy2 = InventoryPolicy.objects.create(
            product=self.product,
            service_level=90,
            z_value=1.28,
            average_demand=25.0,
            average_lead_time=3.0,
            annual_demand=750,
            safety_stock=8,
            reorder_point=83,
            reorder_quantity=100,
            ordering_cost=40.0,
            holding_cost=2.0,
            stockout_cost=10.0
        )

        self.cost1 = InventoryCostAnalysis.objects.create(
            product=self.product,
            policy=self.policy1,
            simulation_days=10,
            average_inventory=50.0,
            total_demand=250,
            total_orders=3,
            stockout_quantity=5,
            holding_cost=125.0,
            ordering_cost=150.0,
            stockout_cost=50.0,
            total_inventory_cost=325.0
        )

        self.cost2 = InventoryCostAnalysis.objects.create(
            product=self.product,
            policy=self.policy2,
            simulation_days=10,
            average_inventory=50.0,
            total_demand=250,
            total_orders=3,
            stockout_quantity=5,
            holding_cost=100.0,
            ordering_cost=120.0,
            stockout_cost=50.0,
            total_inventory_cost=270.0
        )

    def test_run_policy_comparison_missing_product_id(self):
        url = reverse("run-policy-comparison")
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product_id is required", response.data["message"])

    def test_run_policy_comparison_by_product(self):
        url = reverse("run-policy-comparison")
        response = self.client.post(url, {"product_id": self.product.product_id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", response.data)
        self.assertEqual(response.data["product_id"], self.product.product_id)
        self.assertEqual(PolicyComparison.objects.filter(product=self.product).count(), 2)

    def test_get_policy_comparison_by_product(self):
        # Run comparison first
        run_url = reverse("run-policy-comparison")
        self.client.post(run_url, {"product_id": self.product.product_id}, format="json")

        url = reverse("policy-comparison-by-product", kwargs={"product_id": self.product.product_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 2)

    def test_get_policy_comparison_by_admin(self):
        run_url = reverse("run-policy-comparison")
        self.client.post(run_url, {"product_id": self.product.product_id}, format="json")

        url = reverse("policy-comparison-by-admin", kwargs={"admin_id": self.user.admin_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 2)

    def test_get_nonexistent_product(self):
        url = reverse("policy-comparison-by-product", kwargs={"product_id": 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_nonexistent_admin(self):
        url = reverse("policy-comparison-by-admin", kwargs={"admin_id": 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
