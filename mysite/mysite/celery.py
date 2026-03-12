from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Django settings für 'my_project' festlegen
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_project.settings')

app = Celery('my_project')

# Konfiguration von Celery (bspw. Redis als Broker verwenden)
app.config_from_object('django.conf:settings', namespace='CELERY')

# Celery-Tasks aus allen Django-Apps laden
app.autodiscover_tasks()
