import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

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


def env_list(name: str, default: str = "") -> list[str]:
    """Comma-separated env var -> clean list (no blanks, no trailing slashes)."""
    return [v.strip().rstrip("/") for v in os.environ.get(name, default).split(",") if v.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

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
        ]
        + env_list("DJANGO_ALLOWED_HOSTS")
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
    "anime.middleware.TitleLanguageMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Vercel terminates HTTPS at its proxy; this makes Django see requests as secure.
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
_default_sqlite = "/tmp/db.sqlite3" if ON_VERCEL else str(BASE_DIR / "db.sqlite3")
DATABASES = {
    "default": dj_database_url.parse(
        os.environ.get("DATABASE_URL") or f"sqlite:///{_default_sqlite}",
        conn_max_age=600,
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
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(hours=1), "REFRESH_TOKEN_LIFETIME": timedelta(days=14)}

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
            "https://www.anicatz.com",
            "https://anicatz-7v6u.vercel.app",
            "https://anicatz.com",
            "https://www.anicatz.com",
        ]
        + env_list("CORS_ALLOWED_ORIGINS")
    )
)

# Needed for admin / session-cookie POSTs coming from these HTTPS sites.
CSRF_TRUSTED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o.startswith("https://")]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
