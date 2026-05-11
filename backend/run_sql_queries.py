import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

sql_queries = [
    "UPDATE prompt_template SET user_id = (SELECT id FROM auth_user WHERE email = 'subhamsarangi123@gmail.com');",
    "UPDATE item SET user_id = (SELECT id FROM auth_user WHERE email = 'subhamsarangi123@gmail.com');"
]

def run_queries():
    with connection.cursor() as cursor:
        for query in sql_queries:
            print(f"Executing: {query}")
            try:
                cursor.execute(query)
                print(f"Rows affected: {cursor.rowcount}")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    run_queries()
