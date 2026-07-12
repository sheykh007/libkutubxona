from django.contrib import admin
from .models import Member, BookIssue


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ['sigla', 'familiya', 'jinsi', 'holati', 'yangi_avo_sana']
    list_filter = ['jinsi', 'holati']
    search_fields = ['sigla', 'familiya']


@admin.register(BookIssue)
class BookIssueAdmin(admin.ModelAdmin):
    list_display = ['book_name', 'member', 'berilgan_sana', 'qaytarish_sana', 'qaytarildi']
    list_filter = ['qaytarildi']
    search_fields = ['book_name', 'member__familiya']
