import os
import django
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stocksim.settings')
django.setup()

from django.test import RequestFactory
from Organization.views import OrganizationListCreateView
from authentication.models import CustomUser
from rest_framework_simplejwt.authentication import JWTAuthentication

user = CustomUser.objects.first()

# Mock JWT authentication to return the user
def mock_authenticate(self, request):
    return (user, None)

JWTAuthentication.authenticate = mock_authenticate

factory = RequestFactory()
request = factory.post('/api/organization/', {
    # Missing organization_name, organization_type, etc.
}, content_type='application/json')

view = OrganizationListCreateView.as_view()
try:
    response = view(request)
    print("Response Status:", response.status_code)
    print("Response Data:", response.data)
except Exception as e:
    import traceback
    print("Exception occurred:")
    traceback.print_exc()
