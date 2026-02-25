"""
Management command to seed NetVillage with initial client data.

Usage:
    python manage.py seed_clients
    python manage.py seed_clients --admin-phone +77770000000 --admin-password admin123
"""
from datetime import date, timedelta
import random

from django.core.management.base import BaseCommand
from apps.accounts.models import User


SAMPLE_CLIENTS = [
    {'full_name': 'Adik Seitkali', 'pppoe_login': 'adik', 'tariff': 'tariff-10mbps', 'days': 20},
    {'full_name': 'Salim Bekov', 'pppoe_login': 'salim', 'tariff': 'tariff-7mbps', 'days': 5},
    {'full_name': 'Huse Aliev', 'pppoe_login': 'huse', 'tariff': 'tariff-15mbps', 'days': 15},
    {'full_name': 'Arafat Nurov', 'pppoe_login': 'arafat', 'tariff': 'tariff-10mbps', 'days': 28},
    {'full_name': 'Hakim Dzhaksybekov', 'pppoe_login': 'hakim', 'tariff': 'tariff-15mbps', 'days': 12},
    {'full_name': 'Stalbek Ergashev', 'pppoe_login': 'stalbek', 'tariff': 'tariff-10mbps', 'days': 3},
    {'full_name': 'Erbol Askarov', 'pppoe_login': 'erbol', 'tariff': 'tariff-15mbps', 'days': 18},
    {'full_name': 'Arli Bekzhanov', 'pppoe_login': 'arli', 'tariff': 'tariff-7mbps', 'days': -2},
    {'full_name': 'Muhit Suleimenov', 'pppoe_login': 'muhit', 'tariff': 'tariff-10mbps', 'days': 25},
]


class Command(BaseCommand):
    help = 'Seed database with sample NetVillage clients and admin user'

    def add_arguments(self, parser):
        parser.add_argument('--admin-phone', default='+77770000000')
        parser.add_argument('--admin-password', default='admin123')
        parser.add_argument('--client-password', default='client123')

    def handle(self, *args, **options):
        admin_phone = options['admin_phone']
        admin_password = options['admin_password']
        client_password = options['client_password']

        # Create admin
        if not User.objects.filter(phone=admin_phone).exists():
            admin = User.objects.create_superuser(
                username='admin',
                phone=admin_phone,
                password=admin_password,
                full_name='Администратор NetVillage',
                role=User.ROLE_ADMIN,
            )
            self.stdout.write(self.style.SUCCESS(
                f'✓ Admin created: phone={admin_phone}, password={admin_password}'
            ))
        else:
            self.stdout.write(f'  Admin {admin_phone} already exists')

        # Create sample clients
        today = date.today()
        for i, client_data in enumerate(SAMPLE_CLIENTS):
            phone = f'+7777{str(i + 1).zfill(7)}'
            if User.objects.filter(phone=phone).exists():
                self.stdout.write(f'  Client {client_data["full_name"]} already exists')
                continue

            expire_date = today + timedelta(days=client_data['days'])
            is_active = client_data['days'] >= 0

            user = User.objects.create_user(
                username=client_data['pppoe_login'],
                phone=phone,
                password=client_password,
                full_name=client_data['full_name'],
                pppoe_login=client_data['pppoe_login'],
                pppoe_password=f"pass{random.randint(1000, 9999)}",
                tariff=client_data['tariff'],
                role=User.ROLE_CLIENT,
                subscription_end=expire_date,
                is_active_subscription=is_active,
            )
            self.stdout.write(self.style.SUCCESS(
                f'✓ Client: {user.full_name} | {phone} | {user.tariff} | expires: {expire_date}'
            ))

        self.stdout.write(self.style.SUCCESS('\n✅ Seeding complete!'))
        self.stdout.write(f'Admin login: {admin_phone} / {admin_password}')
        self.stdout.write(f'Client login: +77771000000 ... +7777{str(len(SAMPLE_CLIENTS)).zfill(7)} / {client_password}')
