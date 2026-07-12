from django.db import models
from django.utils import timezone
from datetime import date


class Branch(models.Model):
    name = models.CharField(max_length=200, verbose_name="Filial Nomi")
    address = models.TextField(null=True, blank=True, verbose_name="Manzil")

    class Meta:
        verbose_name = "Filial"
        verbose_name_plural = "Filiallar"

    def __str__(self):
        return self.name


class Member(models.Model):
    GENDER_CHOICES = [('erkak', 'Erkak'), ('ayol', 'Ayol')]
    STATUS_CHOICES = [('faol', 'Faol'), ('faol_emas', "Faol emas"), ('kutilmoqda', "Kutilmoqda")]
    FEE_TYPE_CHOICES = [('naqd', 'Naqd'), ('karta', 'Karta'), ('online', 'Online')]

    sigla = models.CharField(max_length=50, unique=True, blank=True, verbose_name="Sigla Raqam")
    familiya = models.CharField(max_length=200, verbose_name="Familiya")
    telegram_id = models.CharField(max_length=50, null=True, blank=True, verbose_name="Telegram ID")
    chat_id = models.CharField(max_length=50, null=True, blank=True, verbose_name="Bot Chat ID")
    jinsi = models.CharField(max_length=10, choices=GENDER_CHOICES, verbose_name="Jinsi")
    tugilgan_sana = models.DateField(null=True, blank=True, verbose_name="Tug'ilgan Sanasi")
    yosh = models.PositiveIntegerField(null=True, blank=True, verbose_name="Yoshi")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='members', verbose_name="Filial")

    password = models.CharField(max_length=255, null=True, blank=True, verbose_name="Parol")
    yunalish = models.CharField(max_length=150, null=True, blank=True, verbose_name="Yo'nalishi")
    telegram_username = models.CharField(max_length=150, null=True, blank=True, verbose_name="Telegram Username")
    reset_code = models.CharField(max_length=10, null=True, blank=True, verbose_name="Tiklash Kodi")

    yangi_avo_sana = models.DateField(default=date.today, verbose_name="Yangi A'zo Bo'lgan Sana")
    qayta_avo_sana = models.DateField(null=True, blank=True, verbose_name="Qayta A'zo Bo'lgan Sana")

    holati = models.CharField(max_length=20, choices=STATUS_CHOICES, default='faol', verbose_name="Holati")
    azolik_bosh = models.DateField(null=True, blank=True, verbose_name="A'zolik Boshlanish Sanasi")
    azolik_tug = models.DateField(null=True, blank=True, verbose_name="A'zolik Tugash Sanasi")

    tolov_summa = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="To'lov Summasi")
    tolov_sana = models.DateField(null=True, blank=True, verbose_name="To'lov Sanasi")
    tolov_turi = models.CharField(max_length=20, choices=FEE_TYPE_CHOICES, null=True, blank=True, verbose_name="To'lov Turi")

    # Category activity counts (removed per v2 update)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "A'zo"
        verbose_name_plural = "A'zolar"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sigla} - {self.familiya}"

    def save(self, *args, **kwargs):
        if not self.sigla:
            last_member = Member.objects.filter(sigla__startswith="FEA").order_by('sigla').last()
            if last_member:
                try:
                    num = int(last_member.sigla[3:])
                    self.sigla = f"FEA{str(num + 1).zfill(6)}"
                except ValueError:
                    c = Member.objects.filter(sigla__startswith="FEA").count()
                    self.sigla = f"FEA{str(c + 1).zfill(6)}"
            else:
                self.sigla = "FEA000001"
                
        if self.tugilgan_sana:
            if isinstance(self.tugilgan_sana, str):
                from datetime import datetime
                try:
                    self.tugilgan_sana = datetime.strptime(self.tugilgan_sana, "%Y-%m-%d").date()
                except ValueError:
                    pass
            if not self.yosh and not isinstance(self.tugilgan_sana, str):
                today = date.today()
                self.yosh = today.year - self.tugilgan_sana.year - (
                    (today.month, today.day) < (self.tugilgan_sana.month, self.tugilgan_sana.day)
                )
        super().save(*args, **kwargs)

    def get_age(self):
        if self.tugilgan_sana:
            tug_sana = self.tugilgan_sana
            if isinstance(tug_sana, str):
                from datetime import datetime
                try:
                    tug_sana = datetime.strptime(tug_sana, "%Y-%m-%d").date()
                except ValueError:
                    return self.yosh
            today = date.today()
            return today.year - tug_sana.year - (
                (today.month, today.day) < (tug_sana.month, tug_sana.day)
            )
        return self.yosh


class BookIssue(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='book_issues')
    book_item = models.ForeignKey('BookItem', null=True, blank=True, on_delete=models.SET_NULL, related_name='issues', verbose_name="Kitob Nusxasi")
    book_name = models.CharField(max_length=300, verbose_name="Kitob Nomi")
    berilgan_sana = models.DateField(default=date.today, verbose_name="Berilgan Sana")
    qaytarish_sana = models.DateField(verbose_name="Qaytarish Sanasi")
    qaytarildi = models.BooleanField(default=False, verbose_name="Qaytarildi")
    qaytarilgan_sana = models.DateField(null=True, blank=True, verbose_name="Qaytarilgan Sana")
    jarima_kun_narxi = models.DecimalField(max_digits=8, decimal_places=2, default=500, verbose_name="Jarima (1 kun)")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kitob Berish"
        verbose_name_plural = "Kitob Berish Jurnali"
        ordering = ['-berilgan_sana']

    def __str__(self):
        return f"{self.book_name} -> {self.member.familiya}"

    @property
    def kechikish_kunlar(self):
        if self.qaytarildi:
            return 0
        today = date.today()
        if today > self.qaytarish_sana:
            return (today - self.qaytarish_sana).days
        return 0

    @property
    def jarima_summa(self):
        return self.kechikish_kunlar * float(self.jarima_kun_narxi)


class Subscription(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='subscriptions')
    start_date = models.DateField(default=date.today)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-end_date']

    def __str__(self):
        return f"{self.member.familiya} ({self.start_date} - {self.end_date})"


class Payment(models.Model):
    TYPE_CHOICES = [('membership', 'A\'zolik'), ('fine', 'Jarima')]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='payments')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True)
    issue = models.ForeignKey(BookIssue, on_delete=models.SET_NULL, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    method = models.CharField(max_length=20, choices=Member.FEE_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.amount} ({self.member.familiya})"


class Book(models.Model):
    title = models.CharField(max_length=300, verbose_name="Kitob Nomi")
    author = models.CharField(max_length=300, verbose_name="Muallif")
    published_year = models.IntegerField(null=True, blank=True, verbose_name="Nashr yili")
    total_count = models.PositiveIntegerField(default=0, verbose_name="Umumiy Soni")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kitob (Katalog)"
        verbose_name_plural = "Kitoblar (Katalog)"

    def __str__(self):
        return self.title

    @staticmethod
    def detect_duplicates(title, threshold=0.8):
        from difflib import SequenceMatcher
        similar_books = []
        for book in Book.objects.all():
            similarity = SequenceMatcher(None, title.lower(), book.title.lower()).ratio()
            if similarity > threshold:
                similar_books.append((book, similarity))
        return similar_books


class BookItem(models.Model):
    STATUS_CHOICES = [
        ('available', 'Mavjud'),
        ('borrowed', 'Olingan'),
        ('lost', 'Yo\'qolgan'),
        ('damaged', 'Shikastlangan'),
    ]
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='items')
    barcode = models.CharField(max_length=100, verbose_name="Inventar raqami")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', verbose_name="Holati")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='book_items', verbose_name="Filial")

    class Meta:
        verbose_name = "Kitob Nusxasi"
        verbose_name_plural = "Kitob Nusxalari"

    def __str__(self):
        return f"{self.book.title} ({self.barcode})"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Kutilmoqda'),
        ('ready', 'Tayyor'),
        ('completed', 'Yakunlandi'),
        ('cancelled', 'Bekor qilindi'),
    ]
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='reservations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    queue_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    ready_until = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True, verbose_name="Izoh / Sana")

    class Meta:
        ordering = ['queue_order', 'created_at']
        verbose_name = "Bron"
        verbose_name_plural = "Bronlar"

    def __str__(self):
        return f"{self.member.familiya} - {self.book.title} ({self.status})"


class Ebook(models.Model):
    ACCESS_CHOICES = [('free', 'Bepul'), ('paid', 'Pullik')]
    title = models.CharField(max_length=300)
    file_url = models.FileField(upload_to='ebooks/')
    access_type = models.CharField(max_length=10, choices=ACCESS_CHOICES, default='free')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Elektron Kitob"
        verbose_name_plural = "Elektron Kitoblar"

    def __str__(self):
        return self.title


class EbookReadLog(models.Model):
    ebook = models.ForeignKey(Ebook, on_delete=models.CASCADE, related_name='read_logs')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='ebook_reads')
    read_at = models.DateTimeField(auto_now_add=True)


class ExtensionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('approved', 'Tasdiqlandi'),
        ('rejected', 'Rad etildi'),
    ]
    issue = models.ForeignKey(BookIssue, on_delete=models.CASCADE, related_name='extension_requests', verbose_name="Kitob Berish yozuvi")
    reason = models.TextField(verbose_name="Sabab va izoh")
    requested_days = models.PositiveIntegerField(default=7, verbose_name="So'ralgan kunlar")
    requested_date = models.DateField(null=True, blank=True, verbose_name="So'ralgan muddat (Sana)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Holati")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan sana")
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ko'rib chiqilgan sana")

    class Meta:
        verbose_name = "Muddat uzaytirish so'rovi"
        verbose_name_plural = "Muddat uzaytirish so'rovlari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.issue.book_name} - {self.status}"


class AuditLog(models.Model):
    user = models.CharField(max_length=200, verbose_name="Foydalanuvchi/Kutubxonachi")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP manzil")
    browser = models.CharField(max_length=300, null=True, blank=True, verbose_name="Brauzer")
    action = models.CharField(max_length=200, verbose_name="Amal")
    module = models.CharField(max_length=100, verbose_name="Modul")
    result = models.CharField(max_length=200, default='success', verbose_name="Natija")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Vaqt")

    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Loglar"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"


class BackupLog(models.Model):
    filename = models.CharField(max_length=300, verbose_name="Fayl nomi")
    size_bytes = models.BigIntegerField(default=0, verbose_name="Hajmi (bayt)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan sana")
    is_auto = models.BooleanField(default=False, verbose_name="Avtomatik zaxira")

    class Meta:
        verbose_name = "Zaxira nusxasi"
        verbose_name_plural = "Zaxira nusxalari"
        ordering = ['-created_at']

    def __str__(self):
        return self.filename
