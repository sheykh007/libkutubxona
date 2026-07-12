import json
from core.models import AuditLog

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only log write methods
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            user = request.headers.get('X-Librarian-Name', 'Noma\'lum (Tizim)')
            
            # Simple module heuristic from path
            module = "Boshqa"
            path = request.path.lower()
            if 'book' in path: module = 'Kitoblar'
            elif 'member' in path: module = 'A\'zolar'
            elif 'issue' in path: module = 'Kitob Berish'
            elif 'reservation' in path: module = 'Rezervatsiyalar'
            elif 'extension' in path: module = 'Uzaytirish So\'rovlari'
            
            action = f"{request.method} {request.path}"
            
            ip = request.META.get('REMOTE_ADDR')
            browser = request.META.get('HTTP_USER_AGENT', '')[:300] if request.META.get('HTTP_USER_AGENT') else ''
            
            result = 'success' if 200 <= response.status_code < 400 else 'error'
            
            try:
                AuditLog.objects.create(
                    user=user,
                    ip_address=ip,
                    browser=browser,
                    action=action,
                    module=module,
                    result=result
                )
            except Exception as e:
                pass
                
        return response
