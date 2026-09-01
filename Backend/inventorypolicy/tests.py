from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import CustomUser
from Organization.models import Organization
from suppliers.models import Supplier
from product.models import Product
from inventory.models import Inventory
from inventorypolicy.models import InventoryPolicy


class InventoryPolicyApiTests(APITestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="admin_policy@example.com",
            password="testpassword123",
            username="adminpolicyuser",
            role="ADMIN",
            first_name="Admin",
            last_name="User"
        )

        self.org = Organization.objects.create(
            organization_name="Policy Org",
            organization_type="Retail",
            location="City",
            admin=self.user
        )

        self.supplier = Supplier.objects.create(
            supplier_name="Policy Supplier",
            business_type="Wholesale",
            phone="1234567890",
            email="supplier_pol@example.com",
            address="123 Street",
            organization=self.org
        )

        self.product = Product.objects.create(
            product_name="Policy Product",
            category="Gadgets",
            unit_price=150.00,
            organization=self.org,
            supplier=self.supplier
        )

        Inventory.objects.create(
            product=self.product,
            date="2026-01-01",
            demand=20,
            order_no="ORD101",
            lead_time=3
        )
        Inventory.objects.create(
            product=self.product,
            date="2026-01-02",
            demand=30,
            order_no="ORD102",
            lead_time=3
        )
        Inventory.objects.create(
            product=self.product,
            date="2026-01-03",
            demand=25,
            order_no="ORD103",
            lead_time=3
        )

    def test_calculate_and_save_policy(self):
        url = reverse("calculate-policy")
        payload = {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", response.data)
        self.assertEqual(response.data["data"]["service_level"], 95)
        self.assertEqual(InventoryPolicy.objects.count(), 1)

    def test_get_policies_by_admin(self):
        # First calculate a policy
        calc_url = reverse("calculate-policy")
        self.client.post(calc_url, {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }, format="json")

        admin_url = reverse("policy-by-admin", kwargs={"admin_id": self.user.admin_id})
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_policies_by_admin(self):
        # First calculate a policy
        calc_url = reverse("calculate-policy")
        self.client.post(calc_url, {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }, format="json")

        admin_url = reverse("policy-by-admin", kwargs={"admin_id": self.user.admin_id})
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_all_policies_by_product(self):
        calc_url = reverse("calculate-policy")
        self.client.post(calc_url, {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }, format="json")

        all_url = reverse("policy-by-product-all", kwargs={"product_id": self.product.product_id})
        response = self.client.get(all_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_calculate_creates_new_pk_each_time(self):
        url = reverse("calculate-policy")
        payload = {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }
        res1 = self.client.post(url, payload, format="json")
        pk1 = res1.data["data"]["id"]

        res2 = self.client.post(url, payload, format="json")
        pk2 = res2.data["data"]["id"]

        self.assertNotEqual(pk1, pk2)
        self.assertEqual(InventoryPolicy.objects.filter(product=self.product).count(), 2)

    def test_get_policy_by_pk(self):
        calc_url = reverse("calculate-policy")
        res = self.client.post(calc_url, {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }, format="json")
        pk = res.data["data"]["id"]

        detail_url = reverse("policy-detail-pk", kwargs={"pk": pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], pk)

    def test_put_policy_by_pk(self):
        calc_url = reverse("calculate-policy")
        res = self.client.post(calc_url, {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }, format="json")
        pk = res.data["data"]["id"]

        edit_url = reverse("edit-policy-pk", kwargs={"pk": pk})
        response = self.client.put(edit_url, {
            "service_level": 99,
            "ordering_cost": 100.0,
            "holding_cost": 5.0,
            "stockout_cost": 15.0
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["service_level"], 99)

    def test_delete_policy_by_pk(self):
        calc_url = reverse("calculate-policy")
        res = self.client.post(calc_url, {
            "product_id": self.product.product_id,
            "service_level": 95,
            "ordering_cost": 50.0,
            "holding_cost": 2.5,
            "stockout_cost": 10.0
        }, format="json")
        pk = res.data["data"]["id"]

        delete_url = reverse("delete-policy-pk", kwargs={"pk": pk})
        response = self.client.delete(delete_url)
        self.assertFalse(InventoryPolicy.objects.filter(pk=pk).exists())









