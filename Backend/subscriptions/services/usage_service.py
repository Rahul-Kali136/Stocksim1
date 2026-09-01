from subscriptions.models import Usage

def check_run_limit(user):
    usage = Usage.objects.filter(registration=user).first()
    if not usage:
        # Create first time usage
        usage = Usage.objects.create(
            registration=user,
            allowed_runs=3,
            remaining_runs=3,
            first_time_runs=3
        )
    return usage.remaining_runs > 0

def consume_run(user):
    usage = Usage.objects.filter(registration=user).first()
    if usage and usage.remaining_runs > 0:
        usage.remaining_runs -= 1
        usage.used_runs += 1
        usage.save(update_fields=['remaining_runs', 'used_runs'])
        return True
    return False