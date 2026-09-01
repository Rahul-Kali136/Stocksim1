import os
from textwrap import dedent

models_code = """
from django.db import models
from django.utils import timezone
from authentication.models import CustomUser

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    run_limit = models.IntegerField(default=5)
    duration_days = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - ₹{self.amount}"

class Subscription(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'ACTIVE'),
        ('INACTIVE', 'INACTIVE'),
        ('EXPIRED', 'EXPIRED'),
        ('CANCELLED', 'CANCELLED'),
    )

    registration = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    invoice_date = models.DateField(default=timezone.now)
    renewal_date = models.DateField()
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    igst = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.registration.email} - {self.plan.name} - {self.status}"

class Invoice(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'PENDING'),
        ('PAID', 'PAID'),
        ('FAILED', 'FAILED'),
        ('REFUNDED', 'REFUNDED'),
    )

    invoice_number = models.CharField(max_length=50, unique=True)
    registration = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='invoices', null=True, blank=True)
    invoice_date = models.DateField(default=timezone.now)
    due_date = models.DateField(default=timezone.now)
    plan_name = models.CharField(max_length=100)
    
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.invoice_number} - {self.payment_status}"

class Payment(models.Model):
    STATUS_CHOICES = (
        ('CREATED', 'CREATED'),
        ('PENDING', 'PENDING'),
        ('SUCCESS', 'SUCCESS'),
        ('FAILED', 'FAILED'),
        ('REFUNDED', 'REFUNDED'),
    )

    registration = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='payments')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    
    razorpay_order_id = models.CharField(max_length=100, unique=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED')
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.razorpay_order_id} - {self.status}"

class Usage(models.Model):
    registration = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='usages')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='usages')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    
    allowed_runs = models.IntegerField(default=0)
    used_runs = models.IntegerField(default=0)
    remaining_runs = models.IntegerField(default=0)
    first_time_runs = models.IntegerField(default=3)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.registration.email} - {self.remaining_runs} remaining"
"""

with open(r"d:\clone_repo\StockSim\Development\Project\backend\subscriptions\models.py", "w", encoding="utf-8") as f:
    f.write(models_code.strip())
