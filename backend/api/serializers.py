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

