import os
import django
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stocksim.settings')
django.setup()

from django.test import RequestFactory
from product.views import ProductBulkUploadView
from authentication.models import CustomUser
from rest_framework_simplejwt.authentication import JWTAuthentication

user = CustomUser.objects.first()

# Mock JWT authentication to return the user
def mock_authenticate(self, request):
    return (user, None)

JWTAuthentication.authenticate = mock_authenticate

factory = RequestFactory()
request = factory.post('/api/product/bulk-upload/', [
    {
        'name': 'Test Bulk Cupcake',
        'category': 'Bakery',
        'supplier': 'FreshDairy Ltd.',
        'organization': 'Golden Crust Foods',
        'unit_price': 150,
        'ordering_cost': 300,
        'service_level': 90,
        'stockout_cost': 30,
        'holding_cost': 1,
        'opening_stock': 200
    }
], content_type='application/json', HTTP_AUTHORIZATION='Bearer mocktoken')

view = ProductBulkUploadView.as_view()
try:
    response = view(request)
    print("Response Status:", response.status_code)
    print("Response Data:", response.data)
except Exception as e:
    import traceback
    print("Exception occurred:")
    traceback.print_exc()
