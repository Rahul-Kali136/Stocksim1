import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stocksim.settings')
django.setup()

from inventorypolicy.models import InventoryPolicy
from simulation.views import run_monte_carlo_simulation

policies = InventoryPolicy.objects.all()
print(f"Found {len(policies)} inventory policies in database.")

for policy in policies:
    if not policy.product:
        print(f"Skipping Policy ID {policy.id} because it has no associated product.")
        continue
    
    print(f"Running Monte Carlo simulation for Policy ID {policy.id} (Product: {policy.product.product_name})...")
    try:
        # Default simulation length to 30 days
        days = 30
        opening_stock = policy.opening_stock if (policy.opening_stock is not None) else 100
        run_monte_carlo_simulation(policy, days, opening_stock)
        print(f"Successfully saved simulation for Policy ID {policy.id}")
    except Exception as e:
        print(f"Error running simulation for Policy ID {policy.id}: {e}")

print("Simulation database sync complete!")
