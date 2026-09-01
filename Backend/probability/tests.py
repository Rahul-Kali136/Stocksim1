from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import CustomUser
from Organization.models import Organization
from suppliers.models import Supplier
from product.models import Product
from inventory.models import Inventory
from probability.models import ProbabilityDistribution


class ProbabilityApiTests(APITestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="admin@example.com",
            password="testpassword123",
            username="adminuser",
            role="ADMIN",
            first_name="Admin",
            last_name="User"
        )

        self.org = Organization.objects.create(
            organization_name="Test Org",
            organization_type="Retail",
            location="Test City",
            admin=self.user
        )

        self.supplier = Supplier.objects.create(
            supplier_name="Test Supplier",
            business_type="Wholesale",
            phone="1234567890",
            email="supplier@example.com",
            address="123 Main St",
            organization=self.org
        )

        self.product = Product.objects.create(
            product_name="Test Product",
            category="Gadgets",
            unit_price=100.00,
            organization=self.org,
            supplier=self.supplier
        )

        # Create inventory data
        Inventory.objects.create(
            product=self.product,
            date="2026-01-01",
            demand=10,
            order_no="ORD001",
            lead_time=2
        )
        Inventory.objects.create(
            product=self.product,
            date="2026-01-02",
            demand=10,
            order_no="ORD002",
            lead_time=2
        )
        Inventory.objects.create(
            product=self.product,
            date="2026-01-03",
            demand=20,
            order_no="ORD003",
            lead_time=4
        )

    def test_generate_probability(self):
        url = reverse("generate-probability")
        response = self.client.post(url, {"product_id": self.product.product_id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", response.data)
        self.assertEqual(ProbabilityDistribution.objects.count(), response.data["count"])

    def test_get_probability_by_product(self):
        # Generate probability first
        gen_url = reverse("generate-probability")
        self.client.post(gen_url, {"product_id": self.product.product_id}, format="json")

        # Fetch by product
        url = reverse("probability-by-product", kwargs={"product_id": self.product.product_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), ProbabilityDistribution.objects.count())

    def test_delete_probability_by_product(self):
        # Generate probability first
        gen_url = reverse("generate-probability")
        self.client.post(gen_url, {"product_id": self.product.product_id}, format="json")

        # Delete by product
        url = reverse("probability-by-product", kwargs={"product_id": self.product.product_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ProbabilityDistribution.objects.filter(product=self.product).count(), 0)
