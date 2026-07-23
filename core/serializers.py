from rest_framework import serializers
from .models import Member, BookIssue, Payment, Subscription, Branch, Book, BookItem, Reservation, Ebook


class PaymentSerializer(serializers.ModelSerializer):
    member_sigla = serializers.CharField(source='member.sigla', read_only=True)
    member_familiya = serializers.CharField(source='member.familiya', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = '__all__'


class MemberSerializer(serializers.ModelSerializer):
    age_computed = serializers.SerializerMethodField()
    kechikish_kitoblar = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = '__all__'
        extra_kwargs = {
            'sigla': {'required': False, 'allow_blank': True}
        }

    def get_age_computed(self, obj):
        return obj.get_age()

    def get_kechikish_kitoblar(self, obj):
        return obj.book_issues.filter(qaytarildi=False).count()


class BookIssueSerializer(serializers.ModelSerializer):
    member_familiya = serializers.CharField(source='member.familiya', read_only=True)
    member_sigla = serializers.CharField(source='member.sigla', read_only=True)
    kechikish_kunlar = serializers.ReadOnlyField()
    jarima_summa = serializers.ReadOnlyField()

    class Meta:
        model = BookIssue
        fields = '__all__'


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'


class BookItemSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = BookItem
        fields = '__all__'


class BookSerializer(serializers.ModelSerializer):
    items = BookItemSerializer(many=True, read_only=True)
    available_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = '__all__'

    def get_available_count(self, obj):
        return obj.items.filter(status='available').count()

    def get_total_count(self, obj):
        return obj.items.count()


class ReservationSerializer(serializers.ModelSerializer):
    member_familiya = serializers.CharField(source='member.familiya', read_only=True)
    member_sigla = serializers.CharField(source='member.sigla', read_only=True)
    member_holati = serializers.CharField(source='member.holati', read_only=True)
    member_yunalish = serializers.CharField(source='member.yunalish', read_only=True)
    member_telegram = serializers.CharField(source='member.telegram_username', read_only=True)
    member_tugilgan_sana = serializers.DateField(source='member.tugilgan_sana', read_only=True)
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = '__all__'

    def get_book_author(self, obj):
        return obj.book.author if obj.book else ''


class EbookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ebook
        fields = '__all__'
