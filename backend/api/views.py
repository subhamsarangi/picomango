from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import (
    EmailTokenObtainPairSerializer, SignupSerializer,
    PromptTemplateSerializer, ItemSerializer, ItemFromScratchSerializer
)
from .models import PromptTemplate, Item

User = get_user_model()

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = SignupSerializer

class PromptTemplateViewSet(viewsets.ModelViewSet):
    queryset = PromptTemplate.objects.all()
    serializer_class = PromptTemplateSerializer
    permission_classes = (IsAuthenticated,)


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related('template').all()
    serializer_class = ItemSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        qs = super().get_queryset()
        template_id = self.request.query_params.get('template')
        if template_id:
            qs = qs.filter(template_id=template_id)
        return qs

    @action(detail=False, methods=['post'], url_path='from-scratch',
            serializer_class=ItemFromScratchSerializer)
    def from_scratch(self, request):
        """
        Create a brand-new item + unlocked template from plain prompt text.
        Expects: { prompt_text, image_url, thumb_url }
        Returns the created item plus the template id for the one-time edit redirect.
        """
        serializer = ItemFromScratchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(
            {
                **ItemSerializer(item).data,
                'template_id': item.template_id,
            },
            status=status.HTTP_201_CREATED
        )
