from .models import AuditLog


class AuditLogService:
    """
    Business logic for Audit Logs.
    """

    @staticmethod
    def create_log(
        user,
        action,
        module,
        description,
        organization=None,
        old_data=None,
        new_data=None,
        ip_address=None,
    ):
        """
        Create a new audit log.
        """

        return AuditLog.objects.create(
            user=user,
            organization=organization,
            action=action,
            module=module,
            description=description,
            old_data=old_data,
            new_data=new_data,
            ip_address=ip_address,
        )

    @staticmethod
    def get_logs(user):
        """
        Return all audit logs for a user.
        """

        return AuditLog.objects.filter(
            user=user
        ).order_by("-created_at")

    @staticmethod
    def get_log(log_id, user):
        """
        Return a single audit log.
        """

        return AuditLog.objects.filter(
            id=log_id,
            user=user
        ).first()

    @staticmethod
    def delete_log(log_id, user):
        """
        Delete a user's audit log.
        """

        audit_log = AuditLog.objects.filter(
            id=log_id,
            user=user
        ).first()

        if audit_log:
            audit_log.delete()
            return True

        return False

    @staticmethod
    def total_logs(user):
        """
        Return total audit logs.
        """

        return AuditLog.objects.filter(
            user=user
        ).count()

    @staticmethod
    def recent_logs(user, limit=5):
        """
        Return recent audit logs.
        """

        return AuditLog.objects.filter(
            user=user
        ).order_by("-created_at")[:limit]

    @staticmethod
    def logs_by_action(user, action):
        """
        Return logs filtered by action.
        """

        return AuditLog.objects.filter(
            user=user,
            action=action
        ).order_by("-created_at")