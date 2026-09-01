from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'plans', views.SubscriptionPlanViewSet, basename='plans')
router.register(r'invoices', views.InvoiceViewSet, basename='invoices')
router.register(r'payments', views.PaymentViewSet, basename='payments')

urlpatterns = [
    path('subscriptions/current/', views.current_subscription, name='current-subscription'),
    path('current/', views.current_subscription, name='current-subscription-fallback'),
    path('payments/charge/', views.charge_payment, name='charge-payment'),
    path('payments/verify/', views.verify_payment, name='verify-payment'),
    path('invoices/<int:pk>/pdf/', views.download_invoice_pdf, name='download-invoice-pdf'),
    path('', include(router.urls)),
]