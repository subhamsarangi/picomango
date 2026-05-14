import re
import json
from diff_match_patch import diff_match_patch
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
        token['email'] = user.email
        return token

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ('email', 'password')
    def create(self, validated_data):
        email = validated_data['email']
        username = email.split('@')[0] + '_' + str(uuid.uuid4())[:8]
        user = User.objects.create_user(username=username, email=email, password=validated_data['password'])
        return user

def extract_placeholder_values(original_text, template_text):
    dmp = diff_match_patch()
    placeholders = re.findall(r'<<([^>]+)>>', template_text)
    if not placeholders: return {}
    temp_tpl = template_text
    for i, p in enumerate(placeholders):
        temp_tpl = temp_tpl.replace(f'<<{p}>>', chr(i + 1))
    diffs = dmp.diff_main(temp_tpl, original_text)
    result_values = {}
    current_marker = None
    for op, text in diffs:
        if op == 0: continue
        elif op == -1:
            for char in text:
                if ord(char) <= len(placeholders):
                    current_marker = ord(char) - 1
        elif op == 1:
            if current_marker is not None:
                p_name = placeholders[current_marker]
                result_values[p_name] = result_values.get(p_name, "") + text
    for p in placeholders:
        if p not in result_values: result_values[p] = ""
    return result_values

class PromptTemplateSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source='annotated_item_count', read_only=True)
    item_thumbnails = serializers.SerializerMethodField()
    default_values = serializers.SerializerMethodField()

    class Meta:
        model = PromptTemplate
        fields = '__all__'
        read_only_fields = ('user', 'placeholders', 'created_at', 'item_count', 'item_thumbnails', 'default_values')

    def get_default_values(self, obj):
        if obj.origin_item:
            return obj.origin_item.placeholder_values
        return {}

    def get_item_thumbnails(self, obj):
        return list(obj.items.order_by('-created_at').values_list('thumb_url', flat=True)[:3])
    def validate(self, data):
        user = self.context['request'].user
        if self.instance and self.instance.is_locked:
            raise serializers.ValidationError("Cannot edit a locked template.")
        
        copied_from = data.get('copied_from')
        if copied_from and copied_from.user != user:
            raise serializers.ValidationError({"copied_from": "You do not have access to this template."})
            
        return data
    def update(self, instance, validated_data):
        raw_content = validated_data.get('raw_content', instance.raw_content)
        is_locking = validated_data.get('is_locked', False)
        matches = re.findall(r'<<([^>]+)>>', raw_content)
        validated_data['placeholders'] = sorted(list(set(matches)))
        template = super().update(instance, validated_data)
        if is_locking and template.origin_item:
            origin_item = template.origin_item
            extracted = extract_placeholder_values(origin_item.resolved_text, template.raw_content)
            if extracted:
                origin_item.placeholder_values = extracted
                origin_item.save()
        return template

class ItemSerializer(serializers.ModelSerializer):
    image_file = serializers.ImageField(write_only=True, required=True)
    duplicate_warning = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Item
        fields = '__all__'
        read_only_fields = ('user', 'resolved_text', 'image_url', 'thumb_url', 'created_at', 'updated_at', 'duplicate_warning')

    def get_duplicate_warning(self, obj):
        return getattr(obj, '_duplicate_warning', False)

    def validate(self, data):
        # Handle stringified JSON from FormData (NewItemFromTemplatePage)
        placeholder_values = data.get('placeholder_values', {})
        if isinstance(placeholder_values, str):
            try:
                data['placeholder_values'] = json.loads(placeholder_values)
            except json.JSONDecodeError:
                raise serializers.ValidationError({"placeholder_values": "Invalid JSON format."})

        user = self.context['request'].user
        template = data.get('template', getattr(self.instance, 'template', None))
        
        if template and template.user != user:
            raise serializers.ValidationError({"template": "You do not have permission to use this template."})

        current_placeholders = data.get('placeholder_values', getattr(self.instance, 'placeholder_values', {}))
        
        if template and current_placeholders:
            qs = Item.objects.filter(template=template, placeholder_values=current_placeholders, user=user)
            if self.instance: qs = qs.exclude(pk=self.instance.pk)
            data['_has_duplicate'] = qs.exists()
        return data

    def create(self, validated_data):
        from .services import process_and_upload_image
        image_file = validated_data.pop('image_file')
        has_duplicate = validated_data.pop('_has_duplicate', False)
        
        # Upload to Cloudinary
        urls = process_and_upload_image(image_file)
        validated_data['image_url'] = urls['image_url']
        validated_data['thumb_url'] = urls['thumb_url']

        # Resolve text
        template = validated_data['template']
        placeholder_values = validated_data.get('placeholder_values', {})
        result = template.raw_content
        for key, value in placeholder_values.items():
            result = result.replace(f'<<{key}>>', value)
        validated_data['resolved_text'] = result

        item = super().create(validated_data)
        item._duplicate_warning = has_duplicate
        return item

class ItemFromScratchSerializer(serializers.Serializer):
    prompt_text = serializers.CharField()
    image_file = serializers.ImageField(write_only=True)
    def create(self, validated_data):
        from django.db import transaction
        from .services import process_and_upload_image
        prompt_text = validated_data['prompt_text']
        image_file = validated_data['image_file']
        user = validated_data.get('user')  # Expect user to be passed from view's serializer.save(user=...)
        urls = process_and_upload_image(image_file)
        with transaction.atomic():
            template = PromptTemplate.objects.create(
                raw_content=prompt_text, 
                placeholders=[], 
                is_locked=False,
                user=user
            )
            item = Item.objects.create(
                template=template, 
                resolved_text=prompt_text, 
                placeholder_values={}, 
                image_url=urls['image_url'], 
                thumb_url=urls['thumb_url'],
                user=user
            )
            template.origin_item = item
            template.save(update_fields=['origin_item'])
        return item
