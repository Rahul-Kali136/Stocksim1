from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from Organization.models import Organization
from suppliers.models import Supplier

User = get_user_model()


class SupplierListAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="supplieradmin",
            email="supplieradmin@example.com",
            password="StrongPass123!",
        )
        self.organization = Organization.objects.create(
            organization_name="Test Org",
            organization_type="Retail",
            location="New York",
            admin=self.user,
        )
        self.supplier = Supplier.objects.create(
            supplier_name="Acme Supply",
            business_type="Wholesale",
            phone="1234567890",
            email="acme@example.com",
            address="123 Main St",
            organization=self.organization,
        )

    def test_get_all_suppliers_when_user_has_no_org_filter(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/suppliers/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["supplier_name"], self.supplier.supplier_name)

    def test_get_supplier_by_id_for_other_admin_returns_404(self):
        other_user = User.objects.create_user(
            username="otheradmin",
            email="otheradmin@example.com",
            password="StrongPass123!",
        )
        other_org = Organization.objects.create(
            organization_name="Other Org",
            organization_type="Wholesale",
            location="Chicago",
            admin=other_user,
        )
        other_supplier = Supplier.objects.create(
            supplier_name="Other Supplier",
            business_type="Retail",
            phone="9876543210",
            email="other@example.com",
            address="456 Side St",
            organization=other_org,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/suppliers/{other_supplier.supplier_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
