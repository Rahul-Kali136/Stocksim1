from django.db import models
from authentication.models import CustomUser
class Organization(models.Model):
    organization_id = models.AutoField(primary_key=True)
    organization_name = models.CharField(max_length=200)
    organization_type = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    
    # Points to your custom user table. Maps to the column 'admin_id' in MySQL.
    admin = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        db_column="admin_id", 
        related_name="organizations"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organization"
        ordering = ["admin_id", "organization_id"]
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"

    def save(self, *args, **kwargs):
        if not self.pk and not self.organization_id:
            max_id = Organization.objects.aggregate(models.Max("organization_id"))["organization_id__max"] or 0
            self.organization_id = max_id + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.organization_name} (Admin ID: {self.admin_id})"



