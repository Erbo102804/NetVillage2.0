from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.accounts.models import User
from apps.payments.models import Payment
from apps.mikrotik.client import MikroTikClient
from .permissions import IsAdminRole
from .serializers import (
    AdminClientSerializer,
    CreateClientSerializer,
    ManualExtendSerializer,
    ChangeTariffSerializer,
    AdminPaymentSerializer,
)


def admin_permission(func):
    """Decorator that applies IsAdminRole check."""
    from functools import wraps
    from rest_framework.decorators import permission_classes as pc

    @wraps(func)
    def wrapper(request, *args, **kwargs):
        perm = IsAdminRole()
        if not perm.has_permission(request, None):
            return Response({'detail': 'Доступ запрещён'}, status=status.HTTP_403_FORBIDDEN)
        return func(request, *args, **kwargs)
    return wrapper


# -------------------------------------------------------------------------
# Client management
# -------------------------------------------------------------------------

@api_view(['GET'])
def client_list(request):
    """List all clients with filters."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    search = request.GET.get('search', '')
    tariff_filter = request.GET.get('tariff', '')
    active_filter = request.GET.get('active', '')

    qs = User.objects.filter(role=User.ROLE_CLIENT).order_by('-created_at')
    if search:
        qs = qs.filter(
            Q(full_name__icontains=search) |
            Q(phone__icontains=search) |
            Q(pppoe_login__icontains=search)
        )
    if tariff_filter:
        qs = qs.filter(tariff=tariff_filter)
    if active_filter in ('true', '1'):
        qs = qs.filter(is_active_subscription=True)
    elif active_filter in ('false', '0'):
        qs = qs.filter(is_active_subscription=False)

    serializer = AdminClientSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_client(request):
    """Create new client (DB + MikroTik)."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    serializer = CreateClientSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    months = data.pop('subscription_months', 1)

    # Calculate expiry
    expire_date = date.today() + timedelta(days=30 * months)

    # Create DB user
    user = User.objects.create_user(
        username=data['pppoe_login'],
        phone=data['phone'],
        password=data['pppoe_password'],
        full_name=data['full_name'],
        pppoe_login=data['pppoe_login'],
        pppoe_password=data['pppoe_password'],
        tariff=data['tariff'],
        role=User.ROLE_CLIENT,
        subscription_end=expire_date,
        is_active_subscription=True,
    )

    # Create in MikroTik
    mt_error = None
    try:
        mt = MikroTikClient()
        comment = f'expire:{expire_date.isoformat()}'
        mt.create_pppoe_secret(
            login=data['pppoe_login'],
            password=data['pppoe_password'],
            profile=data['tariff'],
            comment=comment,
        )
    except Exception as e:
        mt_error = str(e)

    response_data = AdminClientSerializer(user).data
    if mt_error:
        response_data['mikrotik_warning'] = f'Клиент создан в БД, но ошибка MikroTik: {mt_error}'

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
def client_detail(request, user_id):
    """Get, update, or delete a client."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        user = User.objects.get(id=user_id, role=User.ROLE_CLIENT)
    except User.DoesNotExist:
        return Response({'detail': 'Клиент не найден'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminClientSerializer(user).data)

    if request.method == 'DELETE':
        pppoe_login = user.pppoe_login
        user.delete()
        # Optionally remove from MikroTik (comment out if you want to keep)
        # try:
        #     mt = MikroTikClient()
        #     secret = mt.get_pppoe_secret(pppoe_login)
        #     if secret:
        #         ...
        # except Exception:
        #     pass
        return Response({'detail': 'Клиент удалён'})

    # PATCH
    allowed_fields = ['full_name', 'phone']
    for field in allowed_fields:
        if field in request.data:
            setattr(user, field, request.data[field])
    user.save()
    return Response(AdminClientSerializer(user).data)


@api_view(['POST'])
def change_tariff(request, user_id):
    """Change client tariff."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        user = User.objects.get(id=user_id, role=User.ROLE_CLIENT)
    except User.DoesNotExist:
        return Response({'detail': 'Клиент не найден'}, status=404)

    serializer = ChangeTariffSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    new_tariff = serializer.validated_data['tariff']
    old_tariff = user.tariff

    try:
        mt = MikroTikClient()
        mt.set_tariff(user.pppoe_login, new_tariff)
        mt.remove_pppoe_active_session(user.pppoe_login)
    except Exception as e:
        return Response({'detail': f'Ошибка MikroTik: {e}'}, status=500)

    user.tariff = new_tariff
    user.save(update_fields=['tariff'])
    return Response({
        'detail': f'Тариф изменён: {old_tariff} → {new_tariff}',
        'client': AdminClientSerializer(user).data,
    })


@api_view(['POST'])
def manual_extend(request, user_id):
    """Manually extend client subscription."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        user = User.objects.get(id=user_id, role=User.ROLE_CLIENT)
    except User.DoesNotExist:
        return Response({'detail': 'Клиент не найден'}, status=404)

    serializer = ManualExtendSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    months = serializer.validated_data['months']
    from_date = serializer.validated_data.get('from_date') or date.today()
    current_end = user.subscription_end or from_date
    start = max(from_date, current_end)
    new_end = start + timedelta(days=30 * months)

    # Update MikroTik
    try:
        mt = MikroTikClient()
        mt.set_expiry_date(user.pppoe_login, new_end)
        mt.enable_pppoe_secret(user.pppoe_login)
    except Exception as e:
        return Response({'detail': f'Ошибка MikroTik: {e}'}, status=500)

    # Record manual payment
    Payment.objects.create(
        user=user,
        amount=Decimal('0'),
        period_months=months,
        status=Payment.STATUS_PAID,
        tariff=user.tariff,
        extended_from=start,
        extended_to=new_end,
        notes='Продлено администратором вручную',
        paid_at=timezone.now(),
    )

    user.subscription_end = new_end
    user.is_active_subscription = True
    user.save(update_fields=['subscription_end', 'is_active_subscription'])

    return Response({
        'detail': f'Подписка продлена до {new_end}',
        'client': AdminClientSerializer(user).data,
    })


@api_view(['POST'])
def toggle_client(request, user_id):
    """Enable or disable client access."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        user = User.objects.get(id=user_id, role=User.ROLE_CLIENT)
    except User.DoesNotExist:
        return Response({'detail': 'Клиент не найден'}, status=404)

    action = request.data.get('action')
    if action not in ('enable', 'disable'):
        return Response({'detail': 'action должен быть enable или disable'}, status=400)

    try:
        mt = MikroTikClient()
        if action == 'enable':
            mt.enable_pppoe_secret(user.pppoe_login)
        else:
            mt.disable_pppoe_secret(user.pppoe_login)
            mt.remove_pppoe_active_session(user.pppoe_login)
    except Exception as e:
        return Response({'detail': f'Ошибка MikroTik: {e}'}, status=500)

    return Response({'detail': f'Клиент {"включён" if action == "enable" else "отключён"}'})


# -------------------------------------------------------------------------
# Statistics
# -------------------------------------------------------------------------

@api_view(['GET'])
def statistics(request):
    """Admin dashboard statistics."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    paid_payments = Payment.objects.filter(status=Payment.STATUS_PAID)

    # Revenue
    revenue_today = paid_payments.filter(
        paid_at__date=today
    ).aggregate(total=Sum('amount'))['total'] or 0

    revenue_week = paid_payments.filter(
        paid_at__date__gte=week_ago
    ).aggregate(total=Sum('amount'))['total'] or 0

    revenue_month = paid_payments.filter(
        paid_at__date__gte=month_ago
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Clients
    total_clients = User.objects.filter(role=User.ROLE_CLIENT).count()
    active_clients = User.objects.filter(
        role=User.ROLE_CLIENT,
        is_active_subscription=True,
        subscription_end__gte=today,
    ).count()

    # Expiring soon (next 7 days)
    expiring_soon = User.objects.filter(
        role=User.ROLE_CLIENT,
        is_active_subscription=True,
        subscription_end__gte=today,
        subscription_end__lte=today + timedelta(days=7),
    ).count()

    # Monthly revenue chart (last 6 months)
    monthly_chart = (
        paid_payments
        .filter(paid_at__date__gte=today - timedelta(days=180))
        .annotate(month=TruncMonth('paid_at'))
        .values('month')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('month')
    )

    # Daily chart (last 30 days)
    daily_chart = (
        paid_payments
        .filter(paid_at__date__gte=month_ago)
        .annotate(day=TruncDate('paid_at'))
        .values('day')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('day')
    )

    # Tariff distribution
    tariff_dist = (
        User.objects.filter(role=User.ROLE_CLIENT, tariff__isnull=False)
        .exclude(tariff='')
        .values('tariff')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'revenue': {
            'today': float(revenue_today),
            'week': float(revenue_week),
            'month': float(revenue_month),
        },
        'clients': {
            'total': total_clients,
            'active': active_clients,
            'inactive': total_clients - active_clients,
            'expiring_soon': expiring_soon,
        },
        'charts': {
            'monthly': [
                {'month': r['month'].strftime('%Y-%m'), 'total': float(r['total']), 'count': r['count']}
                for r in monthly_chart
            ],
            'daily': [
                {'day': r['day'].isoformat(), 'total': float(r['total']), 'count': r['count']}
                for r in daily_chart
            ],
        },
        'tariff_distribution': list(tariff_dist),
    })


@api_view(['GET'])
def payment_list(request):
    """Admin: list all payments."""
    if not IsAdminRole().has_permission(request, None):
        return Response({'detail': 'Forbidden'}, status=403)

    qs = Payment.objects.select_related('user').order_by('-created_at')[:200]
    return Response(AdminPaymentSerializer(qs, many=True).data)
