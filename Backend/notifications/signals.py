from django.db.models.signals import post_save
from django.dispatch import receiver

from product.models import Product
from simulation.models import MonteCarloSimulation

from .services import NotificationService


@receiver(post_save, sender=Product)
def product_stock_notification(sender, instance, created, **kwargs):
    """
    Generate notifications when product stock
    reaches reorder point or low stock.
    """

    # Skip notification when product is first created
    if created:
        return

    # Ignore if stock information is missing
    current_stock = getattr(instance, "current_stock", None)
    reorder_point = getattr(instance, "reorder_point", None)

    if current_stock is None or reorder_point is None:
        return

    try:
        user = instance.created_by
    except AttributeError:
        return

    organization = instance.organization

    # Critical Low Stock
    if instance.current_stock <= 0:

        NotificationService.create_notification(
            user=user,
            organization=organization,
            product=instance,
            title="Out of Stock",
            message=f"{instance.name} is completely out of stock.",
            notification_type="LOW_STOCK",
            priority="CRITICAL"
        )

    # Reorder Level
    elif instance.current_stock <= instance.reorder_point:

        NotificationService.reorder_notification(
            user=user,
            organization=organization,
            product=instance
        )


@receiver(post_save, sender=MonteCarloSimulation)
def simulation_completed_notification(sender, instance, created, **kwargs):
    """
    Generate notification after simulation completion.
    """

    if created:
        return

    # Change this according to your Simulation model
    if hasattr(instance, "status"):

        if instance.status == "COMPLETED":

            NotificationService.simulation_completed(
                user=instance.user,
                organization=instance.organization,
                simulation=instance
            )


def report_notification(user, organization, report_name):
    """
    Call this function after a report is generated.
    """

    NotificationService.report_generated(
        user=user,
        organization=organization,
        report_name=report_name
    )


def inventory_summary_notification(user, organization):
    """
    Inventory Summary Ready
    """

    NotificationService.system_notification(
        user=user,
        organization=organization,
        title="Inventory Summary",
        message="Inventory summary has been updated successfully."
    )


def policy_created_notification(user, organization, policy):
    """
    Inventory Policy Created
    """

    NotificationService.system_notification(
        user=user,
        organization=organization,
        title="Policy Created",
        message=f"{policy.policy_name} policy created successfully."
    )


def policy_updated_notification(user, organization, policy):
    """
    Inventory Policy Updated
    """

    NotificationService.system_notification(
        user=user,
        organization=organization,
        title="Policy Updated",
        message=f"{policy.policy_name} policy updated successfully."
    )