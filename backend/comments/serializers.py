# backend/comments/serializers.py
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "anime_id", "episode", "parent", "body", "created_at", "username", "avatar", "replies", "mine"]
        read_only_fields = ["id", "created_at"]

    def get_avatar(self, obj):
        # Avatar lives on accounts.Profile: preset id first, then uploaded photo.
        try:
            profile = obj.user.profile
        except (ObjectDoesNotExist, AttributeError):
            return None  # this user has no Profile row yet

        if profile.avatar_preset:
            return f"preset:{profile.avatar_preset}"  # the frontend turns this into the built-in image
        if profile.avatar:
            try:
                return profile.avatar.url  # "/media/avatars/x.png", handled by absUrl()
            except ValueError:
                return None
        return None

    def get_replies(self, obj):
        if obj.parent_id:
            return []
        return CommentSerializer(obj.replies.all(), many=True, context=self.context).data

    def get_mine(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.user_id == request.user.id)

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Write something first.")
        if len(value) > 1000:
            raise serializers.ValidationError("Keep it under 1000 characters.")
        return value

    def validate(self, data):
        parent = data.get("parent")
        if parent:
            if parent.parent_id:
                raise serializers.ValidationError("You can only reply to a top-level comment.")
            if parent.anime_id != data["anime_id"] or parent.episode != data.get("episode"):
                raise serializers.ValidationError("Reply does not match the parent comment.")
        return data