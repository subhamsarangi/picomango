import argparse
import os
import sys

import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connections, transaction

from api.models import Item, PromptTemplate

User = get_user_model()
LOCAL_DB = 'default'
PROD_DB = 'production'


class MigrationError(Exception):
    pass


def _copy_values(instance, excluded=(), **overrides):
    values = {
        field.attname: getattr(instance, field.attname)
        for field in instance._meta.concrete_fields
        if not field.primary_key and field.name not in excluded
    }
    values.update(overrides)
    return values


def _one_user(queryset, email, database):
    users = list(queryset.using(database).filter(email__iexact=email)[:2])
    if len(users) != 1:
        raise MigrationError(
            f'Expected exactly one local user with email {email}; found {len(users)}.'
        )
    return users[0]


def _find_prod_user(email):
    users = list(User.objects.using(PROD_DB).filter(email__iexact=email)[:2])
    if len(users) > 1:
        raise MigrationError(f'Multiple production accounts use email {email}.')
    return users[0] if users else None


def _resolve_template(source_template, template_ids):
    if source_template.pk in template_ids:
        return template_ids[source_template.pk]
    matches = list(
        PromptTemplate.objects.using(PROD_DB)
        .filter(raw_content=source_template.raw_content)[:2]
    )
    if len(matches) != 1:
        raise MigrationError(
            f'Template {source_template.pk} references a template that is not '
            'already present in production. Migrate its owner first.'
        )
    return matches[0].pk


def _external_item_match(source_item, destination_user_id, template_id):
    matches = list(
        Item.objects.using(PROD_DB).filter(
            user_id=destination_user_id,
            template_id=template_id,
            resolved_text=source_item.resolved_text,
            placeholder_values=source_item.placeholder_values,
            image_url=source_item.image_url,
            thumb_url=source_item.thumb_url,
            is_public=source_item.is_public,
            created_at=source_item.created_at,
            updated_at=source_item.updated_at,
        )[:2]
    )
    if len(matches) != 1:
        raise MigrationError(
            f'Template data references item {source_item.pk} owned by another '
            'user, and it could not be matched uniquely in production.'
        )
    return matches[0].pk


def _item_matches(source, destination, template_id):
    return (
        destination.template_id == template_id
        and destination.resolved_text == source.resolved_text
        and destination.placeholder_values == source.placeholder_values
        and destination.image_url == source.image_url
        and destination.thumb_url == source.thumb_url
        and destination.is_public == source.is_public
        and destination.created_at == source.created_at
        and destination.updated_at == source.updated_at
    )


def migrate_user(email, apply=False):
    if PROD_DB not in connections:
        raise MigrationError(
            'Production database is not configured. Set DATABASE_URL or NEON_DB_URL.'
        )
    if connections[LOCAL_DB].settings_dict['ENGINE'] != 'django.db.backends.sqlite3':
        raise MigrationError(
            'The default database must be local SQLite. Keep ENVIRONMENT set to development.'
        )
    if connections[PROD_DB].settings_dict['ENGINE'] != 'django.db.backends.postgresql':
        raise MigrationError('The production database must be PostgreSQL.')

    source_user = _one_user(User.objects, email, LOCAL_DB)
    templates = list(
        PromptTemplate.objects.using(LOCAL_DB)
        .filter(user_id=source_user.pk)
        .order_by('created_at', 'pk')
    )
    items = list(
        Item.objects.using(LOCAL_DB)
        .filter(user_id=source_user.pk)
        .order_by('created_at', 'pk')
    )

    destination_user = _find_prod_user(source_user.email)
    action = 'reuse' if destination_user else 'create'
    print(
        f'User {source_user.email}: {action}; '
        f'{len(templates)} templates; {len(items)} items.'
    )
    if not apply:
        print('Dry run only. Review the counts, then rerun with --apply to write.')
        return

    with transaction.atomic(using=PROD_DB):
        if destination_user is None:
            if User.objects.using(PROD_DB).filter(
                username=source_user.username
            ).exists():
                raise MigrationError(
                    'The local username already belongs to a different production account.'
                )
            destination_user = User.objects.using(PROD_DB).create(
                **_copy_values(source_user)
            )

        template_ids = {}

        for template in templates:
            existing = (
                PromptTemplate.objects.using(PROD_DB)
                .filter(raw_content=template.raw_content)
                .first()
            )
            if existing:
                if existing.user_id != destination_user.pk:
                    raise MigrationError(
                        f'Template {template.pk} has matching content owned by '
                        'a different production user.'
                    )
                if (
                    existing.title != template.title
                    or existing.placeholders != template.placeholders
                    or existing.is_locked != template.is_locked
                    or existing.is_public != template.is_public
                    or existing.created_at != template.created_at
                ):
                    raise MigrationError(
                        f'Production template {existing.pk} conflicts with '
                        f'local template {template.pk}; no data was overwritten.'
                    )
                template_ids[template.pk] = existing.pk
                continue

            destination = PromptTemplate.objects.using(PROD_DB).create(
                **_copy_values(
                    template,
                    excluded=('copied_from', 'next_template', 'origin_item'),
                    user_id=destination_user.pk,
                    copied_from_id=None,
                    next_template_id=None,
                    origin_item_id=None,
                )
            )
            PromptTemplate.objects.using(PROD_DB).filter(pk=destination.pk).update(
                created_at=template.created_at
            )
            template_ids[template.pk] = destination.pk

        destination_items = list(
            Item.objects.using(PROD_DB).filter(user_id=destination_user.pk)
        )
        item_ids = {}
        for item in items:
            source_template = PromptTemplate.objects.using(LOCAL_DB).get(
                pk=item.template_id
            )
            destination_template_id = _resolve_template(
                source_template, template_ids
            )
            existing = next(
                (
                    candidate for candidate in destination_items
                    if _item_matches(item, candidate, destination_template_id)
                ),
                None,
            )
            if existing:
                item_ids[item.pk] = existing.pk
                continue

            destination = Item.objects.using(PROD_DB).create(
                **_copy_values(
                    item,
                    user_id=destination_user.pk,
                    template_id=destination_template_id,
                )
            )
            Item.objects.using(PROD_DB).filter(pk=destination.pk).update(
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            destination.created_at = item.created_at
            destination.updated_at = item.updated_at
            item_ids[item.pk] = destination.pk
            destination_items.append(destination)

        for template in templates:
            updates = {
                'copied_from_id': None,
                'next_template_id': None,
                'origin_item_id': None,
            }
            for field in ('copied_from', 'next_template'):
                source_id = getattr(template, f'{field}_id')
                if source_id is not None:
                    linked = PromptTemplate.objects.using(LOCAL_DB).get(pk=source_id)
                    updates[f'{field}_id'] = _resolve_template(linked, template_ids)

            if template.origin_item_id is not None:
                if template.origin_item_id in item_ids:
                    updates['origin_item_id'] = item_ids[template.origin_item_id]
                else:
                    source_item = Item.objects.using(LOCAL_DB).get(
                        pk=template.origin_item_id
                    )
                    source_template = PromptTemplate.objects.using(LOCAL_DB).get(
                        pk=source_item.template_id
                    )
                    linked_template_id = _resolve_template(
                        source_template, template_ids
                    )
                    source_owner = User.objects.using(LOCAL_DB).get(
                        pk=source_item.user_id
                    )
                    linked_owner = _find_prod_user(source_owner.email)
                    if linked_owner is None:
                        raise MigrationError(
                            f'Cannot resolve the owner of linked item {source_item.pk} '
                            'in production.'
                        )
                    updates['origin_item_id'] = _external_item_match(
                        source_item, linked_owner.pk, linked_template_id
                    )

            destination = PromptTemplate.objects.using(PROD_DB).get(
                pk=template_ids[template.pk]
            )
            changed_fields = []
            for field, expected_id in updates.items():
                current_id = getattr(destination, field)
                if current_id is not None and current_id != expected_id:
                    raise MigrationError(
                        f'Production template {destination.pk} has a conflicting '
                        f'{field} link; no data was overwritten.'
                    )
                if current_id is None:
                    setattr(destination, field, expected_id)
                    if expected_id is not None:
                        changed_fields.append(field[:-3])
            if changed_fields:
                destination.save(using=PROD_DB, update_fields=changed_fields)

    print(
        f'Migration complete: {len(templates)} templates and '
        f'{len(items)} items are available in production.'
    )


def main():
    parser = argparse.ArgumentParser(
        description='Copy one local user and their owned templates/items to production.'
    )
    parser.add_argument(
        '--email',
        required=True,
        help='Email of the local user to migrate.',
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Write to production. Without this flag, the command only reports counts.',
    )
    args = parser.parse_args()
    try:
        migrate_user(args.email, apply=args.apply)
    except MigrationError as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
