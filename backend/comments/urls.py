from django.urls import include, path
from .views import CommentDelete, CommentListCreate

urlpatterns = [
    path("comments/", CommentListCreate.as_view()),
    path("comments/<int:pk>/", CommentDelete.as_view()),
    path("api/", include("comments.urls")),
]