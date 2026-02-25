from rest_framework import serializers
from django.conf import settings
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    period_label = serializers.SerializerMethodField()
    discount_info = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'user_name', 'amount', 'period_months', 'period_label',
            'status', 'tariff', 'kaspi_payment_id', 'kaspi_qr_url',
            'extended_from', 'extended_to', 'notes', 'discount_info',
            'created_at', 'paid_at',
        ]
        read_only_fields = ['id', 'created_at', 'paid_at', 'user']

    def get_period_label(self, obj):
        labels = {1: '1 месяц', 3: '3 месяца', 6: '6 месяцев'}
        return labels.get(obj.period_months, f'{obj.period_months} мес.')

    def get_discount_info(self, obj):
        if obj.period_months == 3:
            return '−7%'
        elif obj.period_months == 6:
            return '−13%'
        return None


class CreatePaymentSerializer(serializers.Serializer):
    period_months = serializers.ChoiceField(choices=[1, 3, 6])

    def validate(self, data):
        user = self.context['request'].user
        if not user.tariff:
            raise serializers.ValidationError('Тариф не назначен. Обратитесь к администратору.')
        return data

    def get_amount_info(self, user, period_months):
        tariff = user.tariff
        base_price = settings.TARIFF_PRICES.get(tariff, 0)
        total = Payment.calculate_amount(tariff, period_months)
        discount = None
        if period_months == 3:
            discount = {'percent': 7, 'saved': round(base_price * 3 - total, 2)}
        elif period_months == 6:
            discount = {'percent': 13, 'saved': round(base_price * 6 - total, 2)}
        return {
            'tariff': tariff,
            'period_months': period_months,
            'base_price': base_price,
            'total': round(total, 2),
            'discount': discount,
        }


class PriceCalculationSerializer(serializers.Serializer):
    period_months = serializers.ChoiceField(choices=[1, 3, 6])
