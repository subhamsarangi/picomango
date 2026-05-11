from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthTests(APITestCase):
    def setUp(self):
        self.signup_url = reverse('signup')
        self.login_url = reverse('token_obtain_pair')
        self.user_data = {
            'email': 'testuser@example.com',
            'password': 'StrongPassword123!'
        }

    def test_signup(self):
        response = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='testuser@example.com').exists())

    def test_login(self):
        # Create user first
        User.objects.create_user(
            username='testuser_uuid',
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        # Now try to login
        response = self.client.post(self.login_url, {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_password(self):
        User.objects.create_user(
            username='testuser_uuid',
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        response = self.client.post(self.login_url, {
            'email': self.user_data['email'],
            'password': 'WrongPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

from django.test import TestCase
from .models import PromptTemplate, Item

class ModelTests(TestCase):
    def test_prompt_template_and_item_creation(self):
        # Create a prompt template
        template = PromptTemplate.objects.create(
            title='Test Template',
            raw_content='A photo of <<subject>> in <<style>>',
            placeholders=['subject', 'style'],
        )
        self.assertEqual(template.title, 'Test Template')
        self.assertFalse(template.is_locked)

        # Create an item associated with the template
        item = Item.objects.create(
            template=template,
            resolved_text='A photo of cat in cartoon',
            placeholder_values={'subject': 'cat', 'style': 'cartoon'},
            image_url='http://res.cloudinary.com/demo/image/upload/v1/cat.jpg',
            thumb_url='http://res.cloudinary.com/demo/image/upload/c_thumb/v1/cat.jpg'
        )
        self.assertEqual(item.template, template)
        self.assertEqual(item.placeholder_values['subject'], 'cat')
        
        # Test circular link (origin_item)
        template.origin_item = item
        template.save()
        self.assertEqual(template.origin_item, item)


