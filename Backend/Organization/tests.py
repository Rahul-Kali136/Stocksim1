from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from Organization.models import Organization

User = get_user_model()


class OrganizationAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="orguser",
            email="orguser@example.com",
            password="password123"
        )
        self.client.force_authenticate(user=self.user)

        self.organization = Organization.objects.create(
            organization_name="Main Org",
            organization_type="Retail",
            location="City A",
            admin=self.user,
        )

    def test_get_organization_by_id(self):
        url = f"/api/organization/{self.organization.organization_id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["organization_id"], self.organization.organization_id)
        self.assertEqual(response.data[0]["organization_name"], "Main Org")

    def test_get_organization_by_id_allows_public_access(self):
        other_user = User.objects.create_user(
            username="otheradmin",
            email="otheradmin@example.com",
            password="password123"
        )
        other_org = Organization.objects.create(
            organization_name="Other Org",
            organization_type="Wholesale",
            location="City B",
            admin=other_user,
        )

        url = f"/api/organization/{other_org.organization_id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["organization_name"], "Other Org")
