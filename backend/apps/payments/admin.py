from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'amount', 'period_months', 'status', 'tariff', 'created_at', 'paid_at']
    list_filter = ['status', 'period_months', 'tariff']
    search_fields = ['user__phone', 'user__full_name', 'kaspi_payment_id']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
