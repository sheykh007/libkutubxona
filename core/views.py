import io
import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from datetime import date, datetime
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Sum
from .models import Member, BookIssue, Payment, Subscription, Branch, Book, BookItem, Reservation, Ebook
from .serializers import (
    MemberSerializer, BookIssueSerializer, PaymentSerializer, SubscriptionSerializer,
    BranchSerializer, BookSerializer, BookItemSerializer, ReservationSerializer, EbookSerializer
)


def parse_date(val):
    if pd.isna(val) or val is None or val == '':
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if hasattr(val, 'date') else val
    try:
        for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
            try:
                return datetime.strptime(str(val).strip(), fmt).date()
            except ValueError:
                continue
    except Exception:
        pass
    return None


def safe_int(val, default=0):
    try:
        if pd.isna(val):
            return default
        s = str(val).strip()
        if not s:
            return default
        import re
        m = re.search(r'\d+', s)
        if m:
            return int(m.group())
        return int(val)
    except (ValueError, TypeError):
        return default
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000

class MemberListCreateView(generics.ListCreateAPIView):
    serializer_class = MemberSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = Member.objects.all()
        q = self.request.query_params.get('q', '')
        holati = self.request.query_params.get('holati', '')
        date_from = self.request.query_params.get('date_from', '')
        date_to = self.request.query_params.get('date_to', '')

        if q:
            qs = qs.filter(Q(familiya__icontains=q) | Q(sigla__icontains=q))
        if holati:
            qs = qs.filter(holati=holati)
        if date_from:
            try:
                qs = qs.filter(yangi_avo_sana__gte=date_from)
            except Exception:
                pass
        if date_to:
            try:
                qs = qs.filter(yangi_avo_sana__lte=date_to)
            except Exception:
                pass
        return qs

    def create(self, request, *args, **kwargs):
        sigla = request.data.get('sigla', '')
        if sigla and Member.objects.filter(sigla=sigla).exists():
            return Response(
                {'error': f"Bu a'zo avval kiritilgan! (Sigla: {sigla})"},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)


class MemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer


class ImportMembersView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Fayl yuklanmadi'}, status=400)

        try:
            ext = file.name.split('.')[-1].lower()
            if ext == 'csv':
                df = pd.read_csv(file, dtype=str)
            elif ext in ('xlsx', 'xls'):
                df = pd.read_excel(file, dtype=str)
            else:
                return Response({'error': 'Faqat CSV yoki XLSX fayllar qabul qilinadi'}, status=400)
        except Exception as e:
            return Response({'error': f'Faylni o\'qishda xatolik: {str(e)}'}, status=400)

        # ─── Flexible Column Mapping ───────────────────────────────
        def normalize_col(c):
            # Remove artifacts like ' c' at end, non-alpha chars at start, multiple spaces
            s = str(c).strip().lower()
            import re
            s = re.sub(r'\s+', ' ', s)
            return s

        cols = [normalize_col(c) for c in df.columns]
        df.columns = cols

        col_map = {
            'sigla': 'sigla', 'sigla raqam': 'sigla', 'siglar': 'sigla', 'nomer': 'sigla',
            'familiya': 'familiya', 'ism': 'familiya', 'f.i.sh': 'familiya',
            'jinsi': 'jinsi', 'jins': 'jinsi',
            'tugilgan sana': 'tugilgan_sana', 'tug\'ilgan sanasi': 'tugilgan_sana', 'dob': 'tugilgan_sana',
            'yoshi': 'yosh', 'yosh': 'yosh', 'age': 'yosh',
            'yangi azo bolgan': 'yangi_avo_sana', 'yangi a\'zo bo\'lgan': 'yangi_avo_sana',
            'qayta azo bolgan': 'qayta_avo_sana', 'qayta a\'zo bo\'lgan': 'qayta_avo_sana',
        }

        df = df.rename(columns={c: col_map.get(c, c) for c in df.columns})

        # ─── Sigla Auto-gen Prep ──────────────────────────────────
        import re
        all_siglas = Member.objects.all().values_list('sigla', flat=True)
        numeric_siglas = []
        for s in all_siglas:
            match = re.search(r'(\d+)$', s)
            if match: numeric_siglas.append(int(match.group(1)))
        
        next_sigla_num = (max(numeric_siglas) if numeric_siglas else 1000) + 1

        created_count = 0
        duplicate_count = 0
        error_list = []

        for idx, row in df.iterrows():
            row_num = idx + 2
            sigla = str(row.get('sigla', '')).strip()
            
            # Auto-generate Sigla if missing
            if not sigla or sigla.lower() == 'nan':
                sigla = str(next_sigla_num)
                next_sigla_num += 1
            
            # Skip Duplicates
            if Member.objects.filter(sigla=sigla).exists():
                duplicate_count += 1
                continue

            try:
                # Familiya check
                familiya = str(row.get('familiya', '')).strip()
                if not familiya or familiya.lower() == 'nan':
                    familiya = "Noma'lum"
                    error_list.append({'row': row_num, 'column': 'Familiya', 'reason': 'Bo\'sh, "Noma\'lum" deb belgilandi'})

                # Jinsi normalize
                jinsi_val = str(row.get('jinsi', '')).strip().lower()
                if jinsi_val in ('ayol', 'f', 'female', 'a'): jinsi_val = 'ayol'
                else: jinsi_val = 'erkak'

                # Dates & Yoshi
                tugilgan = parse_date(row.get('tugilgan_sana'))
                yosh_val = safe_int(row.get('yosh'), None)
                yangi = parse_date(row.get('yangi_avo_sana')) or date.today()

                Member.objects.create(
                    sigla=sigla,
                    familiya=familiya,
                    jinsi=jinsi_val,
                    tugilgan_sana=tugilgan,
                    yosh=yosh_val,
                    yangi_avo_sana=yangi,
                    qayta_avo_sana=parse_date(row.get('qayta_avo_sana'))
                )
                created_count += 1
            except Exception as e:
                error_list.append({'row': row_num, 'column': 'Tizim', 'reason': str(e)})

        return Response({
            'created_count': created_count,
            'duplicate_count': duplicate_count,
            'error_count': len(error_list),
            'errors': error_list,
        })


class BulkDeleteMembersView(APIView):
    def delete(self, request):
        count, _ = Member.objects.all().delete()
        return Response({'success': True, 'count': count})

class BulkDeleteBooksView(APIView):
    def delete(self, request):
        count, _ = Book.objects.all().delete()
        return Response({'success': True, 'count': count})


class ExportMembersView(APIView):
    def get(self, request):
        members = Member.objects.all()
        q = request.query_params.get('q', '')
        holati = request.query_params.get('holati', '')
        if q:
            members = members.filter(Q(familiya__icontains=q) | Q(sigla__icontains=q))
        if holati:
            members = members.filter(holati=holati)

        data = []
        for m in members:
            data.append({
                'Sigla Raqam': m.sigla,
                'Familiya': m.familiya,
                'Jinsi': m.jinsi,
                "Tug'ilgan Sanasi": str(m.tugilgan_sana) if m.tugilgan_sana else '',
                'Yoshi': m.get_age() or '',
                "Yangi A'zo Bo'lgan": str(m.yangi_avo_sana) if m.yangi_avo_sana else '',
                "Qayta A'zo Bo'lgan": str(m.qayta_avo_sana) if m.qayta_avo_sana else '',
                'Holati': m.holati,
                "A'zolik Boshlanish": str(m.azolik_bosh) if m.azolik_bosh else '',
                "A'zolik Tugash": str(m.azolik_tug) if m.azolik_tug else '',
                "To'lov Summa": float(m.tolov_summa) if m.tolov_summa else '',
                "To'lov Sana": str(m.tolov_sana) if m.tolov_sana else '',
                "To'lov Turi": m.tolov_turi or '',
            })

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="A'zolar")
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = "attachment; filename=azolar.xlsx"
        return response

class BookItemSearchView(APIView):
    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
            
        from django.db.models import Q
        query = Q()
        for word in q.split():
            query &= (Q(book__title__icontains=word) | Q(barcode__icontains=word) | Q(book__author__icontains=word))
            
        items = BookItem.objects.filter(query).select_related('book')[:20]
        
        results = []
        for item in items:
            results.append({
                'id': item.id,
                'barcode': item.barcode,
                'title': item.book.title,
                'status': item.status,
                'status_label': dict(BookItem.STATUS_CHOICES).get(item.status, item.status)
            })
        return Response(results)

class BookIssueListCreateView(generics.ListCreateAPIView):
    serializer_class = BookIssueSerializer

    def get_queryset(self):
        qs = BookIssue.objects.select_related('member').all()
        member_id = self.request.query_params.get('member', '')
        qaytarildi = self.request.query_params.get('qaytarildi', '')
        if member_id:
            qs = qs.filter(member_id=member_id)
        if qaytarildi != '':
            qs = qs.filter(qaytarildi=(qaytarildi == 'true'))
        return qs

    def perform_create(self, serializer):
        issue = serializer.save()
        if issue.book_item:
            issue.book_item.status = 'borrowed'
            issue.book_item.save()


class BookIssueDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BookIssue.objects.all()
    serializer_class = BookIssueSerializer


class ReturnBookView(APIView):
    def post(self, request, pk):
        try:
            # Handle legacy BookIssue if necessary, but focus on the new flow
            issue = BookIssue.objects.get(pk=pk)
            issue.qaytarildi = True
            issue.qaytarilgan_sana = date.today()
            issue.save()

            if issue.book_item:
                issue.book_item.status = 'available'
                issue.book_item.save()

            # Simple Trigger for demonstration of the requested logic:
            # Find the first waiting reservation for this book (if we can match it)
            book = Book.objects.filter(title__iexact=issue.book_name).first()
            if book:
                next_res = Reservation.objects.filter(book=book, status='waiting').order_by('queue_order').first()
                if next_res:
                    next_res.status = 'ready'
                    next_res.ready_until = timezone.now() + timezone.timedelta(hours=24)
                    next_res.save()
                    # Trigger notification (to be implemented)
                    print(f"NOTIFIKATSIYA: {next_res.member.familiya} uchun {book.title} tayyor!")

            return Response({'success': True, 'message': 'Kitob qaytarildi va navbat yangilandi'})
        except BookIssue.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)


class DashboardStatsView(APIView):
    def get(self, request):
        today = date.today()
        all_members = Member.objects.all()

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        df_date = None
        dt_date = None
        if date_from:
            try: df_date = datetime.strptime(date_from, '%Y-%m-%d').date()
            except: pass
        if date_to:
            try: dt_date = datetime.strptime(date_to, '%Y-%m-%d').date()
            except: pass

        # Always global counts (unaffected by date filter)
        total_all_members = all_members.count()
        faol_all = all_members.filter(holati='faol').count()
        kutilmoqda_all = all_members.filter(holati='kutilmoqda').count()

        # Date-filtered member counts
        filtered_members = all_members
        if df_date:
            filtered_members = filtered_members.filter(yangi_avo_sana__gte=df_date)
        if dt_date:
            filtered_members = filtered_members.filter(yangi_avo_sana__lte=dt_date)

        filtered_members_count = filtered_members.count() if (df_date or dt_date) else None
        bugun_qoshilgan = all_members.filter(yangi_avo_sana=today).count()
        qayta_azolar = all_members.filter(qayta_avo_sana__isnull=False).count()

        # Books stats
        all_books = BookItem.objects.all()
        total_books = all_books.count()
        available_books = all_books.filter(status='available').count()
        borrowed_books = all_books.filter(status='borrowed').count()
        unique_titles = Book.objects.count()

        # Date-filtered books
        filtered_books = all_books
        if df_date:
            filtered_books = filtered_books.filter(created_at__date__gte=df_date)
        if dt_date:
            filtered_books = filtered_books.filter(created_at__date__lte=dt_date)
        added_books_count = filtered_books.count() if (df_date or dt_date) else total_books

        # Monthly growth (last 12 months)
        monthly = []
        from dateutil.relativedelta import relativedelta
        for i in range(11, -1, -1):
            month_start = (today.replace(day=1) - relativedelta(months=i))
            month_end_month = month_start.month + 1 if month_start.month < 12 else 1
            month_end_year = month_start.year if month_start.month < 12 else month_start.year + 1
            month_end = month_start.replace(year=month_end_year, month=month_end_month, day=1)
            count = Member.objects.filter(yangi_avo_sana__gte=month_start, yangi_avo_sana__lt=month_end).count()
            monthly.append({'month': month_start.strftime('%b %Y'), 'count': count})

        # Top members by book issues
        top_members = []
        for m in Member.objects.annotate(issue_count=Count('book_issues')).order_by('-issue_count')[:5]:
            top_members.append({'sigla': m.sigla, 'familiya': m.familiya, 'issue_count': m.issue_count})

        # Issues stats
        total_issues = BookIssue.objects.count()
        active_issues = BookIssue.objects.filter(qaytarildi=False).count()
        overdue_issues_list = [i for i in BookIssue.objects.filter(qaytarildi=False) if i.kechikish_kunlar > 0]
        overdue = len(overdue_issues_list)

        # Financial Stats
        today_income = Payment.objects.filter(created_at__date=today).aggregate(Sum('amount'))['amount__sum'] or 0
        month_start_date = today.replace(day=1)
        monthly_income = Payment.objects.filter(created_at__date__gte=month_start_date).aggregate(Sum('amount'))['amount__sum'] or 0
        total_income = Payment.objects.aggregate(Sum('amount'))['amount__sum'] or 0

        expired_subs = Subscription.objects.filter(is_active=False, end_date__lt=today).count()

        debtor_ids = set(i.member_id for i in overdue_issues_list)
        expired_ids = Subscription.objects.filter(end_date__lt=today, is_active=False).values_list('member_id', flat=True)
        debtor_ids.update(expired_ids)
        debtors_count = len(debtor_ids)

        erkak = all_members.filter(jinsi='erkak').count()
        ayol = all_members.filter(jinsi='ayol').count()

        return Response({
            # Member stats
            'total_members': total_all_members,
            'faol_members': faol_all,
            'kutilmoqda_members': kutilmoqda_all,
            'bugun_qoshilgan': bugun_qoshilgan,
            'qayta_azolar': qayta_azolar,
            'filtered_members_count': filtered_members_count,
            # Book stats
            'total_books': total_books,
            'unique_titles': unique_titles,
            'available_books': available_books,
            'borrowed_books': borrowed_books,
            'added_books_count': added_books_count,
            # Charts
            'monthly_growth': monthly,
            'top_members': top_members,
            # Issue stats
            'total_issues': total_issues,
            'active_issues': active_issues,
            'overdue_issues': overdue,
            # Gender
            'gender_stats': {'erkak': erkak, 'ayol': ayol},
            # Finance
            'today_income': today_income,
            'monthly_income': monthly_income,
            'total_income': total_income,
            'debtors_count': debtors_count,
            'expired_subs': expired_subs,
        })

class PaymentListCreateView(generics.ListCreateAPIView):
    # For now, simplistic payment recording
    from .serializers import PaymentSerializer
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related('member').all()
        member_id = self.request.query_params.get('member', '')
        if member_id:
            qs = qs.filter(member_id=member_id)
        return qs


class DebtorListView(APIView):
    def get(self, request):
        today = date.today()
        # Overdue issues
        overdue_issues = BookIssue.objects.filter(qaytarildi=False, qaytarish_sana__lt=today).select_related('member')
        # Expired active subs (auto-check command should have marked them inactive, but we check dates)
        expired_subs = Subscription.objects.filter(end_date__lt=today).select_related('member')
        
        debtors = {}
        for issue in overdue_issues:
            m_id = issue.member_id
            if m_id not in debtors:
                debtors[m_id] = {
                    'id': m_id,
                    'sigla': issue.member.sigla,
                    'familiya': issue.member.familiya,
                    'issues': [],
                    'reason': 'Kitob muddati o\'tgan',
                    'fine': 0
                }
            debtors[m_id]['issues'].append(issue.book_name)
            debtors[m_id]['fine'] += issue.jarima_summa

        for sub in expired_subs:
            m_id = sub.member_id
            if m_id not in debtors:
                debtors[m_id] = {
                    'id': m_id,
                    'sigla': sub.member.sigla,
                    'familiya': sub.member.familiya,
                    'issues': [],
                    'reason': 'A\'zolik muddati tugagan',
                    'fine': 0
                }
            elif 'A\'zolik muddati tugagan' not in debtors[m_id]['reason']:
                debtors[m_id]['reason'] += " & A\'zolik tugagan"

        return Response(list(debtors.values()))


class BranchListCreateView(generics.ListCreateAPIView):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer


from rest_framework.pagination import PageNumberPagination

class BookListCreateView(generics.ListCreateAPIView):
    serializer_class = BookSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = Book.objects.all()
        q = self.request.query_params.get('q', '')
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(author__icontains=q))
        branch_id = self.request.query_params.get('branch', '')
        if branch_id:
            qs = qs.filter(items__branch_id=branch_id).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        title = request.data.get('title', '')
        barcode = request.data.get('barcode', '')
        
        raw_count = request.data.get('total_count', 1)
        total_count = int(raw_count) if raw_count else 1
            
        # Temporarily override request.data to include total_count
        mutable_data = request.data.copy()
        mutable_data['total_count'] = total_count
        
        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        book = serializer.instance
        branch_id = request.data.get('branch_id')
        branch = None
        if branch_id:
            branch = Branch.objects.filter(id=branch_id).first()
        if not branch:
            branch = Branch.objects.first()
        
        if branch:
            if barcode:
                # Add specific barcode
                BookItem.objects.create(book=book, barcode=barcode, branch=branch)
                # If they requested more copies, auto-generate for the rest
                for i in range(1, total_count):
                    BookItem.objects.create(book=book, barcode=f"{barcode}-{i}", branch=branch)
            else:
                # Auto-generate barcodes
                for i in range(total_count):
                    auto_barcode = f"B{book.id:04d}-{i+1:02d}"
                    BookItem.objects.create(book=book, barcode=auto_barcode, branch=branch)
                    
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class BookDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer


class ImportBooksView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Fayl yuklanmadi'}, status=400)

        try:
            ext = file.name.split('.')[-1].lower()
            if ext == 'csv':
                try:
                    # Attempt to guess separator (comma, semicolon, tab) automatically
                    df = pd.read_csv(file, dtype=str, sep=None, engine='python', on_bad_lines='skip')
                except Exception:
                    file.seek(0)
                    df = pd.read_csv(file, dtype=str, on_bad_lines='skip')
            elif ext in ('xlsx', 'xls'):
                df = pd.read_excel(file, dtype=str)
            else:
                return Response({'error': 'Faqat CSV yoki XLSX fayllar qabul qilinadi'}, status=400)
        except Exception as e:
            return Response({'error': f"Faylni o'qishda xatolik: {str(e)}"}, status=400)

        def normalize_col(c):
            s = str(c).strip().lower()
            import re
            return re.sub(r'\s+', ' ', s)

        df.columns = [normalize_col(c) for c in df.columns]

        col_map = {
            'kitob nomi': 'title', 'nomi': 'title',
            'nashr yili': 'published_year', 'yil': 'published_year',
            'inventar raqami': 'barcode', 'inventar': 'barcode', 'shtrix-kod': 'barcode', 'shtrix kod': 'barcode',
            'saqlash joyi': 'saqlash_joyi', 'filial': 'saqlash_joyi', 'bo\'lim': 'saqlash_joyi', 'bolim': 'saqlash_joyi', 'kutubxona': 'saqlash_joyi',
            'muallifi': 'author', 'muallif': 'author'
        }
        df = df.rename(columns={c: col_map.get(c, c) for c in df.columns})

        created_books = 0
        created_items = 0
        error_list = []
        
        default_branch = Branch.objects.first()

        for idx, row in df.iterrows():
            row_num = idx + 2
            title = str(row.get('title', '')).strip()
            barcode = str(row.get('barcode', '')).strip()
            
            if not title or title.lower() == 'nan':
                error_list.append({'row': row_num, 'column': 'Kitob nomi', 'reason': "Bo'sh bo'lishi mumkin emas"})
                continue
            if not barcode or barcode.lower() == 'nan':
                error_list.append({'row': row_num, 'column': 'Inventar raqami', 'reason': "Bo'sh bo'lishi mumkin emas"})
                continue

            author = str(row.get('author', '')).strip()
            if author.lower() == 'nan': author = "Noma'lum"
            
            pub_year = safe_int(row.get('published_year'), None)
            
            saqlash_joyi = str(row.get('saqlash_joyi', '')).strip()
            if saqlash_joyi.lower() == 'nan' or not saqlash_joyi:
                branch = default_branch
            else:
                branch, _ = Branch.objects.get_or_create(name=saqlash_joyi)
            
            try:
                if pub_year is not None:
                    book = Book.objects.filter(title__iexact=title, author__iexact=author, published_year=pub_year).first()
                else:
                    book = Book.objects.filter(title__iexact=title, author__iexact=author, published_year__isnull=True).first()
                    
                if not book:
                    book = Book.objects.create(
                        title=title, 
                        author=author, 
                        published_year=pub_year
                    )
                    created_books += 1
                
                if branch:
                    original_barcode = barcode
                    counter = 1
                    while BookItem.objects.filter(barcode=barcode).exists():
                        barcode = f"{original_barcode}_{counter}"
                        counter += 1
                        
                    BookItem.objects.create(
                        book=book,
                        barcode=barcode,
                        branch=branch,
                        status='available'
                    )
                    
                    book.total_count = book.items.count()
                    book.save()
                    created_items += 1
                else:
                    error_list.append({'row': row_num, 'column': 'Saqlash joyi', 'reason': "Tizimda filial topilmadi."})
                    continue
            except Exception as e:
                error_list.append({'row': row_num, 'column': 'Tizim', 'reason': str(e)})

        return Response({
            'created_books': created_books,
            'created_items': created_items,
            'error_count': len(error_list),
            'errors': error_list
        })


class BookItemListCreateView(generics.ListCreateAPIView):
    serializer_class = BookItemSerializer

    def get_queryset(self):
        qs = BookItem.objects.all()
        branch_id = self.request.query_params.get('branch', '')
        status = self.request.query_params.get('status', '')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if status:
            qs = qs.filter(status=status)
        return qs


class BookItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BookItem.objects.all()
    serializer_class = BookItemSerializer


class ReservationListCreateView(generics.ListCreateAPIView):
    serializer_class = ReservationSerializer

    def get_queryset(self):
        qs = Reservation.objects.all()
        member_id = self.request.query_params.get('member', '')
        status = self.request.query_params.get('status', '')
        if member_id:
            qs = qs.filter(member_id=member_id)
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        book = serializer.validated_data['book']
        # Check if any items are available
        available_items = BookItem.objects.filter(book=book, status='available')
        if available_items.exists():
            # If available, we might want to automatically mark it as ready or just let them borrow
            # Requirement says: "Kitob yo'q -> waiting"
            # This suggests reservations are ONLY for when books are gone.
            # But let's follow the queue logic.
            last_res = Reservation.objects.filter(book=book).order_by('-queue_order').first()
            order = (last_res.queue_order + 1) if last_res else 1
            serializer.save(queue_order=order, status='waiting')
        else:
            last_res = Reservation.objects.filter(book=book).order_by('-queue_order').first()
            order = (last_res.queue_order + 1) if last_res else 1
            serializer.save(queue_order=order, status='waiting')

class ReservationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        response = super().update(request, *args, **kwargs)
        
        # Check if status changed to ready
        if request.data.get('status') == 'ready':
            res = self.get_object()
            if res.member.chat_id:
                import requests
                TOKEN = "8545699860:AAHJoD9ckF6mkannYjh3DqRX7YgPzSVbXrk"
                msg = f"📚 Siz band qilgan '{res.book.title}' kitobi tayyorlandi! Kutubxonaga kelib olib ketishingiz mumkin."
                requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={'chat_id': res.member.chat_id, 'text': msg})
                
        return response


class EbookListCreateView(generics.ListCreateAPIView):
    queryset = Ebook.objects.all()
    serializer_class = EbookSerializer


class EbookDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ebook.objects.all()
    serializer_class = EbookSerializer


class MonthlyReportView(APIView):
    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)
        
        # Stats for the current month
        new_members = Member.objects.filter(yangi_avo_sana__gte=month_start).count()
        total_issues = BookIssue.objects.filter(berilgan_sana__gte=month_start).count()
        total_income = Payment.objects.filter(created_at__date__gte=month_start).aggregate(Sum('amount'))['amount__sum'] or 0
        
        # PDF Generation
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        title = Paragraph(f"Oylik Hisobot - {today.strftime('%B %Y')}", styles['Title'])
        elements.append(title)
        
        data = [
            ["Ko'rsatkich", "Qiymat"],
            ["Yangi a'zolar", str(new_members)],
            ["Berilgan kitoblar", str(total_issues)],
            ["Umumiy tushum", f"{total_income:,.2f} so'm"],
        ]
        
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t)
        
        doc.build(elements)
        buffer.seek(0)
        
        return HttpResponse(
            buffer.read(),
            content_type='application/pdf'
        )
