from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for NetVillage clients."""
    ROLE_CLIENT = 'client'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_CLIENT, 'Клиент'),
        (ROLE_ADMIN, 'Администратор'),
    ]

    phone = models.CharField('Телефон', max_length=20, unique=True)
    role = models.CharField('Роль', max_length=20, choices=ROLE_CHOICES, default=ROLE_CLIENT)
    full_name = models.CharField('Полное имя', max_length=200, blank=True)

    # MikroTik connection
    pppoe_login = models.CharField('PPPoE логин', max_length=100, blank=True, unique=True, null=True)
    pppoe_password = models.CharField('PPPoE пароль', max_length=100, blank=True)

    # Tariff info
    tariff = models.CharField('Тариф', max_length=50, blank=True)

    # MikroTik secret ID for direct API access
    mikrotik_id = models.CharField('MikroTik ID', max_length=50, blank=True)

    is_active_subscription = models.BooleanField('Подписка активна', default=False)
    subscription_end = models.DateField('Дата окончания', null=True, blank=True)

    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлен', auto_now=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f"{self.full_name or self.username} ({self.phone})"

    @property
    def display_name(self):
        return self.full_name or self.username

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_staff

    def get_tariff_price(self):
        from django.conf import settings
        return settings.TARIFF_PRICES.get(self.tariff, 0)

    def get_tariff_speed(self):
        from django.conf import settings
        return settings.TARIFF_SPEEDS.get(self.tariff, 'Неизвестно')
