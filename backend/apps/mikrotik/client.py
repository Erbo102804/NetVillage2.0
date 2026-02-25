"""
MikroTik RouterOS API client for NetVillage ISP.

Uses librouteros to communicate with MikroTik hEX S (RB760iGS)
RouterOS 6.49.11 at 10.1.100.1.

PPPoE secrets have a comment format: expire:YYYY-MM-DD
Profiles: tariff-7mbps, tariff-10mbps, tariff-15mbps, tariff-25mbps
"""
import logging
from datetime import date
from typing import Optional, Dict, List, Any

import librouteros
from django.conf import settings

logger = logging.getLogger(__name__)

TARIFF_PROFILES = ['tariff-7mbps', 'tariff-10mbps', 'tariff-15mbps', 'tariff-25mbps']


class MikroTikClient:
    def __init__(self):
        self.host = settings.MIKROTIK_HOST
        self.user = settings.MIKROTIK_USER
        self.password = settings.MIKROTIK_PASSWORD
        self.port = settings.MIKROTIK_PORT

    def _connect(self):
        return librouteros.connect(
            host=self.host,
            username=self.user,
            password=self.password,
            port=self.port,
            timeout=10,
        )

    # -------------------------------------------------------------------------
    # PPPoE Secrets (clients)
    # -------------------------------------------------------------------------

    def get_all_pppoe_secrets(self) -> List[Dict]:
        """Return all PPPoE secrets with parsed expiry dates."""
        api = self._connect()
        try:
            secrets = list(api(cmd='/ppp/secret/print'))
            result = []
            for s in secrets:
                parsed = self._parse_secret(s)
                result.append(parsed)
            return result
        finally:
            api.close()

    def get_pppoe_secret(self, login: str) -> Optional[Dict]:
        """Get a single PPPoE secret by login name."""
        if not login:
            return None
        api = self._connect()
        try:
            secrets = list(api(cmd='/ppp/secret/print', **{'?name': login}))
            if secrets:
                return self._parse_secret(secrets[0])
            return None
        finally:
            api.close()

    def _parse_secret(self, secret: Dict) -> Dict:
        """Parse raw MikroTik secret dict and extract expiry date."""
        comment = secret.get('comment', '')
        expire_date = None
        if 'expire:' in comment:
            try:
                expire_str = comment.split('expire:')[1].strip().split()[0]
                expire_date = date.fromisoformat(expire_str)
            except (ValueError, IndexError):
                pass

        today = date.today()
        is_active = expire_date is not None and expire_date >= today if expire_date else False

        return {
            'id': secret.get('.id', ''),
            'name': secret.get('name', ''),
            'profile': secret.get('profile', ''),
            'comment': comment,
            'expire_date': expire_date,
            'is_active': is_active,
            'disabled': secret.get('disabled', 'false') == 'true',
            'caller_id': secret.get('caller-id', ''),
            'last_logged_out': secret.get('last-logged-out', ''),
        }

    def create_pppoe_secret(self, login: str, password: str, profile: str, comment: str = '') -> Dict:
        """Create a new PPPoE secret on MikroTik."""
        api = self._connect()
        try:
            result = api(
                cmd='/ppp/secret/add',
                name=login,
                password=password,
                profile=profile,
                service='pppoe',
                comment=comment,
            )
            return {'success': True, 'id': str(result)}
        finally:
            api.close()

    def set_pppoe_password(self, login: str, new_password: str) -> bool:
        """Change password for PPPoE secret."""
        secret = self.get_pppoe_secret(login)
        if not secret:
            raise ValueError(f'PPPoE secret "{login}" not found')
        api = self._connect()
        try:
            api(cmd='/ppp/secret/set', **{'.id': secret['id'], 'password': new_password})
            return True
        finally:
            api.close()

    def set_expiry_date(self, login: str, new_date: date) -> bool:
        """Update the expire: comment on a PPPoE secret."""
        secret = self.get_pppoe_secret(login)
        if not secret:
            raise ValueError(f'PPPoE secret "{login}" not found')

        old_comment = secret.get('comment', '')
        # Replace expire: or add it
        if 'expire:' in old_comment:
            parts = old_comment.split('expire:')
            rest = parts[1].split()[1:] if len(parts[1].split()) > 1 else []
            new_comment = f"{parts[0]}expire:{new_date.isoformat()}"
            if rest:
                new_comment += ' ' + ' '.join(rest)
        else:
            new_comment = f"{old_comment} expire:{new_date.isoformat()}".strip()

        api = self._connect()
        try:
            api(cmd='/ppp/secret/set', **{'.id': secret['id'], 'comment': new_comment})
            return True
        finally:
            api.close()

    def set_tariff(self, login: str, profile: str) -> bool:
        """Change tariff profile for a PPPoE secret."""
        if profile not in TARIFF_PROFILES:
            raise ValueError(f'Invalid profile: {profile}')
        secret = self.get_pppoe_secret(login)
        if not secret:
            raise ValueError(f'PPPoE secret "{login}" not found')
        api = self._connect()
        try:
            api(cmd='/ppp/secret/set', **{'.id': secret['id'], 'profile': profile})
            return True
        finally:
            api.close()

    def enable_pppoe_secret(self, login: str) -> bool:
        """Enable (un-disable) a PPPoE secret."""
        secret = self.get_pppoe_secret(login)
        if not secret:
            raise ValueError(f'PPPoE secret "{login}" not found')
        api = self._connect()
        try:
            api(cmd='/ppp/secret/set', **{'.id': secret['id'], 'disabled': 'no'})
            return True
        finally:
            api.close()

    def disable_pppoe_secret(self, login: str) -> bool:
        """Disable a PPPoE secret (cuts off access)."""
        secret = self.get_pppoe_secret(login)
        if not secret:
            raise ValueError(f'PPPoE secret "{login}" not found')
        api = self._connect()
        try:
            api(cmd='/ppp/secret/set', **{'.id': secret['id'], 'disabled': 'yes'})
            return True
        finally:
            api.close()

    def remove_pppoe_active_session(self, login: str) -> bool:
        """Remove active PPPoE session to force reconnect."""
        api = self._connect()
        try:
            active = list(api(cmd='/ppp/active/print', **{'?name': login}))
            for session in active:
                api(cmd='/ppp/active/remove', **{'.id': session.get('.id', '')})
            return True
        finally:
            api.close()

    # -------------------------------------------------------------------------
    # Status / Info
    # -------------------------------------------------------------------------

    def get_active_sessions(self) -> List[Dict]:
        """Return currently active PPPoE sessions."""
        api = self._connect()
        try:
            return list(api(cmd='/ppp/active/print'))
        finally:
            api.close()

    def get_router_resources(self) -> Dict:
        """Get router system resources."""
        api = self._connect()
        try:
            resources = list(api(cmd='/system/resource/print'))
            return resources[0] if resources else {}
        finally:
            api.close()

    def get_profiles(self) -> List[str]:
        """Return available PPPoE profiles."""
        return TARIFF_PROFILES
