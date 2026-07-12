from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Reservation, BookItem

class Command(BaseCommand):
    help = 'Checks for expired reservations (24h limit) and moves to the next person'

    def handle(self, *args, **options):
        # 1. Find all 'ready' reservations that have passed their 'ready_until' time
        now = timezone.now()
        expired_reservations = Reservation.objects.filter(status='ready', ready_until__lt=now)

        for res in expired_reservations:
            self.stdout.write(self.style.WARNING(f"Reservation expired for {res.member.familiya}: {res.book.title}"))
            
            # Mark as cancelled or expired
            res.status = 'cancelled'
            res.save()

            # Trigger the next one in the queue
            next_res = Reservation.objects.filter(
                book=res.book, 
                status='waiting'
            ).order_by('queue_order').first()

            if next_res:
                next_res.status = 'ready'
                next_res.ready_until = now + timezone.timedelta(hours=24)
                next_res.save()
                self.stdout.write(self.style.SUCCESS(f"  Next in queue notified: {next_res.member.familiya}"))
            else:
                # If no one else is waiting, and there's a book item, it becomes available
                # (Logic: the physical copy that was 'held' is now free)
                # In our current simplified logic, we just log it.
                self.stdout.write(self.style.NOTICE(f"  No more people in queue for {res.book.title}"))

        self.stdout.write(self.style.SUCCESS("Reservation check completed."))
