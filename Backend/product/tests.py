from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from Organization.models import Organization
from suppliers.models import Supplier
from product.models import Product

User = get_user_model()

class ProductAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123"
        )
        self.client.force_authenticate(user=self.user)

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
            address="123 Street",
            organization=self.org
        )
        self.product1 = Product.objects.create(
            product_name="Product 1",
            category="Cat 1",
            unit_price="10.00",
            organization=self.org,
            supplier=self.supplier
        )
        self.product2 = Product.objects.create(
            product_name="Product 2",
            category="Cat 2",
            unit_price="20.00",
            organization=self.org,
            supplier=self.supplier
        )

    def test_get_product_by_id(self):
        # Requesting /api/product/<product_id>/ should return that exact product
        url = f"/api/product/{self.product1.product_id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertEqual(response.data["product_id"], self.product1.product_id)
        self.assertEqual(response.data["product_name"], "Product 1")

    def test_get_product_by_id_for_other_admin_returns_404(self):
        other_user = User.objects.create_user(
            username="otheradmin",
            email="otheradmin@example.com",
            password="password123"
        )
        other_org = Organization.objects.create(
            organization_name="Other Org",
            organization_type="Wholesale",
            location="Other City",
            admin=other_user,
        )
        other_supplier = Supplier.objects.create(
            supplier_name="Other Supplier",
            business_type="Wholesale",
            phone="1111111111",
            email="other-supplier@example.com",
            address="Other Street",
            organization=other_org,
        )
        other_product = Product.objects.create(
            product_name="Other Product",
            category="Other",
            unit_price="99.99",
            organization=other_org,
            supplier=other_supplier,
        )

        url = f"/api/product/{other_product.product_id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_filter_by_supplier_id_query_param(self):
        url = f"/api/product/?supplier_id={self.supplier.supplier_id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_product(self):
        url = "/api/product/"
        payload = {
            "product_name": "New Product",
            "category": "Electronics",
            "unit_price": "50.00",
            "supplier_id": self.supplier.supplier_id,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["supplier_id"], self.supplier.supplier_id)
        self.assertEqual(response.data["organization_id"], self.org.organization_id)

    def test_create_product_without_supplier_and_organization(self):
        url = "/api/product/"
        payload = {
            "product_name": "Red Velvet Cake",
            "category": "Bakery",
            "unit_price": "65.00",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organization_id"], self.org.organization_id)
        self.assertEqual(response.data["supplier_id"], self.supplier.supplier_id)

    def test_product_creation_auto_updates_supplier_product_reference(self):
        product = Product.objects.create(
            product_name="Auto-linked Product",
            category="Food",
            unit_price="12.50",
            organization=self.org,
            supplier=self.supplier,
        )

        self.supplier.refresh_from_db()
        self.assertEqual(self.supplier.product_id, product.product_id)


