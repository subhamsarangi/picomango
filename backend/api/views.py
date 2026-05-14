from django.db.models import Count, Q
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
    serializer_class = PromptTemplateSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        qs = PromptTemplate.objects.filter(user=self.request.user).annotate(
            annotated_item_count=Count('items'),
            annotated_parent_count=Count('previous_templates')
        ).order_by('-created_at')

        # Search filter
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | 
                Q(raw_content__icontains=search)
            )

        # Root filter
        is_root = self.request.query_params.get('is_root')
        if is_root == 'true':
            qs = qs.filter(annotated_parent_count=0)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        qs = Item.objects.filter(user=self.request.user).select_related('template')
        template_id = self.request.query_params.get('template')
        if template_id:
            qs = qs.filter(template_id=template_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        item = serializer.save(user=request.user)
        return Response(
            {
                **ItemSerializer(item).data,
                'template_id': item.template_id,
            },
            status=status.HTTP_201_CREATED
        )
