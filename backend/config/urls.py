from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django's built-in admin. Not "/admin/": that prefix belongs to the
    # React app (/admin/occasions, /admin/services...).
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.core.urls")),
    path("api/clients/", include("apps.clients.urls")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/", include("apps.reservations.urls")),
]
