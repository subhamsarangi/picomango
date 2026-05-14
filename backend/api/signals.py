from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Item
from .services import delete_cloudinary_images

@receiver(post_delete, sender=Item)
def auto_delete_cloudinary_images_on_delete(sender, instance, **kwargs):
    """
    Deletes image from Cloudinary when the Item is deleted from the database.
    This also handles deletions triggered by CASCADE (e.g. deleting a template).
    """
    if instance.image_url or instance.thumb_url:
        delete_cloudinary_images(instance.image_url, instance.thumb_url)
