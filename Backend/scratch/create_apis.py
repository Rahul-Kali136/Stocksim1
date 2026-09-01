import os

serializers_code = """
from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, Invoice, Payment, Usage

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ('registration',)

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('registration',)

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('registration',)

class UsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = '__all__'
        read_only_fields = ('registration',)
"""

views_code = """
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse
import datetime
from django.db import transaction

from .models import SubscriptionPlan, Subscription, Payment, Invoice, Usage
from .serializers import SubscriptionPlanSerializer, SubscriptionSerializer, InvoiceSerializer, PaymentSerializer
from .services import gst_service, razorpay_service, invoice_service, usage_service

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    # In production, you'd restrict POST/PUT/DELETE to Admin

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Invoice.objects.filter(registration=self.request.user)

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(registration=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_subscription(request):
    usage = Usage.objects.filter(registration=request.user).first()
    sub = Subscription.objects.filter(registration=request.user, status='ACTIVE').first()
    
    data = {
        'plan': sub.plan.name if sub else 'FREE',
        'status': sub.status if sub else 'ACTIVE',
        'invoice_date': sub.invoice_date.strftime('%Y-%m-%d') if sub else None,
        'renewal_date': sub.renewal_date.strftime('%Y-%m-%d') if sub else None,
        'run_limit': usage.allowed_runs if usage else 3,
        'used_runs': usage.used_runs if usage else 0,
        'remaining_runs': usage.remaining_runs if usage else 3,
    }
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def charge_payment(request):
    plan_id = request.data.get('plan_id')
    if not plan_id:
        return Response({'success': False, 'message': 'Plan ID required'}, status=400)
        
    plan = get_object_or_404(SubscriptionPlan, pk=plan_id)
    user = request.user
    
    gst_data = gst_service.calculate_gst(plan.amount, user.state)
    total_amount = gst_data['total_amount']
    
    # Create Razorpay order
    try:
        order = razorpay_service.create_order(total_amount, currency="INR")
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)
        
    # Create Pending Payment
    payment = Payment.objects.create(
        registration=user,
        razorpay_order_id=order['id'],
        amount=total_amount,
        status='CREATED'
    )
    
    from django.conf import settings
    return Response({
        'success': True,
        'order_id': order['id'],
        'amount': int(total_amount * 100),
        'currency': 'INR',
        'key_id': getattr(settings, 'RAZORPAY_KEY_ID', ''),
        'plan': plan.name,
        'base_amount': plan.amount,
        'cgst': gst_data['cgst_amount'],
        'sgst': gst_data['sgst_amount'],
        'igst': gst_data['igst_amount'],
        'total_amount': total_amount
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_signature = request.data.get('razorpay_signature')
    plan_name = request.data.get('plan_name', 'Unknown') # passed from frontend optionally or tracked
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response({'success': False, 'message': 'Missing parameters'}, status=400)
        
    payment = get_object_or_404(Payment, razorpay_order_id=razorpay_order_id, registration=request.user)
    
    if payment.status == 'SUCCESS':
        # Idempotency
        return Response({
            'success': True,
            'message': 'Payment already verified',
            'subscription_status': 'ACTIVE',
            'invoice_number': payment.invoice.invoice_number if payment.invoice else None
        })
        
    # Verify Signature
    is_valid = razorpay_service.verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if not is_valid:
        payment.status = 'FAILED'
        payment.save()
        return Response({'success': False, 'message': 'Payment verification failed'}, status=400)
        
    with transaction.atomic():
        payment.status = 'SUCCESS'
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        
        # We need to find the plan. Since we didn't store plan_id on payment, we can guess by amount or pass from frontend.
        # Ideally, we should add plan_id to Payment model. Let's find it by amount.
        plan = SubscriptionPlan.objects.filter(name=plan_name).first()
        if not plan:
            plan = SubscriptionPlan.objects.first() # fallback
            
        gst_data = gst_service.calculate_gst(plan.amount, request.user.state)
        
        # Create Subscription
        sub = Subscription.objects.create(
            registration=request.user,
            plan=plan,
            invoice_date=timezone.now(),
            renewal_date=timezone.now() + datetime.timedelta(days=plan.duration_days),
            base_amount=plan.amount,
            cgst=gst_data['cgst_amount'],
            sgst=gst_data['sgst_amount'],
            igst=gst_data['igst_amount'],
            total_amount=gst_data['total_amount'],
            status='ACTIVE'
        )
        
        # Create Invoice
        invoice = Invoice.objects.create(
            invoice_number=invoice_service.generate_invoice_number(),
            registration=request.user,
            subscription=sub,
            plan_name=plan.name,
            base_amount=plan.amount,
            cgst_rate=gst_data['cgst_rate'],
            cgst_amount=gst_data['cgst_amount'],
            sgst_rate=gst_data['sgst_rate'],
            sgst_amount=gst_data['sgst_amount'],
            igst_rate=gst_data['igst_rate'],
            igst_amount=gst_data['igst_amount'],
            total_amount=gst_data['total_amount'],
            payment_status='PAID',
            payment_id=razorpay_payment_id,
            razorpay_order_id=razorpay_order_id
        )
        
        payment.subscription = sub
        payment.invoice = invoice
        payment.save()
        
        # Update Usage
        usage, _ = Usage.objects.get_or_create(registration=request.user)
        usage.plan = plan
        usage.subscription = sub
        usage.allowed_runs = plan.run_limit
        usage.remaining_runs = plan.run_limit
        usage.save()
        
    return Response({
        'success': True,
        'message': 'Payment verified successfully',
        'subscription_status': 'ACTIVE',
        'invoice_number': invoice.invoice_number
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_invoice_pdf(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, registration=request.user)
    pdf = invoice_service.generate_invoice_pdf(invoice)
    
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
    return response
"""

urls_code = """
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'plans', views.SubscriptionPlanViewSet, basename='plans')
router.register(r'invoices', views.InvoiceViewSet, basename='invoices')
router.register(r'payments', views.PaymentViewSet, basename='payments')

urlpatterns = [
    path('', include(router.urls)),
    path('subscriptions/current/', views.current_subscription, name='current-subscription'),
    path('payments/charge/', views.charge_payment, name='charge-payment'),
    path('payments/verify/', views.verify_payment, name='verify-payment'),
    path('invoices/<int:pk>/pdf/', views.download_invoice_pdf, name='download-invoice-pdf'),
]
"""

base_path = r"d:\clone_repo\StockSim\Development\Project\backend\subscriptions"
with open(os.path.join(base_path, "serializers.py"), "w", encoding="utf-8") as f:
    f.write(serializers_code.strip())
with open(os.path.join(base_path, "views.py"), "w", encoding="utf-8") as f:
    f.write(views_code.strip())
with open(os.path.join(base_path, "urls.py"), "w", encoding="utf-8") as f:
    f.write(urls_code.strip())
