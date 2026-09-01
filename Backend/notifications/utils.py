from .services import NotificationService


def notify_low_stock(user, organization, product):
    NotificationService.low_stock_notification(
        user=user,
        organization=organization,
        product=product,
    )


def notify_reorder(user, organization, product):
    NotificationService.reorder_notification(
        user=user,
        organization=organization,
        product=product,
    )


def notify_simulation(user, organization, simulation):
    NotificationService.simulation_completed(
        user=user,
        organization=organization,
        simulation=simulation,
    )


def notify_report(user, organization, report_name):
    NotificationService.report_generated(
        user=user,
        organization=organization,
        report_name=report_name,
    )


def notify_system(user, organization, title, message):
    NotificationService.system_notification(
        user=user,
        organization=organization,
        title=title,
        message=message,
    )