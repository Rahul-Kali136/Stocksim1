from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0015_drop_historical_demand'),
    ]

    operations = [
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS inventory_historicalhistoricaldemand;",
            reverse_sql=""
        ),
    ]
