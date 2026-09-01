from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from .services import AuditLogService


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """
    Log user login.
    """

    organization = None

    if hasattr(user, "organizations"):
        organization = user.organizations.first()
    elif hasattr(user, "organization"):
        organization = user.organization

    AuditLogService.create_log(
        user=user,
        organization=organization,
        action="LOGIN",
        module="Authentication",
        description=f"{user.username} logged into the system.",
        ip_address=request.META.get("REMOTE_ADDR"),
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """
    Log user logout.
    """

    if user is None:
        return

    organization = None

    if hasattr(user, "organizations"):
        organization = user.organizations.first()
    elif hasattr(user, "organization"):
        organization = user.organization

    AuditLogService.create_log(
        user=user,
        organization=organization,
        action="LOGOUT",
        module="Authentication",
        description=f"{user.username} logged out of the system.",
        ip_address=request.META.get("REMOTE_ADDR") if request else None,
    )