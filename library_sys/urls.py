from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import FileResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
import os


def serve_index(request):
    index_path = os.path.join(settings.BASE_DIR, 'templates', 'index.html')
    return FileResponse(open(index_path, 'rb'), content_type='text/html')

def serve_cabinet(request):
    cabinet_path = os.path.join(settings.BASE_DIR, 'templates', 'cabinet.html')
    return FileResponse(open(cabinet_path, 'rb'), content_type='text/html')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', serve_index, name='home'),
    path('cabinet/', serve_cabinet, name='cabinet'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

