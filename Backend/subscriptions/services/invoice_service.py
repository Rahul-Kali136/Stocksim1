import io
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from django.utils import timezone
from subscriptions.models import Invoice
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Table, TableStyle, Paragraph, Spacer

def draw_background(canvas, doc):
    canvas.saveState()
    # Top Accent Line (StockSim Indigo)
    canvas.setFillColor(colors.HexColor('#4F46E5'))
    canvas.rect(0, A4[1] - 8, A4[0], 8, fill=1, stroke=0)
    
    # Company Info (Left)
    canvas.setFillColor(colors.HexColor('#0F172A'))
    canvas.setFont("Helvetica-Bold", 26)
    canvas.drawString(40, A4[1] - 55, "STOCKSIM")
    
    canvas.setFillColor(colors.HexColor('#64748B'))
    canvas.setFont("Helvetica", 9)
    canvas.drawString(40, A4[1] - 70, "Monte Carlo Inventory Risk Forecaster")
    
    gstin = getattr(settings, 'COMPANY_GST_NUMBER', '')
    if gstin:
        canvas.drawString(40, A4[1] - 82, f"GSTIN: {gstin}")
    
    # Invoice Title (Right)
    canvas.setFont("Helvetica-Bold", 24)
    canvas.setFillColor(colors.HexColor('#CBD5E1'))
    canvas.drawRightString(A4[0] - 40, A4[1] - 55, "INVOICE")
    
    # Separator line below header
    canvas.setStrokeColor(colors.HexColor('#E2E8F0'))
    canvas.setLineWidth(1)
    canvas.line(40, A4[1] - 100, A4[0] - 40, A4[1] - 100)
    
    # Footer Area
    canvas.setFillColor(colors.HexColor('#F8FAFC'))
    canvas.rect(0, 0, A4[0], 80, fill=1, stroke=0)
    
    canvas.setStrokeColor(colors.HexColor('#E2E8F0'))
    canvas.line(0, 80, A4[0], 80)
    
    canvas.setFillColor(colors.HexColor('#475569'))
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawCentredString(A4[0] / 2.0, 50, "Thank you for choosing StockSim!")
    
    canvas.setFillColor(colors.HexColor('#94A3B8'))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(A4[0] / 2.0, 35, "This is a computer-generated document and does not require a physical signature.")
    canvas.drawCentredString(A4[0] / 2.0, 22, "support@stocksim.app   |   www.stocksim.app")
    canvas.restoreState()

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
    doc = BaseDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=130, bottomMargin=90)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')
    template = PageTemplate(id='test', frames=frame, onPage=draw_background)
    doc.addPageTemplates([template])
    
    elements = []
    
    styles = getSampleStyleSheet()
    normal = ParagraphStyle(name='NormalCustom', fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#334155'), leading=14)
    normal_right = ParagraphStyle(name='NormalRight', fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#334155'), alignment=2, leading=14)
    
    # 1. Invoice Meta & Bill To
    status_color = '#10B981' if invoice.payment_status.upper() == 'PAID' else '#EF4444'
    status_text = f"<font color='white'><b>  {invoice.payment_status.upper()}  </b></font>"
    
    meta_data = [
        [
            Paragraph("<font color='#64748B'><b>Billed To:</b></font>", normal), 
            Paragraph(f"<font color='#64748B'>Invoice #:</font> <b>{invoice.invoice_number}</b>", normal_right)
        ],
        [
            Paragraph(f"<b>{invoice.registration.first_name} {invoice.registration.last_name}</b>", normal), 
            Paragraph(f"<font color='#64748B'>Date:</font> <b>{invoice.invoice_date.strftime('%B %d, %Y')}</b>", normal_right)
        ],
        [
            Paragraph(f"{invoice.registration.email}", normal), 
            Paragraph(f"<font color='#64748B'>Status:</font>", normal_right)
        ],
        [
            Paragraph(f"State: {invoice.registration.state}", normal), 
            Paragraph(status_text, ParagraphStyle(name='Pill', fontName='Helvetica-Bold', fontSize=10, alignment=2, backColor=colors.HexColor(status_color), spaceBefore=3, borderPadding=(3, 8, 3, 8), textColor=colors.white))
        ]
    ]
    
    meta_table = Table(meta_data, colWidths=[250, 265])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 35))
    
    # 2. Items Table
    items_data = [
        ['Description', 'Quantity', 'Amount']
    ]
    
    items_data.append([
        Paragraph(f"<b>{invoice.plan_name} Plan Subscription</b><br/><font color='#64748B' size=8>Includes access to Monte Carlo simulations and advanced reporting.</font>", normal),
        "1",
        f"INR {invoice.base_amount:.2f}"
    ])
    
    items_table = Table(items_data, colWidths=[285, 100, 130])
    items_table_style = [
        # Header row style
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#475569')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (1,0), (2,0), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#E2E8F0')),
        
        # Item row style
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 10),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#1E293B')),
        ('ALIGN', (1,1), (2,-1), 'RIGHT'),
        ('VALIGN', (0,1), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,1), (-1,-1), 15),
        ('TOPPADDING', (0,1), (-1,-1), 15),
        ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
    ]
    items_table.setStyle(TableStyle(items_table_style))
    elements.append(items_table)
    elements.append(Spacer(1, 15))
    
    # 3. Totals Summary
    totals_data = [
        ['Subtotal:', f"INR {invoice.base_amount:.2f}"]
    ]
    
    if invoice.cgst_amount > 0:
        totals_data.append([f"CGST ({invoice.cgst_rate}%):", f"INR {invoice.cgst_amount:.2f}"])
        totals_data.append([f"SGST ({invoice.sgst_rate}%):", f"INR {invoice.sgst_amount:.2f}"])
        
    if invoice.igst_amount > 0:
        totals_data.append([f"IGST ({invoice.igst_rate}%):", f"INR {invoice.igst_amount:.2f}"])
        
    totals_data.append(['Total Amount:', f"INR {invoice.total_amount:.2f}"])
    
    totals_table = Table(totals_data, colWidths=[130, 130])
    totals_style = [
        ('ALIGN', (0,0), (1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (1,-2), 'Helvetica'),
        ('TEXTCOLOR', (0,0), (1,-2), colors.HexColor('#64748B')),
        ('BOTTOMPADDING', (0,0), (-1,-2), 6),
        ('TOPPADDING', (0,0), (-1,-2), 6),
        
        # Total Row
        ('FONTNAME', (0,-1), (1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (1,-1), 12),
        ('TEXTCOLOR', (0,-1), (1,-1), colors.HexColor('#4F46E5')), # Brand Indigo
        ('TOPPADDING', (0,-1), (1,-1), 10),
        ('BOTTOMPADDING', (0,-1), (1,-1), 10),
        ('LINEABOVE', (0,-1), (1,-1), 1.5, colors.HexColor('#E2E8F0')),
    ]
    totals_table.setStyle(TableStyle(totals_style))
    
    wrapper_data = [['', totals_table]]
    wrapper_table = Table(wrapper_data, colWidths=[255, 260])
    wrapper_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(wrapper_table)
    elements.append(Spacer(1, 30))
    
    # 4. Payment Details Box
    payment_data = [
        [Paragraph("<font color='#4F46E5'><b>Payment Information</b></font>", ParagraphStyle(name='b', fontName='Helvetica-Bold', fontSize=10))],
        [Paragraph(f"<b>Transaction ID:</b> {invoice.payment_id or 'N/A'}", normal)],
        [Paragraph(f"<b>Reference Order:</b> {invoice.razorpay_order_id or 'N/A'}", normal)],
    ]
    payment_table = Table(payment_data, colWidths=[300])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
    ]))
    
    elements.append(payment_table)
    
    doc.build(elements)
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf