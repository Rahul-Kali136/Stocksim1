from django.db import transaction
from django.utils import timezone

from .models import Notification


class NotificationService:
    """
    Business logic for Notifications.
    """

    @staticmethod
    @transaction.atomic
    def create_notification(
        *,
        user,
        organization,
        title,
        message,
        notification_type="SYSTEM",
        priority="LOW",
        product=None,
        expires_at=None,
    ):
        """
        Create a new notification.
        """

        notification = Notification.objects.create(
            user=user,
            organization=organization,
            product=product,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            expires_at=expires_at,
        )

        return notification

    @staticmethod
    def low_stock_notification(user, organization, product):
        """
        Create Low Stock Notification.
        """

        return NotificationService.create_notification(
            user=user,
            organization=organization,
            product=product,
            title="Low Stock Alert",
            message=f"{product.name} stock is running low.",
            notification_type="LOW_STOCK",
            priority="HIGH",
        )

    @staticmethod
    def reorder_notification(user, organization, product):
        """
        Create Reorder Point Notification.
        """

        return NotificationService.create_notification(
            user=user,
            organization=organization,
            product=product,
            title="Reorder Required",
            message=f"{product.name} reached its reorder point.",
            notification_type="REORDER",
            priority="HIGH",
        )

    @staticmethod
    def simulation_completed(user, organization, simulation):
        """
        Simulation completed notification.
        """

        return NotificationService.create_notification(
            user=user,
            organization=organization,
            title="Simulation Completed",
            message=f"Monte Carlo Simulation '{simulation}' completed successfully.",
            notification_type="SIMULATION",
            priority="MEDIUM",
        )

    @staticmethod
    def report_generated(user, organization, report_name):
        """
        Report Generated Notification.
        """

        return NotificationService.create_notification(
            user=user,
            organization=organization,
            title="Report Generated",
            message=f"{report_name} report has been generated successfully.",
            notification_type="REPORT",
            priority="LOW",
        )

    @staticmethod
    def system_notification(user, organization, title, message):
        """
        Generic System Notification.
        """

        return NotificationService.create_notification(
            user=user,
            organization=organization,
            title=title,
            message=message,
            notification_type="SYSTEM",
            priority="LOW",
        )

    @staticmethod
    def mark_as_read(notification_id):
        """
        Mark a notification as read.
        """

        notification = Notification.objects.get(id=notification_id)

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return notification

    @staticmethod
    def mark_all_as_read(user):
        """
        Mark all notifications as read for a user.
        """

        Notification.objects.filter(
            user=user,
            is_read=False
        ).update(is_read=True)

    @staticmethod
    def delete_notification(notification_id):
        """
        Delete a notification.
        """

        Notification.objects.filter(id=notification_id).delete()

    @staticmethod
    def unread_count(user):
        """
        Get unread notification count.
        """

        return Notification.objects.filter(
            user=user,
            is_read=False
        ).count()

    @staticmethod
    def total_notifications(user):
        """
        Get total notification count.
        """

        return Notification.objects.filter(
            user=user
        ).count()

    @staticmethod
    def cleanup_expired_notifications():
        """
        Delete expired notifications.
        """

        Notification.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()