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


class SimulationApiTests(APITestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="admin_sim@example.com",
            password="testpassword123",
            username="adminsimuser",
            role="ADMIN",
            first_name="Admin",
            last_name="User"
        )

        self.org = Organization.objects.create(
            organization_name="Sim Org",
            organization_type="Retail",
            location="City",
            admin=self.user
        )

        self.supplier = Supplier.objects.create(
            supplier_name="Sim Supplier",
            business_type="Wholesale",
            phone="1234567890",
            email="supplier_sim@example.com",
            address="123 Street",
            organization=self.org
        )

        self.product = Product.objects.create(
            product_name="Sim Product",
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

    def test_run_simulation(self):
        url = reverse("run-simulation")
        payload = {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", response.data)
        self.assertEqual(response.data["simulation_days"], 5)
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)
        sim_data = response.data["data"][0]
        self.assertEqual(len(sim_data["day"]), 5)

    def test_get_simulation_by_policy(self):
        # Run simulation first
        run_url = reverse("run-simulation")
        self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }, format="json")

        policy_url = reverse("simulation-by-policy", kwargs={"policy_id": self.policy.id})
        response = self.client.get(policy_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(len(response.data["data"][0]["day"]), 5)

    def test_get_simulation_by_admin(self):
        # Run simulation first
        run_url = reverse("run-simulation")
        self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }, format="json")

        admin_url = reverse("simulation-by-admin", kwargs={"admin_id": self.user.admin_id})
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(len(response.data["data"][0]["day"]), 5)

    def test_get_simulation_by_nonexistent_policy(self):
        policy_url = reverse("simulation-by-policy", kwargs={"policy_id": 99999})
        response = self.client.get(policy_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_simulation_by_nonexistent_admin(self):
        admin_url = reverse("simulation-by-admin", kwargs={"admin_id": 99999})
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_edit_simulation_by_policy(self):
        # Run simulation first with 5 days
        run_url = reverse("run-simulation")
        self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }, format="json")

        edit_url = reverse("edit-simulation-id", kwargs={"policy_id": self.policy.id})
        payload = {
            "simulation_days": 12,
            "opening_stock": 80
        }
        response = self.client.put(edit_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["simulation_days"], 12)
        self.assertEqual(response.data["opening_stock"], 80)
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)
        self.assertEqual(len(response.data["data"][0]["day"]), 12)

    def test_rerun_simulation_on_same_policy_returns_already_run(self):
        # Initial run
        run_url = reverse("run-simulation")
        self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }, format="json")
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)

        # Re-run simulation on same policy_id via POST run/ should return 400 Bad Request with message
        rerun_response = self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 7,
            "opening_stock": 60
        }, format="json")
        self.assertEqual(rerun_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already run", rerun_response.data["message"])

        # Update via Edit API works
        edit_url = reverse("edit-simulation-id", kwargs={"policy_id": self.policy.id})
        edit_response = self.client.put(edit_url, {
            "simulation_days": 7,
            "opening_stock": 60
        }, format="json")
        self.assertEqual(edit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)
        self.assertEqual(len(edit_response.data["data"][0]["day"]), 7)

    def test_edit_simulation_generic_endpoint(self):
        run_url = reverse("run-simulation")
        self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }, format="json")

        edit_url = reverse("edit-simulation")
        # Edit via POST
        response_post = self.client.post(edit_url, {
            "policy": {"id": self.policy.id},
            "simulation_days": 8,
            "opening_stock": 70
        }, format="json")
        self.assertEqual(response_post.status_code, status.HTTP_200_OK)
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)
        self.assertEqual(len(response_post.data["data"][0]["day"]), 8)

        # Edit via PATCH
        response_patch = self.client.patch(edit_url, {
            "policy_id": self.policy.id,
            "simulation_days": 10,
            "opening_stock": 90
        }, format="json")
        self.assertEqual(response_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)
        self.assertEqual(len(response_patch.data["data"][0]["day"]), 10)

    def test_delete_simulation_by_policy(self):
        run_url = reverse("run-simulation")
        self.client.post(run_url, {
            "policy_id": self.policy.id,
            "simulation_days": 5,
            "opening_stock": 50
        }, format="json")
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 1)

        policy_url = reverse("simulation-by-policy", kwargs={"policy_id": self.policy.id})
        del_response = self.client.delete(policy_url)
        self.assertEqual(del_response.status_code, status.HTTP_200_OK)
        self.assertEqual(MonteCarloSimulation.objects.filter(policy=self.policy).count(), 0)


