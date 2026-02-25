"""
Kaspi Pay webhook handler.

Kaspi calls this endpoint when payment is completed.
"""
import json
import logging

from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from apps.payments.models import Payment
from apps.payments.views import _process_successful_payment
from .client import KaspiPayClient

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def kaspi_webhook(request):
    """
    Kaspi Pay payment confirmation webhook.
    Kaspi sends POST when payment is confirmed.
    """
    # Verify signature
    signature = request.headers.get('X-Signature', '')
    if signature:
        kaspi = KaspiPayClient()
        if not kaspi.verify_webhook_signature(request.body, signature):
            logger.warning('Kaspi webhook: invalid signature')
            return Response({'error': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        data = request.data
        logger.info(f'Kaspi webhook received: {data}')

        kaspi_payment_id = data.get('id') or data.get('paymentId')
        external_id = data.get('externalId') or data.get('merchantOrderId')
        payment_status = str(data.get('status', '')).upper()

        if payment_status not in ('SUCCESS', 'COMPLETED'):
            return Response({'status': 'ignored'})

        # Find payment by external_id (our UUID) or kaspi_payment_id
        payment = None
        if external_id:
            try:
                payment = Payment.objects.get(id=external_id, status=Payment.STATUS_PENDING)
            except Payment.DoesNotExist:
                pass

        if not payment and kaspi_payment_id:
            try:
                payment = Payment.objects.get(kaspi_payment_id=kaspi_payment_id, status=Payment.STATUS_PENDING)
            except Payment.DoesNotExist:
                pass

        if not payment:
            logger.warning(f'Kaspi webhook: payment not found for id={external_id}')
            return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)

        _process_successful_payment(payment)

        # Notify WebSocket clients
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'payment_{payment.id}',
                {'type': 'payment_update', 'status': 'paid', 'payment_id': str(payment.id)}
            )
        except Exception as ws_err:
            logger.warning(f'WebSocket notify failed: {ws_err}')

        return Response({'status': 'ok'})

    except Exception as e:
        logger.error(f'Kaspi webhook error: {e}', exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
