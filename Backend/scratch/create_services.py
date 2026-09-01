import os

gst_service_code = """
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
"""

razorpay_service_code = """
import razorpay
from django.conf import settings
from decimal import Decimal

def get_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def create_order(amount: Decimal, currency="INR", receipt=None):
    client = get_client()
    # Razorpay expects amount in paise
    amount_in_paise = int(amount * 100)
    data = {
        "amount": amount_in_paise,
        "currency": currency,
        "receipt": receipt,
        "payment_capture": "1"
    }
    return client.order.create(data=data)

def verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    client = get_client()
    params = {
        'razorpay_order_id': razorpay_order_id,
        'razorpay_payment_id': razorpay_payment_id,
        'razorpay_signature': razorpay_signature
    }
    try:
        client.utility.verify_payment_signature(params)
        return True
    except Exception:
        return False
"""

invoice_service_code = """
import io
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from django.utils import timezone
from subscriptions.models import Invoice

def generate_invoice_number():
    year = timezone.now().year
    last_invoice = Invoice.objects.filter(invoice_number__startswith=f'STOCKSIM-INV-{year}').order_by('id').last()
    if last_invoice:
        last_num = int(last_invoice.invoice_number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"STOCKSIM-INV-{year}-{new_num:06d}"

def generate_invoice_pdf(invoice):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(1 * inch, height - 1 * inch, getattr(settings, 'COMPANY_NAME', 'StockSim'))
    
    p.setFont("Helvetica", 10)
    p.drawString(1 * inch, height - 1.2 * inch, "Monte Carlo Inventory Risk Forecaster")
    p.drawString(1 * inch, height - 1.4 * inch, getattr(settings, 'COMPANY_ADDRESS', ''))
    p.drawString(1 * inch, height - 1.6 * inch, f"GSTIN: {getattr(settings, 'COMPANY_GST_NUMBER', '')}")
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(5.5 * inch, height - 1 * inch, "INVOICE")
    
    p.setFont("Helvetica", 10)
    p.drawString(5.5 * inch, height - 1.2 * inch, f"Invoice #: {invoice.invoice_number}")
    p.drawString(5.5 * inch, height - 1.4 * inch, f"Date: {invoice.invoice_date.strftime('%d-%b-%Y')}")
    p.drawString(5.5 * inch, height - 1.6 * inch, f"Status: {invoice.payment_status}")
    
    # Line
    p.line(1 * inch, height - 1.8 * inch, width - 1 * inch, height - 1.8 * inch)
    
    # Customer Info
    p.setFont("Helvetica-Bold", 12)
    p.drawString(1 * inch, height - 2.2 * inch, "Bill To:")
    p.setFont("Helvetica", 10)
    p.drawString(1 * inch, height - 2.4 * inch, f"{invoice.registration.first_name} {invoice.registration.last_name} ({invoice.registration.email})")
    p.drawString(1 * inch, height - 2.6 * inch, f"State: {invoice.registration.state}")
    
    # Table Header
    y = height - 3.5 * inch
    p.setFont("Helvetica-Bold", 10)
    p.drawString(1 * inch, y, "Description")
    p.drawString(5 * inch, y, "Qty")
    p.drawString(6 * inch, y, "Amount")
    
    p.line(1 * inch, y - 5, width - 1 * inch, y - 5)
    
    # Table Content
    y -= 20
    p.setFont("Helvetica", 10)
    p.drawString(1 * inch, y, f"{invoice.plan_name} Subscription")
    p.drawString(5 * inch, y, "1")
    p.drawString(6 * inch, y, f"Rs. {invoice.base_amount}")
    
    y -= 30
    p.line(1 * inch, y, width - 1 * inch, y)
    y -= 15
    p.drawString(4.5 * inch, y, "Subtotal:")
    p.drawString(6 * inch, y, f"Rs. {invoice.base_amount}")
    
    if invoice.cgst_amount > 0:
        y -= 15
        p.drawString(4.5 * inch, y, f"CGST ({invoice.cgst_rate}%):")
        p.drawString(6 * inch, y, f"Rs. {invoice.cgst_amount}")
        y -= 15
        p.drawString(4.5 * inch, y, f"SGST ({invoice.sgst_rate}%):")
        p.drawString(6 * inch, y, f"Rs. {invoice.sgst_amount}")
        
    if invoice.igst_amount > 0:
        y -= 15
        p.drawString(4.5 * inch, y, f"IGST ({invoice.igst_rate}%):")
        p.drawString(6 * inch, y, f"Rs. {invoice.igst_amount}")
        
    y -= 15
    p.line(1 * inch, y, width - 1 * inch, y)
    y -= 20
    p.setFont("Helvetica-Bold", 12)
    p.drawString(4.5 * inch, y, "TOTAL:")
    p.drawString(6 * inch, y, f"Rs. {invoice.total_amount}")
    
    # Footer
    p.setFont("Helvetica", 9)
    p.drawString(1 * inch, 1.5 * inch, f"Payment ID: {invoice.payment_id or 'N/A'}")
    p.drawString(1 * inch, 1.3 * inch, f"Razorpay Order ID: {invoice.razorpay_order_id or 'N/A'}")
    p.drawString(1 * inch, 1 * inch, "Thank you for choosing StockSim. This is a system-generated invoice.")
    
    p.showPage()
    p.save()
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
"""

usage_service_code = """
from subscriptions.models import Usage

def check_run_limit(user):
    usage = Usage.objects.filter(registration=user).first()
    if not usage:
        # Create first time usage
        usage = Usage.objects.create(
            registration=user,
            allowed_runs=3,
            remaining_runs=3,
            first_time_runs=3
        )
    return usage.remaining_runs > 0

def consume_run(user):
    usage = Usage.objects.filter(registration=user).first()
    if usage and usage.remaining_runs > 0:
        usage.remaining_runs -= 1
        usage.used_runs += 1
        usage.save(update_fields=['remaining_runs', 'used_runs'])
        return True
    return False
"""

init_code = ""

base_path = r"d:\clone_repo\StockSim\Development\Project\backend\subscriptions\services"
with open(os.path.join(base_path, "gst_service.py"), "w", encoding="utf-8") as f:
    f.write(gst_service_code.strip())
with open(os.path.join(base_path, "razorpay_service.py"), "w", encoding="utf-8") as f:
    f.write(razorpay_service_code.strip())
with open(os.path.join(base_path, "invoice_service.py"), "w", encoding="utf-8") as f:
    f.write(invoice_service_code.strip())
with open(os.path.join(base_path, "usage_service.py"), "w", encoding="utf-8") as f:
    f.write(usage_service_code.strip())
with open(os.path.join(base_path, "__init__.py"), "w", encoding="utf-8") as f:
    f.write(init_code)
