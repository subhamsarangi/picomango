from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import uuid

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
