import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

# python-dotenv is optional: locally it loads .env, on Vercel the env vars come from the dashboard.
# Wrapped so a missing package can never crash the serverless function on import.
try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

BASE_DIR = Path(__file__).resolve().parent.parent
if load_dotenv:
    load_dotenv(BASE_DIR.parent / ".env")

ON_VERCEL = bool(os.environ.get("VERCEL"))
ON_RENDER = bool(os.environ.get("RENDER"))  # Render sets RENDER=true on its servers


def env_list(name: str, default: str = "") -> list[str]:
    """Comma-separated env var -> clean list (no blanks, no trailing slashes)."""
    return [v.strip().rstrip("/") for v in os.environ.get(name, default).split(",") if v.strip()]


_INSECURE_KEY = "dev-insecure-change-me"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", _INSECURE_KEY)
# Debug is ON by default on your PC and OFF by default on Vercel/Render, so a forgotten variable can't expose it.
DEBUG = os.environ.get("DJANGO_DEBUG", "0" if (ON_VERCEL or ON_RENDER) else "1") == "1"

# The secret key signs every login token. With the public default anyone could forge a token,
# so production refuses to start without a real one. NEVER change it after launch: that logs everyone out.
if not DEBUG and SECRET_KEY == _INSECURE_KEY:
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY in the environment (Render -> Environment, or Vercel -> Settings -> Environment Variables).")

# Hostnames only: NO ports and NO https://. These are the hosts THIS Django server answers to.
# ".vercel.app" (leading dot) also allows Vercel's per-deployment preview URLs.
# Extra hosts can be added via DJANGO_ALLOWED_HOSTS in the environment.
ALLOWED_HOSTS = sorted(
    set(
        [
            "localhost",
            "127.0.0.1",
            "anicatz-7v6u.vercel.app",
            ".vercel.app",
            "anicatz.com",
            "www.anicatz.com",
            "anicatz.onrender.com",
            "anicatz-1.onrender.com",  # your live Render backend
        ]
        + env_list("DJANGO_ALLOWED_HOSTS")
        # Render tells the app its own address (my-service.onrender.com), so it never needs adding by hand.
        + ([os.environ["RENDER_EXTERNAL_HOSTNAME"]] if os.environ.get("RENDER_EXTERNAL_HOSTNAME") else [])
    )
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "anime",
    "accounts",
    "watchlist",
    "comments",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serves the admin's CSS/JS on gunicorn
    "anime.middleware.TitleLanguageMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Vercel and Render terminate HTTPS at their proxy; this makes Django see requests as secure.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# On Vercel the project folder is read-only, so the SQLite fallback must live in /tmp.
# That data is temporary and is lost between invocations: set DATABASE_URL to a hosted
# Postgres (Neon, Supabase, Vercel Postgres) for real accounts/watchlists/comments.
# Render's disk is also wiped on every deploy unless you attach a paid disk, so set DATABASE_URL there too.
_default_sqlite = "/tmp/db.sqlite3" if ON_VERCEL else str(BASE_DIR / "db.sqlite3")
DATABASES = {
    "default": dj_database_url.parse(
        os.environ.get("DATABASE_URL") or f"sqlite:///{_default_sqlite}",
        conn_max_age=600,
        conn_health_checks=True,
    )
}

CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "600"))
if os.environ.get("REDIS_URL"):
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": os.environ["REDIS_URL"]}}
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

# Login tokens. The frontend (lib/auth.ts) renews the short access token automatically.
# ROTATE_REFRESH_TOKENS hands back a NEW refresh token on every renewal, so anyone who visits at least
# once every 60 days stays logged in for good.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=60),
    "ROTATE_REFRESH_TOKENS": True,
    "UPDATE_LAST_LOGIN": True,
}

# Websites (frontends) that are allowed to call this API from the browser.
# Needs scheme + host + port, no trailing slash. localhost and 127.0.0.1 are different origins,
# and so are anicatz.com and www.anicatz.com.
# For a phone on your Wi-Fi, add e.g. http://192.168.1.5:3000 via CORS_ALLOWED_ORIGINS in .env
CORS_ALLOWED_ORIGINS = sorted(
    set(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://anicatz.vercel.app",
            "https://anicatz-7v6u.vercel.app",
            "https://anicatz.com",
            "https://www.anicatz.com",
            "https://anicatz.onrender.com",
            "https://anicatz-1.onrender.com",
        ]
        + env_list("CORS_ALLOWED_ORIGINS")
    )
)

# Vercel preview deployments get their own random URLs (anicatz-xxxx-yourname.vercel.app).
# This lets those previews call the API too, without listing each one.
CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://anicatz[a-z0-9-]*\.vercel\.app$"]

# Needed for admin / session-cookie POSTs coming from these HTTPS sites.
CSRF_TRUSTED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o.startswith("https://")]

# Hosts the episode checker may contact (your video provider domains, comma-separated, no https://).
# Empty = any public host. Set it in production, e.g. EPISODE_CHECK_HOSTS=provider-one.com,provider-two.net
EPISODE_CHECK_HOSTS = [h.lower() for h in env_list("EPISODE_CHECK_HOSTS")]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise compresses the collected static files (admin CSS/JS) for gunicorn.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"