from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    ChangePPPoEPasswordSerializer,
    UserProfileUpdateSerializer,
)
from apps.mikrotik.client import MikroTikClient


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'detail': 'Выход выполнен успешно'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user

    if request.method == 'GET':
        # Sync with MikroTik to get fresh data
        try:
            mt = MikroTikClient()
            mt_data = mt.get_pppoe_secret(user.pppoe_login)
            if mt_data:
                # Parse expiry from comment
                comment = mt_data.get('comment', '')
                if 'expire:' in comment:
                    from datetime import date
                    expire_str = comment.split('expire:')[1].split()[0]
                    expire_date = date.fromisoformat(expire_str)
                    user.subscription_end = expire_date
                    user.tariff = mt_data.get('profile', user.tariff)
                    user.is_active_subscription = expire_date >= date.today()
                    user.save(update_fields=['subscription_end', 'tariff', 'is_active_subscription'])
        except Exception:
            pass
        return Response(UserSerializer(user).data)

    elif request.method == 'PATCH':
        serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({'old_password': 'Неверный пароль'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'detail': 'Пароль успешно изменён'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_pppoe_password_view(request):
    serializer = ChangePPPoEPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.pppoe_login:
        return Response({'detail': 'PPPoE аккаунт не найден'}, status=status.HTTP_400_BAD_REQUEST)

    new_password = serializer.validated_data['new_pppoe_password']

    try:
        mt = MikroTikClient()
        mt.set_pppoe_password(user.pppoe_login, new_password)
        user.pppoe_password = new_password
        user.save(update_fields=['pppoe_password'])
        return Response({'detail': 'PPPoE пароль успешно изменён'})
    except Exception as e:
        return Response({'detail': f'Ошибка MikroTik: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
