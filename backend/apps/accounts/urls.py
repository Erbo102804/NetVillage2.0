from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.profile_view, name='profile'),
    path('change-password/', views.change_password_view, name='change_password'),
    path('change-pppoe-password/', views.change_pppoe_password_view, name='change_pppoe_password'),
]
