import re
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
    """
    Advanced extraction using Diff-Match-Patch.
    Identifies what text in original_text aligns with <<placeholders>> in template_text.
    """
    dmp = diff_match_patch()
    
    # 1. Replace <<placeholder>> with a unique non-text character to simplify diffing
    # We use a special character range that won't be in the prompt
    placeholders = re.findall(r'<<([^>]+)>>', template_text)
    if not placeholders:
        return {}

    # Create a temporary template string where placeholders are replaced by \u0001, \u0002, etc.
    temp_tpl = template_text
    for i, p in enumerate(placeholders):
        temp_tpl = temp_tpl.replace(f'<<{p}>>', chr(i + 1))
    
    # 2. Diff the original text and the temporary template
    diffs = dmp.diff_main(temp_tpl, original_text)
    dmp.diff_cleanupSemantic(diffs)
    
    # 3. Walk through the diffs to find what characters replaced our markers
    extracted = {p: "" for p in placeholders}
    
    # We align the strings. Diffs are (op, text). op: -1 (delete), 0 (equal), 1 (insert)
    # Since we are going from temp_tpl -> original_text:
    # 0 (equal) means text is same.
    # -1 (delete) means text in temp_tpl is GONE in original (our markers chr(i+1) are here!)
    # 1 (insert) means text in original is NEW.
    
    tpl_idx = 0
    orig_idx = 0
    
    # This is complex because sematic cleanup might merge markers. 
    # Let's use a simpler approach: walk the diffs.
    
    result_values = {}
    
    # Current strategy: 
    # We want to find the text in 'original' that corresponds to the markers in 'temp_tpl'.
    # In a diff (temp_tpl, original):
    # - A marker chr(i+1) in temp_tpl that is DELETED (-1) 
    #   often aligns with an INSERTION (1) in original at the same spot.
    
    # Let's try a direct alignment strategy:
    diffs = dmp.diff_main(temp_tpl, original_text)
    
    current_marker = None
    for op, text in diffs:
        if op == 0: # Equal
            # Just move on
            continue
        elif op == -1: # Deleted from temp_tpl (could be a marker)
            for char in text:
                if ord(char) <= len(placeholders):
                    current_marker = ord(char) - 1
        elif op == 1: # Inserted into original (could be a value)
            if current_marker is not None:
                p_name = placeholders[current_marker]
                result_values[p_name] = result_values.get(p_name, "") + text
                # We don't reset current_marker immediately because one marker might map to multiple inserts
            
    # Clean up: ensure every placeholder has at least an empty string
    for p in placeholders:
        if p not in result_values:
            result_values[p] = ""
            
    return result_values

class PromptTemplateSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = PromptTemplate
        fields = '__all__'
        read_only_fields = ('placeholders', 'created_at', 'item_count')
    def get_item_count(self, obj):
        return obj.items.count()
    def validate(self, data):
        if self.instance and self.instance.is_locked:
            raise serializers.ValidationError("Cannot edit a locked template.")
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
            qs = Item.objects.filter(template=template, placeholder_values=placeholder_values)
            if self.instance: qs = qs.exclude(pk=self.instance.pk)
            data['_has_duplicate'] = qs.exists()
        return data
    def create(self, validated_data):
        has_duplicate = validated_data.pop('_has_duplicate', False)
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
        urls = process_and_upload_image(image_file)
        with transaction.atomic():
            template = PromptTemplate.objects.create(raw_content=prompt_text, placeholders=[], is_locked=False)
            item = Item.objects.create(template=template, resolved_text=prompt_text, placeholder_values={}, image_url=urls['image_url'], thumb_url=urls['thumb_url'])
            template.origin_item = item
            template.save(update_fields=['origin_item'])
        return item
