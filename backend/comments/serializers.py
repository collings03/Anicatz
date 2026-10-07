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
        # CHECK THIS LINE: return the same avatar value your /auth/profile/ endpoint returns
        # (for example "preset:lime" or "/media/avatars/x.png"). Adjust if your avatar lives elsewhere.
        value = getattr(obj.user, "avatar", None)
        if not value:
            return None
        if isinstance(value, str):
            return value
        try:
            return value.url
        except ValueError:
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