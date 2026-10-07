import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import AVATAR_IDS, Profile


class Command(BaseCommand):
    help = "Give every user without an avatar a random built-in one"

    def handle(self, *args, **opts):
        for u in get_user_model().objects.all():
            p, _ = Profile.objects.get_or_create(user=u)
            if not p.avatar and not p.avatar_preset:
                p.avatar_preset = random.choice(AVATAR_IDS)
                p.save(update_fields=["avatar_preset"])
                self.stdout.write(f"{u.username} -> {p.avatar_preset}")
