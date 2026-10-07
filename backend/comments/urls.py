from django.urls import path
from .views import CommentDelete, CommentListCreate

urlpatterns = [
    path("comments/", CommentListCreate.as_view()),
    path("comments/<int:pk>/", CommentDelete.as_view()),
]