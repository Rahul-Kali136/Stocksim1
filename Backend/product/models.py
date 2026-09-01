from django.db import models
from suppliers.models import Supplier
from Organization.models import Organization
class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    product_name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    organization = models.ForeignKey(Organization,on_delete=models.CASCADE,related_name="products",null=True,blank=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        db_column="supplier_id",
        related_name="products",
        null=True,
        blank=True
    )
    class Meta:
        db_table = "product"
        ordering = ["product_id"]

    def save(self, *args, **kwargs):
        if not self.pk and not self.product_id:
            max_id = Product.objects.aggregate(models.Max("product_id"))["product_id__max"] or 0
            self.product_id = max_id + 1

        super().save(*args, **kwargs)

        if self.supplier_id:
            Supplier.objects.filter(pk=self.supplier_id).update(product_id=self.product_id)

    def __str__(self):
        return self.product_name