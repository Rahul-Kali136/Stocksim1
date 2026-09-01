from rest_framework.permissions import BasePermission


class IsNotificationOwner(BasePermission):
    """
    Allows access only to the owner of the notification.
    """

    message = "You do not have permission to access this notification."

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and obj.user == request.user
        )


class IsOrganizationMember(BasePermission):
    """
    Allows access only if the notification belongs
    to the same organization as the logged-in user.
    """

    message = "You do not belong to this organization."

    def has_object_permission(self, request, view, obj):

        # User must be authenticated
        if not request.user.is_authenticated:
            return False

        # Check whether the user has an organization attribute
        if not hasattr(request.user, "organization"):
            return False

        # Check whether notification belongs to the user's organization
        return obj.organization == request.user.organization