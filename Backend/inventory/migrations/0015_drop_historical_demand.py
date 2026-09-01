from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0014_delete_historicalinventory'),
    ]

    operations = [
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS historical_demand;",
            reverse_sql=""
        ),
    ]
