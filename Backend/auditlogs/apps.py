from django.apps import AppConfig


class AuditlogsConfig(AppConfig):
    """
    Configuration for Audit Logs application.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "auditlogs"
    verbose_name = "Audit Logs"

    def ready(self):
        """
        Import signals when Django starts.
        """
        import auditlogs.signals