from django.shortcuts import render

# Create your views here.
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Profile

User = get_user_model()

def profile_data(request):
    p, _ = Profile.objects.get_or_create(user=request.user)
    return {
        "username": request.user.username,
        "email": request.user.email,
        "avatar": request.build_absolute_uri(p.avatar.url) if p.avatar else None,
    }

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(profile_data(request))

    def patch(self, request):
        username = request.data.get("username")
        if username and username != request.user.username:
            if User.objects.filter(username__iexact=username).exclude(pk=request.user.pk).exists():
                return Response({"username": ["That name is taken."]}, status=400)
            request.user.username = username
            request.user.save(update_fields=["username"])
        avatar = request.FILES.get("avatar")
        if avatar:
            if avatar.size > 2 * 1024 * 1024:
                return Response({"avatar": ["Image must be under 2 MB."]}, status=400)
            p, _ = Profile.objects.get_or_create(user=request.user)
            p.avatar = avatar
            p.save()
        return Response(profile_data(request))

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.check_password(request.data.get("old_password", "")):
            return Response({"old_password": ["Current password is wrong."]}, status=400)
        try:
            validate_password(request.data.get("new_password", ""), request.user)
        except ValidationError as e:
            return Response({"new_password": e.messages}, status=400)
        request.user.set_password(request.data["new_password"])
        request.user.save()
        return Response({"detail": "ok"})

# urls: path("auth/profile/", ProfileView.as_view()), path("auth/change-password/", ChangePasswordView.as_view())
# dev only: urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)