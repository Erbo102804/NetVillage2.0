from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow access only to users with admin role or staff flag."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')
        )
