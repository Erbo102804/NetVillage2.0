from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.conf import settings
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'phone'

    def validate(self, attrs):
        # Allow login by phone
        phone = attrs.get('phone', attrs.get(self.username_field))
        attrs[self.username_field] = phone
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    tariff_price = serializers.SerializerMethodField()
    tariff_speed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'full_name', 'username', 'role',
            'pppoe_login', 'tariff', 'tariff_price', 'tariff_speed',
            'is_active_subscription', 'subscription_end',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'role']

    def get_tariff_price(self, obj):
        return settings.TARIFF_PRICES.get(obj.tariff, 0)

    def get_tariff_speed(self, obj):
        return settings.TARIFF_SPEEDS.get(obj.tariff, 'Неизвестно')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError('Пароли не совпадают')
        return data


class ChangePPPoEPasswordSerializer(serializers.Serializer):
    new_pppoe_password = serializers.CharField(required=True, min_length=6)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_pppoe_password'] != data['confirm_password']:
            raise serializers.ValidationError('Пароли не совпадают')
        return data


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'phone']

    def validate_phone(self, value):
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(phone=value).exists():
            raise serializers.ValidationError('Этот номер телефона уже используется')
        return value
