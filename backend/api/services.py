import io
import cloudinary.uploader
from PIL import Image

def process_and_upload_image(file_obj):
    """
    Takes a file object, uploads the original to Cloudinary,
    generates a thumbnail locally using Pillow (512px max, JPEG, 80% quality),
    and uploads the thumbnail to Cloudinary.
    Returns a dictionary with 'image_url' and 'thumb_url'.
    """
    # Upload original
    original_result = cloudinary.uploader.upload(file_obj, folder='pico/originals')
    
    # Reset file pointer for Pillow
    file_obj.seek(0)
    
    with Image.open(file_obj) as img:
        img.thumbnail((512, 512))
        
        # Convert to RGB if needed to save as JPEG
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        thumb_io = io.BytesIO()
        img.save(thumb_io, format='JPEG', quality=80)
        thumb_io.seek(0)
    
    # Upload thumbnail
    thumb_result = cloudinary.uploader.upload(thumb_io, folder='pico/thumbnails')
    
    return {
        'image_url': original_result['secure_url'],
        'thumb_url': thumb_result['secure_url']
    }

def delete_cloudinary_images(image_url, thumb_url):
    """
    Deletes the images from Cloudinary given their URLs.
    Extracts the public_id from the URL to perform the deletion.
    """
    def extract_public_id(url):
        # Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
        # We need "sample" (everything after version and before extension)
        parts = url.split('/')
        file_with_ext = parts[-1]
        public_id = file_with_ext.rsplit('.', 1)[0]
        # In case the public_id contains folders, we might need more complex logic.
        # But this basic extraction works if uploads are in root.
        # Alternatively, if Cloudinary returns public_id on upload, we could store it, 
        # but the schema only specifies image_url and thumb_url.
        
        # Proper extraction matching default cloudinary URLs without folders:
        # If it has folders, they appear after /upload/v1.../
        try:
            upload_index = parts.index('upload')
            # The next part is usually the version e.g., 'v123456'
            # Everything after is the public ID
            id_parts = parts[upload_index+2:]
            public_id_with_ext = '/'.join(id_parts)
            return public_id_with_ext.rsplit('.', 1)[0]
        except ValueError:
            return file_with_ext.rsplit('.', 1)[0]

    if image_url:
        cloudinary.uploader.destroy(extract_public_id(image_url))
    if thumb_url:
        cloudinary.uploader.destroy(extract_public_id(thumb_url))
