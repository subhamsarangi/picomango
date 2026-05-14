from django.db.models import Count, Q
from rest_framework import generics, viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import (
    EmailTokenObtainPairSerializer, SignupSerializer,
    PromptTemplateSerializer, ItemSerializer, ItemFromScratchSerializer, UserSerializer
)
from .models import PromptTemplate, Item

User = get_user_model()

class IsOwnerOrReadOnlyPublic(BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Unauthenticated or non-owners can only view public resources.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # but only if the object is public or owned by the user.
        if request.method in SAFE_METHODS:
            return obj.is_public or (request.user.is_authenticated and obj.user == request.user)

        # Write permissions are only allowed to the owner of the object.
        return request.user.is_authenticated and obj.user == request.user

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = SignupSerializer

class PromptTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = PromptTemplateSerializer
    permission_classes = (IsOwnerOrReadOnlyPublic,)

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # Owners see their own (public/private) + other public templates
            qs = PromptTemplate.objects.filter(Q(user=user) | Q(is_public=True))
        else:
            # Unauthenticated see only public templates
            qs = PromptTemplate.objects.filter(is_public=True)

        qs = qs.annotate(
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

    def perform_update(self, serializer):
        instance = serializer.save()
        if 'is_public' in self.request.data:
            new_is_public = instance.is_public
            
            # Update all items of this template
            instance.items.update(is_public=new_is_public)
            
            # Walk down the chain and update all linked templates and their items
            curr = instance.next_template
            visited = {instance.id}
            while curr and curr.id not in visited:
                curr.is_public = new_is_public
                curr.save(update_fields=['is_public'])
                curr.items.update(is_public=new_is_public)
                visited.add(curr.id)
                curr = curr.next_template

class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = (IsOwnerOrReadOnlyPublic,)

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            qs = Item.objects.filter(Q(user=user) | Q(is_public=True))
        else:
            qs = Item.objects.filter(is_public=True)
        
        qs = qs.select_related('template')
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
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
            
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

class MeView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
