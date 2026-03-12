from django.urls import path
from .views import person_select_view

urlpatterns = [
    path("people/", person_select_view, name="person_select"),
]
