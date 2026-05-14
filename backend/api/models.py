from django.db import models

class PromptTemplate(models.Model):
    title = models.CharField(max_length=255, null=True, blank=True)
    raw_content = models.TextField(unique=True)
    placeholders = models.JSONField(default=list)
    is_locked = models.BooleanField(default=False)
    copied_from = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='copies'
    )
    origin_item = models.ForeignKey(
        'Item', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='origin_templates'
    )
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='templates'
    )
    next_template = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='previous_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prompt_template'
        indexes = [
            models.Index(fields=['copied_from']),
            models.Index(fields=['origin_item']),
            models.Index(fields=['is_locked']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return self.title or f"Template {self.id}"

class Item(models.Model):
    template = models.ForeignKey(
        PromptTemplate, 
        on_delete=models.CASCADE,
        related_name='items'
    )
    resolved_text = models.TextField()
    placeholder_values = models.JSONField(default=dict)
    image_url = models.URLField(max_length=1024)
    thumb_url = models.URLField(max_length=1024)
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='items'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'item'
        indexes = [
            models.Index(fields=['template']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"Item {self.id} (Template: {self.template_id})"

