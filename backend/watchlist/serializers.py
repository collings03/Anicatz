from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import WatchlistEntry

User = get_user_model()


class WatchlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchlistEntry
        fields = ["anilist_id", "title", "cover_image", "status", "progress", "updated_at"]
        read_only_fields = ["updated_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate(self, attrs):
        validate_password(attrs["password"], User(username=attrs["username"], email=attrs.get("email", "")))
        return attrs

    def create(self, validated):
        return User.objects.create_user(**validated)
