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
        
        template.origin_item = item
        template.save()
        self.assertEqual(template.origin_item, item)

import os
from django.conf import settings
from .services import process_and_upload_image, delete_cloudinary_images

class CloudinaryIntegrationTests(TestCase):
    def test_upload_and_delete(self):
        # The test requires actual internet connection and valid Cloudinary credentials in .env
        dummy_image_path = os.path.join(settings.BASE_DIR.parent, 'meta', 'dummy.jpg')
        
        # Ensure the file exists
        self.assertTrue(os.path.exists(dummy_image_path), "Dummy image not found for testing.")
        
        with open(dummy_image_path, 'rb') as f:
            # Test upload
            result = process_and_upload_image(f)
            
            self.assertIn('image_url', result)
            self.assertIn('thumb_url', result)
            
            # The URLs should contain the 'pico' folder
            self.assertIn('pico/originals', result['image_url'])
            self.assertIn('pico/thumbnails', result['thumb_url'])
            
            # Store URLs to delete them
            img_url = result['image_url']
            thumb_url = result['thumb_url']

        # Test delete
        # It shouldn't raise any exceptions
        try:
            delete_cloudinary_images(img_url, thumb_url)
            deletion_success = True
        except Exception as e:
            deletion_success = False
            
        self.assertTrue(deletion_success, "Cloudinary deletion raised an exception")

class TemplateCRUDTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test_template_user', email='template@test.com', password='pwd')
        self.client.force_authenticate(user=self.user)
        self.url = '/api/templates/'

    def test_template_crud_and_lock(self):
        # 1. Setup plain template and origin item
        template = PromptTemplate.objects.create(raw_content='A plain prompt', is_locked=False)
        item = Item.objects.create(
            template=template, 
            resolved_text='A plain prompt',
            image_url='http://res.cloudinary.com/dummy/orig.jpg',
            thumb_url='http://res.cloudinary.com/dummy/thumb.jpg'
        )
        template.origin_item = item
        template.save()

        # 2. Update template to introduce placeholders
        update_url = f'{self.url}{template.id}/'
        response = self.client.patch(update_url, {
            'title': 'My Template',
            'raw_content': 'A photo of <<subject>> in <<style>>'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Ensure placeholders were properly extracted and sorted
        self.assertEqual(response.data['placeholders'], ['style', 'subject'])
        
        # 3. Lock template
        response = self.client.patch(update_url, {
            'is_locked': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify origin item placeholder_values backfill
        item.refresh_from_db()
        self.assertEqual(item.placeholder_values, {'style': '', 'subject': ''})
        
        # 4. Attempt to update locked template (should fail)
        response = self.client.patch(update_url, {
            'title': 'Hacked Title'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot edit a locked template.', str(response.data))
