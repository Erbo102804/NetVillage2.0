from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Payment
from .serializers import PaymentSerializer, CreatePaymentSerializer, PriceCalculationSerializer
from apps.kaspi.client import KaspiPayClient
from apps.mikrotik.client import MikroTikClient


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """Client's own payment history."""
    payments = Payment.objects.filter(user=request.user).order_by('-created_at')
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment(request):
    """Create new payment and get Kaspi QR."""
    serializer = CreatePaymentSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    period_months = serializer.validated_data['period_months']
    amount_info = serializer.get_amount_info(user, period_months)
    total = Decimal(str(amount_info['total']))

    # Create pending payment
    payment = Payment.objects.create(
        user=user,
        amount=total,
        period_months=period_months,
        tariff=user.tariff,
        status=Payment.STATUS_PENDING,
    )

    # Get Kaspi QR
    try:
        kaspi = KaspiPayClient()
        qr_data = kaspi.create_payment_link(
            payment_id=str(payment.id),
            amount=float(total),
            description=f"NetVillage: {user.pppoe_login} - {period_months} мес.",
        )
        payment.kaspi_payment_id = qr_data.get('payment_id', '')
        payment.kaspi_qr_url = qr_data.get('qr_url', '')
        payment.kaspi_qr_token = qr_data.get('token', '')
        payment.save(update_fields=['kaspi_payment_id', 'kaspi_qr_url', 'kaspi_qr_token'])
    except Exception as e:
        # If Kaspi fails, still return payment with manual instructions
        payment.notes = f'Kaspi error: {str(e)}'
        payment.save(update_fields=['notes'])

    return Response({
        'payment': PaymentSerializer(payment).data,
        'amount_info': amount_info,
        'qr_url': payment.kaspi_qr_url,
        'payment_id': str(payment.id),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, payment_id):
    """Check payment status (for polling / WebSocket fallback)."""
    try:
        payment = Payment.objects.get(id=payment_id, user=request.user)
    except Payment.DoesNotExist:
        return Response({'detail': 'Платёж не найден'}, status=status.HTTP_404_NOT_FOUND)

    # Check with Kaspi if still pending
    if payment.status == Payment.STATUS_PENDING and payment.kaspi_payment_id:
        try:
            kaspi = KaspiPayClient()
            kaspi_status = kaspi.check_payment_status(payment.kaspi_payment_id)
            if kaspi_status == 'paid':
                _process_successful_payment(payment)
        except Exception:
            pass

    return Response(PaymentSerializer(payment).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_price(request):
    """Calculate payment amount for given period."""
    serializer = PriceCalculationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    period_months = serializer.validated_data['period_months']

    if not user.tariff:
        return Response({'detail': 'Тариф не назначен'}, status=status.HTTP_400_BAD_REQUEST)

    create_s = CreatePaymentSerializer(context={'request': request})
    amount_info = create_s.get_amount_info(user, period_months)
    return Response(amount_info)


def _process_successful_payment(payment: Payment):
    """Extend MikroTik subscription after successful payment."""
    from django.conf import settings
    user = payment.user

    # Calculate new expiry
    today = date.today()
    current_end = user.subscription_end or today
    start_from = max(today, current_end)
    new_end = start_from + timedelta(days=30 * payment.period_months)

    payment.extended_from = start_from
    payment.extended_to = new_end
    payment.status = Payment.STATUS_PAID
    payment.paid_at = timezone.now()
    payment.save(update_fields=['extended_from', 'extended_to', 'status', 'paid_at'])

    # Update MikroTik
    try:
        mt = MikroTikClient()
        mt.set_expiry_date(user.pppoe_login, new_end)
        mt.enable_pppoe_secret(user.pppoe_login)
    except Exception:
        pass

    # Update user record
    user.subscription_end = new_end
    user.is_active_subscription = True
    user.save(update_fields=['subscription_end', 'is_active_subscription'])
