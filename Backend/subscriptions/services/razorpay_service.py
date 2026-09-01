import razorpay
from django.conf import settings
from decimal import Decimal

def get_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def create_order(amount: Decimal, currency="INR", receipt=None):
    amount_in_paise = int(amount * 100)
    

    client = get_client()
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