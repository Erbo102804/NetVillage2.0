from django.urls import path
from . import views

urlpatterns = [
    path('webhook/', views.kaspi_webhook, name='kaspi_webhook'),
]
