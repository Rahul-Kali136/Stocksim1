from django.contrib.auth.hashers import identify_hasher, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models
class CustomUser(AbstractUser):

    admin_id = models.AutoField(primary_key=True)

    email = models.EmailField(unique=True)

    phone_number = models.CharField(max_length=10, blank=True, default="")

    role = models.CharField(
        max_length=20,
        choices=(("Admin", "Admin"),),
        default="Admin"
    )

    state = models.CharField(max_length=100, blank=True, default="")

    avatar = models.TextField(blank=True, null=True)

    reset_otp = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def save(self, *args, **kwargs):
        if not self.pk and not self.admin_id:
            max_id = CustomUser.objects.aggregate(models.Max("admin_id"))["admin_id__max"] or 0
            self.admin_id = max_id + 1

        if not self.username or not self.username.strip():
            base = (self.email or "user").split("@")[0].strip()
            base = base.replace(" ", "_") or "user"
            base = base[:30]

            username = base
            counter = 1
            while CustomUser.objects.filter(username=username).exclude(pk=self.pk).exists():
                username = f"{base}{counter}"
                counter += 1

            self.username = username

        self.username = self.username.strip()

        if self.password:
            if "$" not in str(self.password):
                self.set_password(self.password)
            else:
                try:
                    identify_hasher(self.password)
                except ValueError:
                    self.set_password(self.password)

        if self.reset_otp is None or str(self.reset_otp).strip() == "":
            self.reset_otp = None
        else:
            plain_otp = str(self.reset_otp).strip()
            try:
                identify_hasher(plain_otp)
            except ValueError:
                self.reset_otp = make_password(plain_otp)

        super().save(*args, **kwargs)

    def check_password(self, raw_password):
        try:
            return super().check_password(raw_password)
        except ValueError:
            return False

    def __str__(self):
        return self.username

    class Meta:
        ordering = ["admin_id"]


        