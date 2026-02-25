import random
import string
from datetime import date

from rest_framework import serializers
from django.conf import settings

from apps.accounts.models import User
from apps.payments.models import Payment


class AdminClientSerializer(serializers.ModelSerializer):
    tariff_price = serializers.SerializerMethodField()
    tariff_speed = serializers.SerializerMethodField()
    payment_count = serializers.SerializerMethodField()
    last_payment = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'full_name', 'username', 'pppoe_login', 'pppoe_password',
            'tariff', 'tariff_price', 'tariff_speed',
            'is_active_subscription', 'subscription_end',
            'payment_count', 'last_payment',
            'created_at', 'updated_at',
        ]

    def get_tariff_price(self, obj):
        return settings.TARIFF_PRICES.get(obj.tariff, 0)

    def get_tariff_speed(self, obj):
        return settings.TARIFF_SPEEDS.get(obj.tariff, '—')

    def get_payment_count(self, obj):
        return obj.payments.filter(status=Payment.STATUS_PAID).count()

    def get_last_payment(self, obj):
        last = obj.payments.filter(status=Payment.STATUS_PAID).order_by('-paid_at').first()
        if last:
            return {'amount': str(last.amount), 'paid_at': last.paid_at}
        return None


class CreateClientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    tariff = serializers.ChoiceField(choices=list(settings.TARIFF_PRICES.keys()))
    pppoe_login = serializers.CharField(max_length=100, required=False)
    pppoe_password = serializers.CharField(max_length=100, required=False)
    subscription_months = serializers.IntegerField(default=1, min_value=1, max_value=12)

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('Телефон уже используется')
        return value

    def validate_pppoe_login(self, value):
        if value and User.objects.filter(pppoe_login=value).exists():
            raise serializers.ValidationError('PPPoE логин уже используется')
        return value

    @staticmethod
    def generate_password(length=10) -> str:
        chars = string.ascii_letters + string.digits
        return ''.join(random.choices(chars, k=length))

    def validate(self, data):
        if not data.get('pppoe_login'):
            # Auto-generate from full_name
            name = data['full_name'].split()[0].lower()
            base = ''.join(c for c in name if c.isalnum())[:8]
            suffix = ''.join(random.choices(string.digits, k=3))
            data['pppoe_login'] = f"{base}{suffix}"
        if not data.get('pppoe_password'):
            data['pppoe_password'] = self.generate_password()
        return data


class ManualExtendSerializer(serializers.Serializer):
    months = serializers.IntegerField(min_value=1, max_value=12)
    from_date = serializers.DateField(required=False)


class ChangeTariffSerializer(serializers.Serializer):
    tariff = serializers.ChoiceField(choices=list(settings.TARIFF_PRICES.keys()))


class AdminPaymentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
