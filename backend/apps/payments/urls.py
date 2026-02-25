from django.urls import path
from . import views

urlpatterns = [
    path('history/', views.payment_history, name='payment_history'),
    path('create/', views.create_payment, name='create_payment'),
    path('status/<uuid:payment_id>/', views.payment_status, name='payment_status'),
    path('calculate/', views.calculate_price, name='calculate_price'),
]
