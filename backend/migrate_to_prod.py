import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PromptTemplate, Item
from django.db import connections

def migrate():
    """
    Copies all data from 'default' (local sqlite) to 'production' (Neon Postgres).
    Assumes you have added a 'production' entry in settings.py or provided NEON_DB_URL.
    """
    
    # Check if production database is configured
    if 'production' not in connections:
        print("ERROR: 'production' database not found in connections.")
        print("Please ensure NEON_DB_URL is set in your .env or production DB is added to settings.py.")
        return

    local_db = 'default'
    prod_db = 'production'

    print("--- Starting Migration: Local -> Production ---")

    # 1. Migrate Users
    users = User.objects.using(local_db).all()
    print(f"Found {users.count()} users. Migrating...")
    for user in users:
        # Check if user already exists in prod to avoid duplicates
        if not User.objects.using(prod_db).filter(username=user.username).exists():
            # Clear PK to allow auto-increment in prod (or keep if desired)
            old_id = user.id
            user.pk = None 
            user.save(using=prod_db)
            print(f"  Migrated user: {user.username} (Old ID: {old_id}, New ID: {user.id})")
        else:
            print(f"  User {user.username} already exists in prod. Skipping.")

    # 2. Migrate Templates (Order matters for self-referential FKs)
    # We might need multiple passes or careful ordering for next_template and copied_from
    templates = PromptTemplate.objects.using(local_db).all().order_by('created_at')
    print(f"\nFound {templates.count()} templates. Migrating...")
    
    # Map old IDs to new IDs to fix FKs later
    template_id_map = {}
    user_id_map = {u.username: u.id for u in User.objects.using(prod_db).all()}

    for tpl in templates:
        old_id = tpl.id
        # Get prod user ID
        tpl.user_id = user_id_map.get(tpl.user.username)
        
        # Temp clear FKs to linked templates (fix in second pass)
        tpl.copied_from = None
        tpl.next_template = None
        tpl.origin_item = None # Fix in third pass
        
        tpl.pk = None
        tpl.save(using=prod_db)
        template_id_map[old_id] = tpl.id
        print(f"  Migrated template: {tpl.title} (Old ID: {old_id}, New ID: {tpl.id})")

    # Second Pass: Fix Template FKs (Chains)
    print("\nFixing template chains...")
    for tpl in PromptTemplate.objects.using(local_db).all():
        if tpl.next_template or tpl.copied_from:
            prod_tpl = PromptTemplate.objects.using(prod_db).get(pk=template_id_map[tpl.id])
            if tpl.next_template:
                prod_tpl.next_template_id = template_id_map.get(tpl.next_template_id)
            if tpl.copied_from:
                prod_tpl.copied_from_id = template_id_map.get(tpl.copied_from_id)
            prod_tpl.save(using=prod_db)

    # 3. Migrate Items
    items = Item.objects.using(local_db).all()
    print(f"\nFound {items.count()} items. Migrating...")
    
    item_id_map = {}
    for item in items:
        old_id = item.id
        item.user_id = user_id_map.get(item.user.username)
        item.template_id = template_id_map.get(item.template_id)
        
        item.pk = None
        item.save(using=prod_db)
        item_id_map[old_id] = item.id
        print(f"  Migrated item: {item.id} for template {item.template_id}")

    # 4. Fix origin_item in Templates
    print("\nFinalizing origin_item links...")
    for tpl in PromptTemplate.objects.using(local_db).all():
        if tpl.origin_item:
            prod_tpl = PromptTemplate.objects.using(prod_db).get(pk=template_id_map[tpl.id])
            prod_tpl.origin_item_id = item_id_map.get(tpl.origin_item_id)
            prod_tpl.save(using=prod_db)

    print("\n--- Migration Complete! ---")

if __name__ == "__main__":
    # You might need to add 'production' to DATABASES in settings.py temporarily or via ENV
    # Example: set NEON_DB_URL before running
    migrate()
