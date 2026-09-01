from rest_framework.views import exception_handler
from rest_framework.exceptions import NotAuthenticated, AuthenticationFailed

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None and response.status_code == 401:
        if isinstance(exc, NotAuthenticated):
            response.data = {
                "detail": "Authentication credentials were not provided. Bearer token is required.",
                "message": "Bearer token is required. Please provide 'Authorization: Bearer <access_token>' in your request headers."
            }
        elif isinstance(exc, AuthenticationFailed):
            response.data = {
                "detail": "Invalid or expired Bearer token.",
                "message": "The Bearer token provided is invalid or has expired. Please log in again to get a new token."
            }
        elif isinstance(response.data, dict):
            response.data["message"] = "Bearer token is required to access this endpoint."

    return response
