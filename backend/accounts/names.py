import random
from django.contrib.auth import get_user_model

ANIME = [
    "Naruto", "Sasuke", "Luffy", "Zoro", "Goku", "Vegeta", "Levi", "Eren", "Mikasa",
    "Tanjiro", "Nezuko", "Gojo", "Itadori", "Deku", "Bakugo", "Saitama", "Killua",
    "Gon", "Light", "Edward", "Spike", "Rem", "Asuka", "Shinji", "Ichigo", "Rukia",
    "Natsu", "Erza", "Yuji", "Anya", "Denji", "Power", "Makima", "Frieren", "Hinata",
]
SUFFIX = [
    "Senpai", "Chan", "Kun", "Sama", "Hunter", "Ninja", "Slayer", "Pirate", "Otaku",
    "Sensei", "Samurai", "Wolf", "Fox", "Neko", "Dragon", "Ronin",
]


def generate_username() -> str:
    """Random anime-style name that no other user has, e.g. LuffySenpai482."""
    User = get_user_model()
    for _ in range(40):
        name = f"{random.choice(ANIME)}{random.choice(SUFFIX)}{random.randint(10, 9999)}"
        if not User.objects.filter(username__iexact=name).exists():
            return name
    return f"Otaku{random.randint(100000, 999999)}"
