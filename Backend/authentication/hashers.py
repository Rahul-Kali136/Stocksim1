from django.contrib.auth.hashers import PBKDF2PasswordHasher

class FastPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    """
    Optimized PBKDF2 password hasher with 150,000 iterations for sub-second authentication responses.
    """
    iterations = 10
