from django.urls import path
from . import views

urlpatterns = [
    path('clients/', views.client_list, name='admin_client_list'),
    path('clients/create/', views.create_client, name='admin_create_client'),
    path('clients/<int:user_id>/', views.client_detail, name='admin_client_detail'),
    path('clients/<int:user_id>/tariff/', views.change_tariff, name='admin_change_tariff'),
    path('clients/<int:user_id>/extend/', views.manual_extend, name='admin_manual_extend'),
    path('clients/<int:user_id>/toggle/', views.toggle_client, name='admin_toggle_client'),
    path('statistics/', views.statistics, name='admin_statistics'),
    path('payments/', views.payment_list, name='admin_payment_list'),
]
