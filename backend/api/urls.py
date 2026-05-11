from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import EmailTokenObtainPairView, SignupView, PromptTemplateViewSet, ItemViewSet

router = DefaultRouter()
router.register(r'templates', PromptTemplateViewSet, basename='template')
router.register(r'items', ItemViewSet, basename='item')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/signup/', SignupView.as_view(), name='signup'),
]
