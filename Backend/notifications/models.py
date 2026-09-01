from django.db import models
from django.conf import settings
from django.utils import timezone

from Organization.models import Organization
from product.models import Product


class Notification(models.Model):
    """
    Notification Model
    Stores notifications for each admin user.
    """

    NOTIFICATION_TYPES = (
        ("LOW_STOCK", "Low Stock"),
        ("REORDER", "Reorder Point"),
        ("SIMULATION", "Simulation"),
        ("REPORT", "Report"),
        ("SYSTEM", "System"),
    )

    PRIORITY_LEVELS = (
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )

    title = models.CharField(
        max_length=255
    )

    message = models.TextField()

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default="SYSTEM"
    )

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_LEVELS,
        default="LOW"
    )

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = "notification"
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.title} - {self.user.username}"

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def mark_as_read(self):
        self.is_read = True
        self.save(update_fields=["is_read"])

    def mark_as_unread(self):
        self.is_read = False
        self.save(update_fields=["is_read"])