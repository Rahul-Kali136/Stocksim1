from django.urls import path

from .views import (
    NotificationListView,
    NotificationDetailView,
    UnreadNotificationListView,
    RecentNotificationsView,
    NotificationCountView,
    MarkAsReadView,
    MarkAllAsReadView,
    DeleteNotificationView,
    ClearAllNotificationsView,
)

app_name = "notifications"

urlpatterns = [

    # List Notifications
    path(
        "",
        NotificationListView.as_view(),
        name="notification-list",
    ),

    # Notification Detail
    path(
        "<int:pk>/",
        NotificationDetailView.as_view(),
        name="notification-detail",
    ),

    # Unread Notifications
    path(
        "unread/",
        UnreadNotificationListView.as_view(),
        name="unread-notifications",
    ),

    # Recent Notifications
    path(
        "recent/",
        RecentNotificationsView.as_view(),
        name="recent-notifications",
    ),

    # Notification Count
    path(
        "count/",
        NotificationCountView.as_view(),
        name="notification-count",
    ),

    # Mark Single Notification as Read
    path(
        "<int:pk>/read/",
        MarkAsReadView.as_view(),
        name="mark-as-read",
    ),

    # Mark All Notifications as Read
    path(
        "read-all/",
        MarkAllAsReadView.as_view(),
        name="mark-all-as-read",
    ),

    # Delete Notification
    path(
        "<int:pk>/delete/",
        DeleteNotificationView.as_view(),
        name="delete-notification",
    ),

    # Clear All Notifications
    path(
        "clear/",
        ClearAllNotificationsView.as_view(),
        name="clear-notifications",
    ),
]