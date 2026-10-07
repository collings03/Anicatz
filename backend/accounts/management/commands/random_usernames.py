from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from accounts.names import generate_username


class Command(BaseCommand):
    help = "Give every non-staff user a random anime username"

    def handle(self, *args, **opts):
        User = get_user_model()
        for u in User.objects.filter(is_staff=False):
            u.username = generate_username()
            u.save(update_fields=["username"])
            self.stdout.write(f"{u.pk} -> {u.username}")
