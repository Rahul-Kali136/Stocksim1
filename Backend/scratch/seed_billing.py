import os
import sys
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stocksim.settings')
django.setup()

from authentication.models import CustomUser
from subscriptions.models import SubscriptionPlan, Subscription, Invoice, Usage

def seed_billing_data():
    # 1. Get all users
    users = CustomUser.objects.all()
    if not users.exists():
        print("No users found. Please create a user first.")
        return

    # 2. Create Unique Plans
    plans_data = [
        {"name": "Starter", "description": "Basic forecasting for beginners.", "amount": 0.00, "run_limit": 5, "duration_days": 30},
        {"name": "Professional", "description": "Standard features for small businesses.", "amount": 499.00, "run_limit": 50, "duration_days": 30},
        {"name": "Enterprise Premium", "description": "Unlimited professional inventory simulation with AI.", "amount": 2499.00, "run_limit": 10000, "duration_days": 30}
    ]
    
    plans = {}
    for pd in plans_data:
        plan, _ = SubscriptionPlan.objects.update_or_create(
            name=pd["name"],
            defaults={
                "description": pd["description"],
                "amount": pd["amount"],
                "run_limit": pd["run_limit"],
                "duration_days": pd["duration_days"]
            }
        )
        plans[plan.name] = plan

    premium_plan = plans["Enterprise Premium"]

    for user in users:
        print(f"Seeding data for user: {user.email}")

        # 3. Create Subscription
        sub, _ = Subscription.objects.update_or_create(
            registration=user,
            defaults={
                "plan": premium_plan,
                "invoice_date": timezone.now().date(),
                "renewal_date": (timezone.now() + timedelta(days=30)).date(),
                "base_amount": 2117.80,
                "cgst": 190.60,
                "sgst": 190.60,
                "total_amount": 2499.00,
                "status": "ACTIVE"
            }
        )

        # 4. Create Usage
        Usage.objects.update_or_create(
            registration=user,
            defaults={
                "subscription": sub,
                "plan": premium_plan,
                "allowed_runs": premium_plan.run_limit,
                "used_runs": 8432,
                "remaining_runs": premium_plan.run_limit - 8432
            }
        )

        # 5. Create Invoices
        # Delete old invoices for this user to avoid unique constraint errors on re-runs
        Invoice.objects.filter(registration=user).delete()

        invoices_to_create = [
            {
                "num": f"INV-{user.admin_id}-2026-0801",
                "date": timezone.now().date(),
                "status": "PAID",
                "amount": 2499.00
            }
        ]

        for inv in invoices_to_create:
            Invoice.objects.create(
                invoice_number=inv["num"],
                registration=user,
                subscription=sub,
                invoice_date=inv["date"],
                due_date=inv["date"] + timedelta(days=7),
                plan_name="Enterprise Premium",
                base_amount=float(inv["amount"]) * 0.84,
                cgst_amount=float(inv["amount"]) * 0.08,
                sgst_amount=float(inv["amount"]) * 0.08,
                total_amount=inv["amount"],
                payment_status=inv["status"]
            )

    print("Successfully seeded unique billing data for the frontend UI for all users.")

if __name__ == '__main__':
    seed_billing_data()
