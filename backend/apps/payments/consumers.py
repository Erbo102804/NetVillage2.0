import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Payment


class PaymentStatusConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time payment status updates."""

    async def connect(self):
        self.payment_id = self.scope['url_route']['kwargs']['payment_id']
        self.group_name = f'payment_{self.payment_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current status on connect
        payment = await self.get_payment()
        if payment:
            await self.send(text_data=json.dumps({
                'type': 'payment_status',
                'status': payment.status,
                'payment_id': str(payment.id),
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def payment_update(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_payment(self):
        try:
            return Payment.objects.get(id=self.payment_id)
        except Payment.DoesNotExist:
            return None
