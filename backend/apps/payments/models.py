import uuid
from django.db import models
from django.conf import settings


class Payment(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_FAILED = 'failed'
    STATUS_EXPIRED = 'expired'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает оплаты'),
        (STATUS_PAID, 'Оплачено'),
        (STATUS_FAILED, 'Ошибка'),
        (STATUS_EXPIRED, 'Истёк срок'),
        (STATUS_CANCELLED, 'Отменён'),
    ]

    PERIOD_1 = 1
    PERIOD_3 = 3
    PERIOD_6 = 6
    PERIOD_CHOICES = [
        (PERIOD_1, '1 месяц'),
        (PERIOD_3, '3 месяца'),
        (PERIOD_6, '6 месяцев'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='Клиент'
    )
    amount = models.DecimalField('Сумма', max_digits=10, decimal_places=2)
    period_months = models.IntegerField('Период (мес)', choices=PERIOD_CHOICES)
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    tariff = models.CharField('Тариф', max_length=50)

    # Kaspi Pay integration
    kaspi_payment_id = models.CharField('Kaspi ID', max_length=200, blank=True)
    kaspi_qr_url = models.URLField('QR URL', blank=True)
    kaspi_qr_token = models.CharField('QR Token', max_length=500, blank=True)

    # When subscription was extended
    extended_from = models.DateField('Продлено с', null=True, blank=True)
    extended_to = models.DateField('Продлено до', null=True, blank=True)

    notes = models.TextField('Заметки', blank=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    paid_at = models.DateTimeField('Оплачен', null=True, blank=True)
    updated_at = models.DateTimeField('Обновлен', auto_now=True)

    class Meta:
        verbose_name = 'Платёж'
        verbose_name_plural = 'Платежи'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.amount} KZT ({self.period_months} мес.) [{self.status}]"

    @staticmethod
    def calculate_amount(tariff: str, months: int) -> float:
        base_price = settings.TARIFF_PRICES.get(tariff, 0)
        if months == 1:
            return base_price * 1
        elif months == 3:
            return base_price * 3 * settings.DISCOUNT_3_MONTHS
        elif months == 6:
            return base_price * 6 * settings.DISCOUNT_6_MONTHS
        return base_price * months
