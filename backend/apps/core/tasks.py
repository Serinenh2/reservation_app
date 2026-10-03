"""
Background tasks. Each task is a plain function decorated with @shared_task.
Call it with .delay(...) so it runs in the Celery worker.
"""
from celery import shared_task
from django.core.mail import send_mail


@shared_task(autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def send_email_task(subject, message, recipient_list):
    """Send a plain-text email. Retries automatically if the network is down."""
    send_mail(subject, message, None, recipient_list, fail_silently=False)
    return len(recipient_list)
