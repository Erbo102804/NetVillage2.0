from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/mikrotik/', include('apps.mikrotik.urls')),
    path('api/kaspi/', include('apps.kaspi.urls')),
    path('api/admin/', include('apps.admin_panel.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
