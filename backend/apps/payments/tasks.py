from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_pending_payments():
    """Periodically check Kaspi for pending payment confirmations."""
    from .models import Payment
    from apps.kaspi.client import KaspiPayClient
    from .views import _process_successful_payment

    cutoff = timezone.now() - timedelta(hours=1)
    pending = Payment.objects.filter(
        status=Payment.STATUS_PENDING,
        created_at__gte=cutoff,
        kaspi_payment_id__isnull=False,
    ).exclude(kaspi_payment_id='')

    kaspi = KaspiPayClient()
    for payment in pending:
        try:
            paid_status = kaspi.check_payment_status(payment.kaspi_payment_id)
            if paid_status == 'paid':
                _process_successful_payment(payment)
                # Notify WebSocket
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'payment_{payment.id}',
                    {'type': 'payment_update', 'status': 'paid', 'payment_id': str(payment.id)}
                )
                logger.info(f'Payment {payment.id} confirmed and subscription extended')
        except Exception as e:
            logger.error(f'Error checking payment {payment.id}: {e}')


@shared_task
def expire_pending_payments():
    """Mark old pending payments as expired."""
    from .models import Payment
    cutoff = timezone.now() - timedelta(hours=24)
    expired = Payment.objects.filter(
        status=Payment.STATUS_PENDING,
        created_at__lt=cutoff,
    )
    count = expired.update(status=Payment.STATUS_EXPIRED)
    logger.info(f'Expired {count} stale pending payments')
