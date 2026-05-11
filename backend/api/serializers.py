import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import uuid
from .models import PromptTemplate, Item

User = get_user_model()

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field] = serializers.EmailField()
        self.fields.pop('username', None)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        return token

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password')
        
    def create(self, validated_data):
        email = validated_data['email']
        # Django's User model requires a username. We can generate a random one or use the email.
        # Since email must be unique and User model username is unique, we use email as username (or a substring/uuid)
        username = email.split('@')[0] + '_' + str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password']
        )
        return user

class PromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptTemplate
        fields = '__all__'
        read_only_fields = ('placeholders', 'created_at')

    def validate(self, data):
        if self.instance and self.instance.is_locked:
            raise serializers.ValidationError("Cannot edit a locked template.")
        return data

    def create(self, validated_data):
        raw_content = validated_data.get('raw_content', '')
        matches = re.findall(r'<<([^>]+)>>', raw_content)
        validated_data['placeholders'] = sorted(list(set(matches)))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        raw_content = validated_data.get('raw_content', instance.raw_content)
        
        # Re-derive placeholders
        matches = re.findall(r'<<([^>]+)>>', raw_content)
        validated_data['placeholders'] = sorted(list(set(matches)))

        # If it's being locked, we backfill the origin item
        is_locking = validated_data.get('is_locked', False)
        
        template = super().update(instance, validated_data)

        if is_locking and template.origin_item:
            # Backfill origin item with default placeholder values
            origin_item = template.origin_item
            if not origin_item.placeholder_values:
                default_values = {key: "" for key in template.placeholders}
                origin_item.placeholder_values = default_values
                origin_item.save()

        return template


def _resolve_text(raw_content, placeholder_values):
    """Merge placeholder_values into raw_content to produce resolved_text."""
    result = raw_content
    for key, value in placeholder_values.items():
        result = result.replace(f'<<{key}>>', value)
    return result


class ItemSerializer(serializers.ModelSerializer):
    duplicate_warning = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Item
        fields = '__all__'
        read_only_fields = ('resolved_text', 'created_at', 'updated_at', 'duplicate_warning')

    def get_duplicate_warning(self, obj):
        return getattr(obj, '_duplicate_warning', False)

    def validate(self, data):
        template = data.get('template', getattr(self.instance, 'template', None))
        placeholder_values = data.get('placeholder_values', {})

        if template and placeholder_values:
            qs = Item.objects.filter(
                template=template,
                placeholder_values=placeholder_values
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            data['_has_duplicate'] = qs.exists()

        return data

    def create(self, validated_data):
        has_duplicate = validated_data.pop('_has_duplicate', False)
        template = validated_data['template']
        placeholder_values = validated_data.get('placeholder_values', {})

        # Compute resolved_text from template raw_content + placeholder values
        validated_data['resolved_text'] = _resolve_text(
            template.raw_content, placeholder_values
        )

        item = super().create(validated_data)
        item._duplicate_warning = has_duplicate
        return item


class ItemFromScratchSerializer(serializers.Serializer):
    """
    Creates a new PromptTemplate (unlocked) + a linked Item atomically.
    Flow: new item from scratch → one-time template edit page.
    """
    prompt_text = serializers.CharField()
    image_url = serializers.URLField()
    thumb_url = serializers.URLField()

    def create(self, validated_data):
        from django.db import transaction
        prompt_text = validated_data['prompt_text']

        with transaction.atomic():
            # Step 1: create unlocked template with plain prompt as raw_content
            template = PromptTemplate.objects.create(
                raw_content=prompt_text,
                placeholders=[],
                is_locked=False,
            )
            # Step 2: create the item (resolved_text = plain prompt, no placeholders yet)
            item = Item.objects.create(
                template=template,
                resolved_text=prompt_text,
                placeholder_values={},
                image_url=validated_data['image_url'],
                thumb_url=validated_data['thumb_url'],
            )
            # Step 3: link origin_item back to item
            template.origin_item = item
            template.save(update_fields=['origin_item'])

        return item
