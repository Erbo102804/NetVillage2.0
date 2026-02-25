from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['phone', 'full_name', 'pppoe_login', 'tariff', 'is_active_subscription', 'subscription_end', 'role']
    list_filter = ['role', 'is_active_subscription', 'tariff']
    search_fields = ['phone', 'full_name', 'pppoe_login']
    ordering = ['-created_at']
    fieldsets = UserAdmin.fieldsets + (
        ('NetVillage', {'fields': ('phone', 'full_name', 'role', 'pppoe_login', 'pppoe_password', 'tariff', 'mikrotik_id', 'is_active_subscription', 'subscription_end')}),
    )
