from django.conf import settings
from decimal import Decimal

def calculate_gst(base_amount: Decimal, customer_state: str):
    base_amount = Decimal(str(base_amount))
    
    company_state = getattr(settings, 'COMPANY_STATE', '').strip().lower()
    cust_state = (customer_state or '').strip().lower()
    
    if company_state == cust_state:
        cgst_rate = Decimal(str(getattr(settings, 'DEFAULT_CGST_RATE', 9.0)))
        sgst_rate = Decimal(str(getattr(settings, 'DEFAULT_SGST_RATE', 9.0)))
        igst_rate = Decimal('0.0')
    else:
        cgst_rate = Decimal('0.0')
        sgst_rate = Decimal('0.0')
        igst_rate = Decimal(str(getattr(settings, 'DEFAULT_IGST_RATE', 18.0)))
        
    cgst_amount = (base_amount * cgst_rate) / Decimal('100.0')
    sgst_amount = (base_amount * sgst_rate) / Decimal('100.0')
    igst_amount = (base_amount * igst_rate) / Decimal('100.0')
    
    total_amount = base_amount + cgst_amount + sgst_amount + igst_amount
    
    return {
        'cgst_rate': cgst_rate,
        'sgst_rate': sgst_rate,
        'igst_rate': igst_rate,
        'cgst_amount': round(cgst_amount, 2),
        'sgst_amount': round(sgst_amount, 2),
        'igst_amount': round(igst_amount, 2),
        'total_amount': round(total_amount, 2)
    }