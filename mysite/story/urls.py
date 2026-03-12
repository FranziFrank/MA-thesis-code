from django.urls import path
from . import views

urlpatterns = [
    path('', views.story_page, name='story_page'),
]
