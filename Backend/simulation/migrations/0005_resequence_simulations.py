from django.db import migrations, models

def resequence_ids(apps, schema_editor):
    MonteCarloSimulation = apps.get_model('simulation', 'MonteCarloSimulation')
    sims = list(MonteCarloSimulation.objects.all().order_by('id'))
    
    # Temporarily shift IDs to avoid conflicts
    for i, sim in enumerate(sims):
        old_id = sim.id
        new_id = i + 1
        if old_id != new_id:
            MonteCarloSimulation.objects.filter(id=old_id).update(id=new_id + 10000)
            
    # Set to final sequential IDs
    for i, sim in enumerate(sims):
        new_id = i + 1
        MonteCarloSimulation.objects.filter(id=new_id + 10000).update(id=new_id)

    # Reset auto-increment
    from django.db import connection
    if connection.vendor == 'mysql':
        with connection.cursor() as cursor:
            next_id = len(sims) + 1
            cursor.execute(f"ALTER TABLE monte_carlo_simulation AUTO_INCREMENT = {next_id};")

class Migration(migrations.Migration):

    dependencies = [
        ('simulation', '0004_alter_montecarlosimulation_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(resequence_ids),
    ]
