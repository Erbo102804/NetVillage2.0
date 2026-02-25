from django.urls import path
from . import views

urlpatterns = [
    path('my-status/', views.my_status, name='mikrotik_my_status'),
    path('clients/', views.list_clients, name='mikrotik_list_clients'),
    path('router-status/', views.router_status, name='mikrotik_router_status'),
    path('profiles/', views.get_profiles, name='mikrotik_profiles'),
]
