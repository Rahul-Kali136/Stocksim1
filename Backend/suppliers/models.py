from django.db import models
from Organization.models import Organization
class Supplier(models.Model):

    supplier_id = models.AutoField(primary_key=True)

    supplier_name = models.CharField(max_length=100)

    business_type = models.CharField(max_length=100)

    phone = models.CharField(max_length=10)

    email = models.EmailField(unique=True)

    address = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    # Foreign Key to Organization table
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        db_column="organization_id",
        related_name="suppliers"
    )

    # Foreign Key to Product table
    product = models.ForeignKey(
        "product.Product",
        on_delete=models.CASCADE,
        db_column="product_id",
        related_name="suppliers",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "supplier"
        ordering = ["supplier_id"]
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"


    def save(self, *args, **kwargs):
        if not self.pk and not self.supplier_id:
            max_id = Supplier.objects.aggregate(models.Max("supplier_id"))["supplier_id__max"] or 0
            self.supplier_id = max_id + 1

        if not self.product_id and self.organization_id:
            from product.models import Product
            prod = Product.objects.filter(organization_id=self.organization_id).first()
            if prod:
                self.product = prod

        super().save(*args, **kwargs)

        if self.product_id:
            from product.models import Product
            Product.objects.filter(pk=self.product_id, organization_id=self.organization_id).update(supplier_id=self.supplier_id)

    def __str__(self):
        return self.supplier_name