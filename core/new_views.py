import os
import shutil
import csv
import io
from django.http import HttpResponse
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Q, Sum
from .models import (
    Member, BookIssue, Book, BookItem, Reservation, 
    ExtensionRequest, AuditLog, BackupLog,
    BookEmbedding, SearchQueryLog, RecommendationFeedback, Branch, Subscription
)
from .serializers import ReservationSerializer
from .utils import ai_smart_search, ai_recommendations, chat_bot_response
from .ai_engine import (
    HybridSearchEngine, get_similar_books, get_personal_recommendations,
    get_ai_search_stats, index_all_books
)

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
        sigla = request.data.get('sigla', '').strip()
        password = request.data.get('password', '')
        if not sigla:
            return Response({'error': 'Sigla yoki elektron pochta kiritilishi shart'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = Member.objects.filter(
                Q(sigla__iexact=sigla) | Q(email__iexact=sigla) | Q(telegram_id=sigla)
            ).first()
            if not member:
                return Response({'error': "Kiritilgan login bo'yicha kitobxon topilmadi."}, status=status.HTTP_404_NOT_FOUND)
            if not member.password:
                return Response({
                    'error': "Siz hali parolsiz ro'yxatdasiz. Iltimos 'Parolni tiklash' orqali o'zingizga parol o'rnating yoki ro'yxatdan o'ting.",
                    'can_reset': True,
                    'sigla': member.sigla,
                    'email': member.email or ''
                }, status=status.HTTP_400_BAD_REQUEST)

            if not password:
                return Response({
                    'error': 'Parol kiritilishi shart',
                    'can_reset': True,
                    'sigla': member.sigla,
                    'email': member.email or ''
                }, status=status.HTTP_400_BAD_REQUEST)
            if not check_password(password, member.password):
                return Response({
                    'error': "Noto'g'ri parol kiritildi.",
                    'can_reset': True,
                    'sigla': member.sigla,
                    'email': member.email or ''
                }, status=status.HTTP_400_BAD_REQUEST)
                    
            return Response({
                'id': member.id,
                'sigla': member.sigla,
                'familiya': member.familiya,
                'email': member.email or '',
                'holati': member.holati,
                'tugilgan_sana': str(member.tugilgan_sana) if member.tugilgan_sana else '',
                'telegram_id': member.telegram_id or '',
                'jinsi': member.jinsi or 'erkak',
                'yunalish': member.yunalish or '',
                'branch_name': member.branch.name if member.branch else 'Asosiy fond',
                'azolik_bosh': str(member.azolik_bosh) if member.azolik_bosh else str(member.yangi_avo_sana),
                'azolik_tug': str(member.azolik_tug) if member.azolik_tug else ''
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

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
        q = request.GET.get('q', '').strip()
        category = request.GET.get('category', '').strip()
        branch = request.GET.get('branch', '').strip()
        available_only = request.GET.get('available_only', '').lower() in ('true', '1')
        try:
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 12))
        except (ValueError, TypeError):
            page = 1
            page_size = 12

        member_id = request.GET.get('member_id')
        member = None
        if member_id:
            try:
                member = Member.objects.get(id=member_id)
            except Member.DoesNotExist:
                pass

        if not q and not category:
            return Response({
                'query': '',
                'total': 0,
                'results': [],
                'facets': {'categories': [], 'branches': []},
                'message': "Qidiruv maydoniga kalit so'z yoki muallif nomini kiriting.",
                'clarification_prompt': None
            })

        branch_id = int(branch) if branch and branch.isdigit() else None
        data = HybridSearchEngine.search(
            query_str=q,
            category_filter=category if category else None,
            branch_filter=branch_id,
            available_only=available_only,
            page=page,
            page_size=page_size
        )

        if q:
            try:
                SearchQueryLog.objects.create(
                    query=q,
                    normalized_query=data.get('intent', {}).get('normalized_query', q),
                    member=member,
                    results_count=data.get('total', 0),
                    search_mode='hybrid'
                )
            except Exception:
                pass

        return Response(data)

class AIRecommendationView(APIView):
    def get(self, request, pk):
        try:
            limit = int(request.GET.get('limit', 6))
        except (ValueError, TypeError):
            limit = 6
        recs = get_similar_books(pk, limit=limit)
        return Response(recs)

class AISimilarBooksView(APIView):
    def get(self, request, pk):
        try:
            limit = int(request.GET.get('limit', 6))
        except (ValueError, TypeError):
            limit = 6
        similar = get_similar_books(pk, limit=limit)
        return Response(similar)

class AIMemberRecommendationsView(APIView):
    def get(self, request, pk):
        try:
            limit = int(request.GET.get('limit', 8))
        except (ValueError, TypeError):
            limit = 8
        recs = get_personal_recommendations(pk, limit=limit)
        return Response(recs)

class AIFeedbackView(APIView):
    def post(self, request):
        member_id = request.data.get('member_id')
        book_id = request.data.get('book_id')
        feedback_type = request.data.get('feedback_type')  # 'like', 'dislike', 'rating'
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')

        if not member_id or not book_id or not feedback_type:
            return Response({'error': "member_id, book_id va feedback_type kiritilishi shart"}, status=400)

        try:
            member = Member.objects.get(id=member_id)
            book = Book.objects.get(id=book_id)

            fb, created = RecommendationFeedback.objects.update_or_create(
                member=member,
                book=book,
                defaults={
                    'feedback_type': feedback_type,
                    'rating': int(rating) if rating else None,
                    'comment': comment
                }
            )
            return Response({
                'success': True,
                'created': created,
                'feedback_type': fb.feedback_type,
                'message': "Fikringiz saqlandi. Sun'iy intellekt tavsiyalari shunga moslashtiriladi!"
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class AIStatsView(APIView):
    def get(self, request):
        stats = get_ai_search_stats()
        return Response(stats)

class AIReindexView(APIView):
    def post(self, request):
        try:
            indexed = index_all_books()
            return Response({
                'success': True,
                'indexed_count': indexed,
                'message': f"{indexed} ta kitob muvaffaqiyatli indekslandi!"
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ReportsDataView(APIView):
    def get(self, request):
        report_type = request.GET.get('type', 'members') # 'members', 'books', 'debtors', 'reservations', 'issues'
        date_from = request.GET.get('date_from', '').strip()
        date_to = request.GET.get('date_to', '').strip()
        status_filter = request.GET.get('status', '').strip()
        category_filter = request.GET.get('category', '').strip()
        export_format = request.GET.get('export', 'json').strip() # 'csv' or 'json'

        today = timezone.now().date()

        if report_type == 'members':
            qs = Member.objects.all().order_by('-id')
            if date_from:
                qs = qs.filter(yangi_avo_sana__gte=date_from)
            if date_to:
                qs = qs.filter(yangi_avo_sana__lte=date_to)
            if status_filter:
                qs = qs.filter(holati=status_filter)

            total_count = qs.count()
            active_count = qs.filter(holati='faol').count()
            waiting_count = qs.filter(holati='kutilmoqda').count()
            blocked_count = qs.filter(holati='bloklangan').count()

            headers = ["ID", "Sigla", "F.I.SH", "Holati", "Telefon", "Elektron pochta", "Yo'nalish", "A'zolik sanasi", "Muddati"]
            rows = []
            for m in qs[:250]:
                rows.append({
                    'id': m.id,
                    'sigla': m.sigla,
                    'name': m.familiya,
                    'status': m.holati,
                    'phone': m.telegram_id or '',
                    'email': m.email or '',
                    'faculty': m.yunalish or '',
                    'start_date': str(m.azolik_bosh or m.yangi_avo_sana or ''),
                    'end_date': str(m.azolik_tug or '')
                })

            summary = {
                'total': total_count,
                'active': active_count,
                'waiting': waiting_count,
                'blocked': blocked_count
            }

        elif report_type == 'books':
            qs = Book.objects.all().order_by('-id')
            if category_filter:
                qs = qs.filter(category__iexact=category_filter)
            if date_from:
                qs = qs.filter(created_at__date__gte=date_from)
            if date_to:
                qs = qs.filter(created_at__date__lte=date_to)

            total_titles = qs.count()
            total_copies = qs.aggregate(Sum('total_count'))['total_count__sum'] or 0
            borrowed_copies = BookItem.objects.filter(book__in=qs, status='borrowed').count()
            available_copies = max(0, total_copies - borrowed_copies)

            headers = ["ID", "Kitob nomi", "Muallif", "Kategoriya", "Janr", "Jami nusxa", "Mavjud", "Javon joyi", "ISBN"]
            rows = []
            for b in qs[:250]:
                avail = b.items.filter(status='available').count()
                rows.append({
                    'id': b.id,
                    'title': b.title,
                    'author': b.author,
                    'category': b.category or 'Umumiy',
                    'genre': b.genre or '',
                    'total_count': b.total_count,
                    'available_count': avail,
                    'shelf_location': b.shelf_location or 'Javon A-1',
                    'isbn': b.isbn or ''
                })

            summary = {
                'total_titles': total_titles,
                'total_copies': total_copies,
                'available_copies': available_copies,
                'borrowed_copies': borrowed_copies
            }

        elif report_type == 'debtors':
            qs = BookIssue.objects.filter(qaytarildi=False, qaytarish_sana__lt=today).select_related('member')
            if date_from:
                qs = qs.filter(qaytarish_sana__gte=date_from)
            if date_to:
                qs = qs.filter(qaytarish_sana__lte=date_to)

            total_overdue = qs.count()
            total_fine = qs.aggregate(Sum('jarima_summa'))['jarima_summa__sum'] or 0
            unique_debtors = qs.values('member').distinct().count()

            headers = ["ID", "Sigla", "Kitobxon", "Kitob nomi", "Berilgan sana", "Qaytarish muddati", "Kechikkan kun", "Jarima (so'm)", "Telefon"]
            rows = []
            for bi in qs[:250]:
                days_late = (today - bi.qaytarish_sana).days if bi.qaytarish_sana else 0
                rows.append({
                    'id': bi.id,
                    'sigla': bi.member.sigla if bi.member else '',
                    'name': bi.member.familiya if bi.member else '',
                    'book_name': bi.book_name,
                    'issue_date': str(bi.berilgan_sana),
                    'due_date': str(bi.qaytarish_sana),
                    'days_late': max(0, days_late),
                    'fine': bi.jarima_summa,
                    'phone': bi.member.telegram_id if bi.member else ''
                })

            summary = {
                'unique_debtors': unique_debtors,
                'total_overdue_books': total_overdue,
                'total_fine': total_fine
            }

        elif report_type == 'reservations':
            qs = Reservation.objects.select_related('book', 'member').order_by('-created_at')
            if status_filter:
                qs = qs.filter(status=status_filter)
            if date_from:
                qs = qs.filter(created_at__date__gte=date_from)
            if date_to:
                qs = qs.filter(created_at__date__lte=date_to)

            total_res = qs.count()
            waiting_res = qs.filter(status='waiting').count()
            ready_res = qs.filter(status='ready').count()
            completed_res = qs.filter(status='completed').count()

            headers = ["ID", "Kitob nomi", "Kitobxon Sigla", "Kitobxon", "Navbat", "Holati", "Buyurtma sanasi"]
            rows = []
            for r in qs[:250]:
                rows.append({
                    'id': r.id,
                    'book_name': r.book.title if r.book else '',
                    'sigla': r.member.sigla if r.member else '',
                    'member_name': r.member.familiya if r.member else '',
                    'queue_order': r.queue_order,
                    'status': r.status,
                    'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else ''
                })

            summary = {
                'total': total_res,
                'waiting': waiting_res,
                'ready': ready_res,
                'completed': completed_res
            }

        else: # 'issues' (ijara jurnali)
            qs = BookIssue.objects.select_related('member').order_by('-id')
            if status_filter == 'active':
                qs = qs.filter(qaytarildi=False)
            elif status_filter == 'returned':
                qs = qs.filter(qaytarildi=True)
            elif status_filter == 'overdue':
                qs = qs.filter(qaytarildi=False, qaytarish_sana__lt=today)

            if date_from:
                qs = qs.filter(berilgan_sana__gte=date_from)
            if date_to:
                qs = qs.filter(berilgan_sana__lte=date_to)

            total_issues = qs.count()
            active_issues = qs.filter(qaytarildi=False).count()
            returned_issues = qs.filter(qaytarildi=True).count()
            overdue_issues = qs.filter(qaytarildi=False, qaytarish_sana__lt=today).count()

            headers = ["ID", "Kitob nomi", "Barkod", "Sigla", "Kitobxon", "Berilgan sana", "Qaytarish muddati", "Holati", "Qaytarilgan sana", "Jarima"]
            rows = []
            for bi in qs[:250]:
                st = "Qaytarilgan" if bi.qaytarildi else ("Muddati o'tgan" if bi.qaytarish_sana and bi.qaytarish_sana < today else "Faol ijarada")
                rows.append({
                    'id': bi.id,
                    'book_name': bi.book_name,
                    'barcode': bi.barcode or '',
                    'sigla': bi.member.sigla if bi.member else '',
                    'member_name': bi.member.familiya if bi.member else '',
                    'issue_date': str(bi.berilgan_sana),
                    'due_date': str(bi.qaytarish_sana),
                    'status_label': st,
                    'return_date': str(bi.qaytarilgan_sana) if bi.qaytarildi and bi.qaytarilgan_sana else '',
                    'fine': bi.jarima_summa
                })

            summary = {
                'total': total_issues,
                'active': active_issues,
                'returned': returned_issues,
                'overdue': overdue_issues
            }

        # CSV Export format
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
            filename = f"hisobot_{report_type}_{today.strftime('%Y%m%d')}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'

            writer = csv.writer(response)
            writer.writerow(headers)
            for row in rows:
                writer.writerow(list(row.values()))
            return response

        return Response({
            'type': report_type,
            'summary': summary,
            'headers': headers,
            'rows': rows
        })

from rest_framework.permissions import AllowAny

class AIChatbotView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        message = request.query_params.get('message', '')
        if not message:
            return Response({'response': "Iltimos, xabar kiriting."})
        reply = chat_bot_response(message)
        return Response({'response': reply})

    def post(self, request):
        message = ''
        if isinstance(request.data, dict):
            message = request.data.get('message', '')
        if not message:
            message = request.POST.get('message', '')
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
        email = request.data.get('email', '').strip().lower()
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
                email=email if email else None,
                telegram_id=telefon,
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
                'familiya': member.familiya,
                'email': member.email or '',
                'holati': member.holati,
                'tugilgan_sana': str(member.tugilgan_sana) if member.tugilgan_sana else '',
                'telegram_id': member.telegram_id or ''
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

# --- Profile & Password Management ---
class MemberProfileUpdateView(APIView):
    def get(self, request, pk):
        try:
            member = Member.objects.get(pk=pk)
            return Response({
                'id': member.id,
                'sigla': member.sigla,
                'familiya': member.familiya,
                'email': member.email or '',
                'holati': member.holati,
                'tugilgan_sana': str(member.tugilgan_sana) if member.tugilgan_sana else '',
                'telegram_id': member.telegram_id or '',
                'jinsi': member.jinsi or 'erkak',
                'yunalish': member.yunalish or '',
                'branch_name': member.branch.name if member.branch else 'Asosiy fond'
            })
        except Member.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)

    def put(self, request, pk):
        try:
            member = Member.objects.get(pk=pk)
            member.familiya = request.data.get('familiya', member.familiya)
            if 'email' in request.data:
                member.email = request.data.get('email', '').strip().lower() or None
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

class PasswordResetRequestView(APIView):
    def post(self, request):
        login_input = request.data.get('sigla') or request.data.get('login') or request.data.get('email')
        custom_email = request.data.get('email')
        
        if not login_input:
            return Response({'error': 'Sigla raqami yoki elektron pochtangizni kiriting'}, status=400)
            
        login_input = str(login_input).strip()
        try:
            member = Member.objects.filter(
                Q(sigla__iexact=login_input) | Q(email__iexact=login_input) | Q(telegram_id=login_input)
            ).first()
            
            if not member:
                return Response({'error': "Bunday login yoki sigla bo'yicha kitobxon topilmadi."}, status=404)
            
            target_email = custom_email.strip().lower() if custom_email else (member.email or '')
            
            if not target_email:
                return Response({
                    'error': "Kitobxon profilida elektron pochta belgilanmagan. Iltimos, pochtangizni kiriting.",
                    'need_email': True,
                    'sigla': member.sigla
                }, status=400)
            
            if not member.email and target_email:
                member.email = target_email
            
            # Generate 6-digit code
            code = ''.join(random.choices(string.digits, k=6))
            member.reset_code = code
            member.save()
            
            # Send message via Email
            from django.core.mail import send_mail
            subject = "Urgut AKM - Parolni tiklash tasdiqlash kodi"
            message = (
                f"Assalomu alaykum, {member.familiya}!\n\n"
                f"Sizning Urgut AKM Kutubxona Kabinetingiz parolini tiklash uchun tasdiqlash kodingiz:\n\n"
                f"👉  {code}  👈\n\n"
                f"Agar bu so'rovni siz yubormagan bo'lsangiz, ushbu xatga e'tibor bermang.\n\n"
                f"Hurmat bilan,\n"
                f"Urgut Tuman Axborot-Kutubxona Markazi\n"
                f"Aloqa: +998 97 924 27 27"
            )
            
            try:
                send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@urgut-akm.uz'),
                    [target_email],
                    fail_silently=False
                )
            except Exception as mail_err:
                print(f"[EMAIL NOTIFICATION ERROR / CONSOLE LOG]: {mail_err} | Reset code: {code} for {target_email}")
            
            # Also send to Telegram if user is connected to bot
            if member.chat_id:
                try:
                    import requests as tg_req
                    TOKEN = "8545699860:AAHJoD9ckF6mkannYjh3DqRX7YgPzSVbXrk"
                    tg_msg = f"🔐 Kutubxona Kabineti parolini tiklash kodi: {code}"
                    tg_req.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={'chat_id': member.chat_id, 'text': tg_msg}, timeout=4)
                except Exception:
                    pass

            # Mask email for UI
            parts = target_email.split('@')
            if len(parts) == 2 and len(parts[0]) > 2:
                masked = parts[0][0] + '***' + parts[0][-1] + '@' + parts[1]
            else:
                masked = target_email

            return Response({
                'success': True,
                'sigla': member.sigla,
                'email': masked,
                'message': f"{masked} elektron pochtasiga tasdiqlash kodi yuborildi."
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class PasswordResetConfirmView(APIView):
    def post(self, request):
        login_input = request.data.get('sigla') or request.data.get('email')
        code = str(request.data.get('code', '')).strip()
        new_password = str(request.data.get('new_password', '')).strip()
        
        if not login_input:
            return Response({'error': 'Login yoki Sigla kiritilishi shart'}, status=400)
        if not code:
            return Response({'error': 'Tasdiqlash kodi kiritilishi shart'}, status=400)
        if not new_password or len(new_password) < 4:
            return Response({'error': "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak"}, status=400)
            
        try:
            member = Member.objects.filter(
                Q(sigla__iexact=str(login_input).strip()) | Q(email__iexact=str(login_input).strip())
            ).first()
            
            if not member:
                return Response({'error': 'Kitobxon topilmadi'}, status=404)
                
            if not member.reset_code or member.reset_code != code:
                return Response({'error': "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan!"}, status=400)
                
            from django.contrib.auth.hashers import make_password
            member.password = make_password(new_password)
            member.reset_code = None
            member.save()
            return Response({
                'success': True,
                'message': "Parol muvaffaqiyatli o'zgartirildi! Yangi parol bilan kirishingiz mumkin."
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

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
