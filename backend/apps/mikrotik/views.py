from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .client import MikroTikClient, TARIFF_PROFILES


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_status(request):
    """Get current user's MikroTik connection status."""
    user = request.user
    if not user.pppoe_login:
        return Response({'detail': 'PPPoE аккаунт не привязан'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        mt = MikroTikClient()
        secret = mt.get_pppoe_secret(user.pppoe_login)
        active_sessions = mt.get_active_sessions()
        is_online = any(s.get('name') == user.pppoe_login for s in active_sessions)
        return Response({
            'pppoe_login': user.pppoe_login,
            'profile': secret.get('profile') if secret else user.tariff,
            'expire_date': secret.get('expire_date') if secret else user.subscription_end,
            'is_active': secret.get('is_active', False) if secret else user.is_active_subscription,
            'is_online': is_online,
            'disabled': secret.get('disabled', False) if secret else False,
        })
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_clients(request):
    """Admin: list all PPPoE clients from MikroTik."""
    try:
        mt = MikroTikClient()
        secrets = mt.get_all_pppoe_secrets()
        active_sessions = mt.get_active_sessions()
        online_logins = {s.get('name') for s in active_sessions}
        for s in secrets:
            s['is_online'] = s['name'] in online_logins
        return Response(secrets)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def router_status(request):
    """Admin: get router system resources."""
    try:
        mt = MikroTikClient()
        resources = mt.get_router_resources()
        return Response(resources)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_profiles(request):
    return Response({'profiles': TARIFF_PROFILES})
