"""
Django settings.

All values that change between machines come from environment variables
(see the .env file at the project root). Defaults are safe for local dev.
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


# --- Small helpers to read environment variables -------------------------
def env(name, default=None):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# --- Security -------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend")
CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)

# --- Applications ---------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    # Our apps (one folder per business area, see ARCHITECTURE.md)
    "apps.accounts",
    "apps.core",
    "apps.clients",
    "apps.catalog",
    "apps.reservations",
    "apps.staff",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # Reads the Accept-Language header sent by the frontend (fr / ar)
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database: SQLite stored in a persistent folder ----------------------
# In Docker, DATA_DIR is a named volume, so data survives restarts.
DATA_DIR = Path(env("DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR = Path(env("BACKUP_DIR", str(BASE_DIR / "backups")))

# Uploaded files (employee photos, ID documents). Kept next to the database
# so the same Docker volume keeps them. There is NO public URL for them:
# they are only served through the API to administrators.
MEDIA_ROOT = DATA_DIR / "media"
# Uploads up to 10 MB (an ID document scan); bigger files are refused.
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DATA_DIR / "db.sqlite3",
        "OPTIONS": {
            # WAL mode lets the web server and the worker read/write safely
            # at the same time. IMMEDIATE avoids "database is locked" errors.
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
            "transaction_mode": "IMMEDIATE",
            "timeout": 20,
        },
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

# --- Language & time ------------------------------------------------------
LANGUAGE_CODE = "fr"
LANGUAGES = [("fr", "Français"), ("ar", "العربية")]
TIME_ZONE = env("TZ", "Africa/Algiers")
USE_I18N = True
USE_TZ = True

# --- Static files (only the Django admin uses them) ----------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# --- REST API -------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Every endpoint requires login unless it explicitly says otherwise.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    # Money is returned as a JSON number, easier to use in React.
    "COERCE_DECIMAL_TO_STRING": False,
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
}

# --- Celery (background tasks) -------------------------------------------
CELERY_BROKER_URL = env("CELERY_BROKER_URL", "")
# No broker configured -> run tasks immediately (handy without Docker).
CELERY_TASK_ALWAYS_EAGER = not CELERY_BROKER_URL
if CELERY_TASK_ALWAYS_EAGER:
    CELERY_BROKER_URL = "memory://"
CELERY_TASK_IGNORE_RESULT = True
CELERY_TIMEZONE = TIME_ZONE
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# --- Email ----------------------------------------------------------------
# Default: emails are printed in the worker logs (works offline).
# To send real emails, set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# and the EMAIL_HOST_* values in .env. Real sending needs internet.
EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", "")
EMAIL_PORT = int(env("EMAIL_PORT", "587"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "reservations@localhost")

# --- Logging --------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
}
