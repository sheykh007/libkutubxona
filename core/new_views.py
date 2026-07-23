import os
import shutil
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import (
    Member, BookIssue, Book, Reservation, 
    ExtensionRequest, AuditLog, BackupLog
)
from .serializers import ReservationSerializer
from .utils import ai_smart_search, ai_recommendations, chat_bot_response

# --- Extension Requests ---
class ExtensionRequestListCreateView(APIView):
    def get(self, request):
        status_filter = request.GET.get('status')
        qs = ExtensionRequest.objects.select_related('issue', 'issue__member')
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = []
        for er in qs:
            m = er.issue.member
            data.append({
                'id': er.id,
                'issue_id': er.issue.id,
                'book_name': er.issue.book_name,
                'member_name': m.familiya,
                'member_sigla': m.sigla,
                'member_id': m.id,
                'member_yunalish': m.yunalish or '',
                'member_holati': m.holati,
                'member_telegram': m.telegram_username or '',
                'old_deadline': er.issue.qaytarish_sana,
                'new_deadline': er.issue.qaytarish_sana,
                'reason': er.reason,
                'requested_days': er.requested_days,
                'requested_date': er.requested_date,
                'status': er.status,
                'admin_message': er.admin_message or '',
                'created_at': er.created_at,
                'reviewed_at': er.reviewed_at,
            })
        return Response(data)

    def post(self, request):
        issue_id = request.data.get('issue_id')
        reason = request.data.get('reason', '')
        requested_date = request.data.get('requested_date')
        
        try:
            issue = BookIssue.objects.get(id=issue_id)
            days = 7
            if requested_date:
                # convert string to date object
                date_obj = datetime.strptime(requested_date, '%Y-%m-%d').date()
                days = (date_obj - issue.qaytarish_sana).days
                if days < 0:
                    days = 0

            er = ExtensionRequest.objects.create(
                issue=issue,
                reason=reason,
                requested_days=days,
                requested_date=requested_date if requested_date else None
            )
            return Response({'success': True, 'id': er.id})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

from django.contrib.auth.hashers import check_password

class MemberLoginView(APIView):
    def post(self, request):
        sigla = request.data.get('sigla')
        password = request.data.get('password')
        if not sigla:
            return Response({'error': 'Sigla kiritilishi shart'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = Member.objects.get(sigla=sigla)
            if member.password:
                if not password:
                    return Response({'error': 'Parol kiritilishi shart'}, status=status.HTTP_400_BAD_REQUEST)
                if not check_password(password, member.password):
                    return Response({'error': "Noto'g'ri parol kiritildi."}, status=status.HTTP_400_BAD_REQUEST)
                    
            return Response({
                'id': member.id,
                'sigla': member.sigla,
                'familiya': member.familiya,
                'holati': member.holati
            })
        except Member.DoesNotExist:
            return Response({'error': "Kiritilgan Sigla bo'yicha a'zo topilmadi."}, status=status.HTTP_404_NOT_FOUND)

class ExtensionRequestDetailView(APIView):
    def patch(self, request, pk):
        return self.put(request, pk)

    def put(self, request, pk):
        action = request.data.get('action')  # 'approve' or 'reject'
        admin_message = request.data.get('admin_message', '')
        new_date = request.data.get('new_date')  # override date for approval
        try:
            er = ExtensionRequest.objects.get(pk=pk)
            import requests as http_requests
            TOKEN = "8545699860:AAHJoD9ckF6mkannYjh3DqRX7YgPzSVbXrk"

            if action == 'approve':
                er.status = 'approved'
                er.admin_message = admin_message
                # Use admin-provided new_date first, then member's requested_date, else add days
                if new_date:
                    from datetime import datetime as dt
                    er.issue.qaytarish_sana = dt.strptime(str(new_date), '%Y-%m-%d').date()
                elif er.requested_date:
                    from datetime import datetime as dt
                    er.issue.qaytarish_sana = dt.strptime(str(er.requested_date), '%Y-%m-%d').date()
                else:
                    er.issue.qaytarish_sana = er.issue.qaytarish_sana + timedelta(days=er.requested_days)
                er.issue.save()

                if er.issue.member.chat_id:
                    extra = f"\nAdmin izohi: {admin_message}" if admin_message else ""
                    msg = f"✅ '{er.issue.book_name}' kitobingiz uchun uzaytirish tasdiqlandi. Yangi muddat: {er.issue.qaytarish_sana}{extra}"
                    try:
                        http_requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={'chat_id': er.issue.member.chat_id, 'text': msg}, timeout=5)
                    except Exception:
                        pass

            elif action == 'reject':
                er.status = 'rejected'
                er.admin_message = admin_message

                if er.issue.member.chat_id:
                    extra = f"\nSabab: {admin_message}" if admin_message else ""
                    msg = f"❌ '{er.issue.book_name}' kitobingiz uchun uzaytirish rad etildi.{extra}"
                    try:
                        http_requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={'chat_id': er.issue.member.chat_id, 'text': msg}, timeout=5)
                    except Exception:
                        pass

            er.reviewed_at = timezone.now()
            er.save()
            return Response({'success': True, 'status': er.status, 'new_deadline': str(er.issue.qaytarish_sana)})
        except ExtensionRequest.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)


# --- Audit Log ---
class AuditLogListView(APIView):
    def get(self, request):
        logs = AuditLog.objects.all()[:100] # get last 100
        data = [{
            'id': l.id,
            'user': l.user,
            'action': l.action,
            'module': l.module,
            'ip_address': l.ip_address,
            'browser': l.browser,
            'result': l.result,
            'timestamp': l.timestamp
        } for l in logs]
        return Response(data)


# --- Backup System ---
class BackupView(APIView):
    def get(self, request):
        backups = BackupLog.objects.all()
        data = [{
            'id': b.id,
            'filename': b.filename,
            'size': b.size_bytes,
            'created_at': b.created_at,
            'is_auto': b.is_auto
        } for b in backups]
        return Response(data)
        
    def post(self, request):
        # Trigger manual backup
        db_path = settings.DATABASES['default']['NAME']
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite3"
        dest_path = os.path.join(backup_dir, filename)
        
        shutil.copy2(db_path, dest_path)
        size = os.path.getsize(dest_path)
        
        b = BackupLog.objects.create(
            filename=filename,
            size_bytes=size,
            is_auto=False
        )
        return Response({'success': True, 'filename': b.filename, 'size': b.size_bytes})


# --- Dashboard Notifications & Leaderboard ---
class NotificationsView(APIView):
    def get(self, request):
        # 1. Overdue books
        today = timezone.now().date()
        overdue_count = BookIssue.objects.filter(qaytarildi=False, qaytarish_sana__lt=today).count()
        # 2. Pending extension requests
        pending_ext = ExtensionRequest.objects.filter(status='pending').count()
        # 3. Pending reservations
        pending_res = Reservation.objects.filter(status='waiting').count()
        # 4. Pending member registrations
        pending_members = Member.objects.filter(holati='kutilmoqda').count()
        
        notifications = []
        if pending_members > 0:
            notifications.append({'type': 'info', 'message': f"⏳ {pending_members} ta yangi a'zolik so'rovi tasdiqlanishini kutmoqda!"})
        if overdue_count > 0:
            notifications.append({'type': 'warning', 'message': f"⚠️ {overdue_count} ta kitob muddati o'tgan!"})
        if pending_ext > 0:
            notifications.append({'type': 'info', 'message': f"🔄 {pending_ext} ta muddat uzaytirish so'rovi kutmoqda."})
        if pending_res > 0:
            notifications.append({'type': 'info', 'message': f"🔖 {pending_res} ta yangi rezervatsiya mavjud."})
            
        return Response(notifications)


class LeaderboardView(APIView):
    def get(self, request):
        # Top readers based on returned books
        top_members = Member.objects.annotate(
            returned_count=Count('book_issues', filter=Q(book_issues__qaytarildi=True))
        ).order_by('-returned_count')[:10]
        
        data = []
        for i, m in enumerate(top_members):
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else ""
            data.append({
                'rank': i + 1,
                'medal': medal,
                'sigla': m.sigla,
                'name': m.familiya,
                'returned_books': m.returned_count
            })
        return Response(data)


# --- AI Search & Recommendations ---
class AISearchView(APIView):
    def get(self, request):
        q = request.GET.get('q', '')
        if not q:
            return Response([])
        results = ai_smart_search(q)
        data = [{
            'id': b.id,
            'title': b.title,
            'author': b.author,
            'year': b.published_year
        } for b in results]
        return Response(data)

class AIRecommendationView(APIView):
    def get(self, request, pk):
        recs = ai_recommendations(pk)
        data = [{
            'id': b.id,
            'title': b.title,
            'author': b.author
        } for b in recs]
        return Response(data)

class AIChatbotView(APIView):
    def post(self, request):
        message = request.data.get('message', '')
        if not message:
            return Response({'response': "Iltimos, xabar kiriting."})
        
        reply = chat_bot_response(message)
        return Response({'response': reply})

# --- Cabinet Registration ---
import random
import string
class CabinetRegisterView(APIView):
    def post(self, request):
        familiya = request.data.get('familiya')
        telefon = request.data.get('telefon')
        jinsi = request.data.get('jinsi', 'erkak')
        tugilgan_sana = request.data.get('tugilgan_sana')
        
        if not familiya:
            return Response({'error': 'Ism-familiyani kiritish majburiy'}, status=400)
            
        password = request.data.get('password')
        yunalish = request.data.get('yunalish')
        telegram_username = request.data.get('telegram_username')
        
        try:
            member = Member.objects.create(
                familiya=familiya,
                telegram_id=telefon, # storing phone here to avoid db migrations
                sigla='',
                holati='kutilmoqda',
                jinsi=jinsi,
                tugilgan_sana=tugilgan_sana if tugilgan_sana else None,
                yunalish=yunalish,
                telegram_username=telegram_username
            )
            
            if password:
                from django.contrib.auth.hashers import make_password
                member.password = make_password(password)
                member.save()
            
            return Response({
                'success': True,
                'sigla': member.sigla,
                'id': member.id,
                'familiya': member.familiya
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

# --- Profile & Password Management ---
class MemberProfileUpdateView(APIView):
    def put(self, request, pk):
        try:
            member = Member.objects.get(pk=pk)
            member.familiya = request.data.get('familiya', member.familiya)
            member.jinsi = request.data.get('jinsi', member.jinsi)
            tug_sana = request.data.get('tugilgan_sana')
            if tug_sana:
                member.tugilgan_sana = tug_sana
            member.yunalish = request.data.get('yunalish', member.yunalish)
            member.telegram_username = request.data.get('telegram_username', member.telegram_username)
            
            password = request.data.get('password')
            if password:
                from django.contrib.auth.hashers import make_password
                member.password = make_password(password)
                
            member.save()
            return Response({'success': True})
        except Member.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)

import asyncio
class PasswordResetRequestView(APIView):
    def post(self, request):
        sigla = request.data.get('sigla')
        if not sigla:
            return Response({'error': 'Sigla kiritilishi shart'}, status=400)
            
        try:
            member = Member.objects.get(sigla=sigla)
            if not member.chat_id:
                return Response({'error': "Foydalanuvchi Telegram botiga ulanmagan. Iltimos botga kirib /link buyrug'ini ishlating."}, status=400)
            
            # Generate 4-digit code
            code = ''.join(random.choices(string.digits, k=4))
            member.reset_code = code
            member.save()
            
            # Send message via bot using a background task or simple request
            # Since bot runs in long polling, we can use requests to send via Telegram Bot API directly
            import requests
            TOKEN = "8545699860:AAHJoD9ckF6mkannYjh3DqRX7YgPzSVbXrk"
            msg = f"Kutubxona Kabineti parolni tiklash kodi: {code}"
            url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
            requests.post(url, json={'chat_id': member.chat_id, 'text': msg})
            
            return Response({'success': True})
        except Member.DoesNotExist:
            return Response({'error': 'Foydalanuvchi topilmadi'}, status=404)

class PasswordResetConfirmView(APIView):
    def post(self, request):
        sigla = request.data.get('sigla')
        code = request.data.get('code')
        new_password = request.data.get('new_password')
        
        try:
            member = Member.objects.get(sigla=sigla)
            if not member.reset_code or member.reset_code != code:
                return Response({'error': "Tasdiqlash kodi noto'g'ri"}, status=400)
                
            from django.contrib.auth.hashers import make_password
            member.password = make_password(new_password)
            member.reset_code = None
            member.save()
            return Response({'success': True})
        except Member.DoesNotExist:
            return Response({'error': 'Foydalanuvchi topilmadi'}, status=404)

class BulkUpdateBookItemsView(APIView):
    def put(self, request):
        items = request.data.get('items', [])
        from .models import BookItem
        for item in items:
            try:
                bi = BookItem.objects.get(id=item['id'])
                bi.barcode = item.get('barcode', bi.barcode)
                bi.save()
            except:
                pass
        return Response({'success': True})
