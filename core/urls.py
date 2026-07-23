from django.urls import path
from . import views
from . import new_views

urlpatterns = [
    # Members (specific paths BEFORE dynamic pk paths)
    path('members/', views.MemberListCreateView.as_view(), name='member-list-create'),
    path('members/login/', new_views.MemberLoginView.as_view(), name='member-login'),
    path('members/import/', views.ImportMembersView.as_view(), name='member-import'),
    path('members/export/', views.ExportMembersView.as_view(), name='member-export'),
    path('members/bulk-delete/', views.BulkDeleteMembersView.as_view(), name='member-bulk-delete'),
    path('members/debtors/', views.DebtorListView.as_view(), name='debtor-list'),
    path('members/<int:pk>/', views.MemberDetailView.as_view(), name='member-detail'),

    # Payments
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list-create'),

    # Book Issues (specific paths BEFORE dynamic pk paths)
    path('issues/', views.BookIssueListCreateView.as_view(), name='issue-list-create'),
    path('issues/<int:pk>/return/', views.ReturnBookView.as_view(), name='issue-return'),
    path('issues/<int:pk>/', views.BookIssueDetailView.as_view(), name='issue-detail'),

    # Dashboard
    path('dashboard/', views.DashboardStatsView.as_view(), name='dashboard'),

    # Multi-branch
    path('branches/', views.BranchListCreateView.as_view(), name='branch-list-create'),
    path('branches/<int:pk>/', views.BranchDetailView.as_view(), name='branch-detail'),

    # Inventory (Pro)
    path('books/', views.BookListCreateView.as_view(), name='book-list-create'),
    path('books/bulk-delete/', views.BulkDeleteBooksView.as_view(), name='book-bulk-delete'),
    path('books/import/', views.ImportBooksView.as_view(), name='book-import'),
    path('books/<int:pk>/', views.BookDetailView.as_view(), name='book-detail'),
    path('book-items/search/', views.BookItemSearchView.as_view(), name='book-item-search'),
    path('book-items/', views.BookItemListCreateView.as_view(), name='book-item-list-create'),
    path('book-items/bulk-update/', new_views.BulkUpdateBookItemsView.as_view(), name='book-items-bulk-update'),
    path('book-items/<int:pk>/', views.BookItemDetailView.as_view(), name='book-item-detail'),

    # Reservations (BRON)
    path('reservations/', views.ReservationListCreateView.as_view(), name='reservation-list-create'),
    path('reservations/<int:pk>/', views.ReservationDetailView.as_view(), name='reservation-detail'),

    # Online Library
    path('ebooks/', views.EbookListCreateView.as_view(), name='ebook-list-create'),
    path('ebooks/<int:pk>/', views.EbookDetailView.as_view(), name='ebook-detail'),

    # Reports
    path('reports/monthly/', views.MonthlyReportView.as_view(), name='monthly-report'),
    
    # --- New V2 APIs ---
    # Extensions
    path('extensions/', new_views.ExtensionRequestListCreateView.as_view(), name='extension-list-create'),
    path('extensions/<int:pk>/', new_views.ExtensionRequestDetailView.as_view(), name='extension-detail'),
    
    # Audit Logs
    path('audit-logs/', new_views.AuditLogListView.as_view(), name='audit-log-list'),
    
    # Backup
    path('backups/', new_views.BackupView.as_view(), name='backup-list-create'),
    
    # Dashboard V2 (Notifications & Leaderboard)
    path('dashboard/notifications/', new_views.NotificationsView.as_view(), name='dashboard-notifications'),
    path('dashboard/leaderboard/', new_views.LeaderboardView.as_view(), name='dashboard-leaderboard'),
    
    # AI Endpoints
    path('ai/search/', new_views.AISearchView.as_view(), name='ai-search'),
    path('ai/chat/', new_views.AIChatbotView.as_view(), name='ai-chat'),
    path('ai/recommendations/<int:pk>/', new_views.AIRecommendationView.as_view(), name='ai-recommendations'),
    
    # Cabinet
    path('cabinet/login/', new_views.MemberLoginView.as_view(), name='cabinet-login'),
    path('cabinet/register/', new_views.CabinetRegisterView.as_view(), name='cabinet-register'),
    path('cabinet/profile/<int:pk>/', new_views.MemberProfileUpdateView.as_view(), name='cabinet-profile-update'),
    path('cabinet/password-reset-request/', new_views.PasswordResetRequestView.as_view(), name='cabinet-password-reset-request'),
    path('cabinet/password-reset-confirm/', new_views.PasswordResetConfirmView.as_view(), name='cabinet-password-reset-confirm'),
]
