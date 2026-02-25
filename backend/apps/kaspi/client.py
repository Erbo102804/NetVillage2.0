"""
Kaspi Pay integration for NetVillage.

Kaspi Pay (kaspi.kz) is a popular payment platform in Kazakhstan.
This client handles QR code generation and payment status checking.

For QR payments, the flow is:
1. Merchant generates a payment link/QR via Kaspi API
2. Client scans QR in Kaspi app
3. Kaspi calls back the webhook OR merchant polls for status
"""
import logging
import hashlib
import hmac
import json
from typing import Dict, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class KaspiPayClient:
    """
    Kaspi Pay API client.

    Kaspi Pay uses merchant integration where:
    - Merchants register at kaspi.kz/biznes
    - Get merchant_id and API key
    - Can generate payment QR codes that customers scan

    Documentation: https://kaspi.kz/o/kaspipay-api
    """

    def __init__(self):
        self.merchant_id = settings.KASPI_MERCHANT_ID
        self.api_key = settings.KASPI_API_KEY
        self.api_url = settings.KASPI_API_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-Auth': self.api_key,
        })

    def create_payment_link(self, payment_id: str, amount: float, description: str) -> Dict:
        """
        Create a Kaspi Pay payment link and QR code.

        Returns dict with:
          - payment_id: Kaspi internal payment ID
          - qr_url: URL/data for QR code
          - token: payment token for status checks
        """
        payload = {
            'externalId': payment_id,
            'amount': int(amount),  # Kaspi uses integer tenge
            'merchantId': self.merchant_id,
            'description': description,
            'returnUrl': f'{settings.KASPI_API_URL}/return',
        }

        try:
            resp = self.session.post(
                f'{self.api_url}/payments/create',
                json=payload,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                'payment_id': data.get('id', payment_id),
                'qr_url': data.get('qrLink', self._build_manual_qr_url(payment_id, amount)),
                'token': data.get('token', ''),
            }
        except requests.RequestException as e:
            logger.warning(f'Kaspi API error: {e}. Using fallback QR.')
            # Return a fallback deeplink that opens Kaspi app
            return {
                'payment_id': payment_id,
                'qr_url': self._build_manual_qr_url(payment_id, amount),
                'token': '',
            }

    def _build_manual_qr_url(self, payment_id: str, amount: float) -> str:
        """
        Build a Kaspi payment deeplink as fallback.
        Format: https://kaspi.kz/pay/SERVICE_ID?merchantId=X&amount=Y
        """
        return (
            f"https://kaspi.kz/pay/{self.merchant_id}"
            f"?service={self.merchant_id}"
            f"&amount={int(amount)}"
            f"&comment=NetVillage+{payment_id[:8]}"
        )

    def check_payment_status(self, kaspi_payment_id: str) -> str:
        """
        Check payment status from Kaspi.
        Returns: 'paid', 'pending', 'failed', 'expired'
        """
        try:
            resp = self.session.get(
                f'{self.api_url}/payments/{kaspi_payment_id}',
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            status_map = {
                'SUCCESS': 'paid',
                'COMPLETED': 'paid',
                'PENDING': 'pending',
                'FAILED': 'failed',
                'EXPIRED': 'expired',
                'CANCELLED': 'failed',
            }
            raw_status = data.get('status', 'PENDING').upper()
            return status_map.get(raw_status, 'pending')
        except requests.RequestException as e:
            logger.error(f'Kaspi status check error: {e}')
            return 'pending'

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Kaspi webhook HMAC signature."""
        expected = hmac.new(
            self.api_key.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
