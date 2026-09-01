from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from .models import Notification

from .serializers import (
    NotificationSerializer,
    NotificationCreateSerializer,
    NotificationUpdateSerializer,
)

from .services import NotificationService



class NotificationListView(generics.ListCreateAPIView):
    """
    GET  /api/notifications/
    POST /api/notifications/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def get_queryset(self):

        return Notification.objects.filter(
            user=self.request.user
        ).order_by(
            "-created_at"
        )


    def get_serializer_class(self):

        if self.request.method == "POST":
            return NotificationCreateSerializer

        return NotificationSerializer


    def perform_create(self, serializer):

        serializer.save(
            user=self.request.user
        )



class UnreadNotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/unread/
    """

    serializer_class = NotificationSerializer

    permission_classes = [
        IsAuthenticated
    ]


    def get_queryset(self):

        return Notification.objects.filter(
            user=self.request.user,
            is_read=False
        ).order_by(
            "-created_at"
        )



class NotificationDetailView(generics.RetrieveAPIView):
    """
    GET /api/notifications/<id>/
    """

    serializer_class = NotificationSerializer

    permission_classes = [
        IsAuthenticated
    ]


    def get_queryset(self):

        return Notification.objects.filter(
            user=self.request.user
        )



class MarkAsReadView(APIView):
    """
    PUT /api/notifications/<id>/read/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def put(self, request, pk):

        try:

            notification = Notification.objects.get(
                id=pk,
                user=request.user
            )


        except Notification.DoesNotExist:

            return Response(
                {
                    "error": "Notification not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )


        serializer = NotificationUpdateSerializer(
            notification,
            data={
                "is_read": True
            },
            partial=True
        )


        if serializer.is_valid():

            serializer.save()


            return Response(
                NotificationSerializer(
                    notification
                ).data,
                status=status.HTTP_200_OK
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



class MarkAllAsReadView(APIView):
    """
    PUT /api/notifications/read-all/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def put(self, request):

        NotificationService.mark_all_as_read(
            request.user
        )


        return Response(
            {
                "message":
                "All notifications marked as read."
            },
            status=status.HTTP_200_OK
        )



class DeleteNotificationView(APIView):
    """
    DELETE /api/notifications/<id>/delete/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def delete(self, request, pk):

        try:

            notification = Notification.objects.get(
                id=pk,
                user=request.user
            )


        except Notification.DoesNotExist:

            return Response(
                {
                    "error":
                    "Notification not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )


        notification.delete()


        return Response(
            {
                "message":
                "Notification deleted successfully."
            },
            status=status.HTTP_204_NO_CONTENT
        )



class NotificationCountView(APIView):
    """
    GET /api/notifications/count/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def get(self, request):

        total = NotificationService.total_notifications(
            request.user
        )


        unread = NotificationService.unread_count(
            request.user
        )


        return Response(
            {
                "total": total,
                "unread": unread,
                "read": total - unread
            },
            status=status.HTTP_200_OK
        )



class RecentNotificationsView(generics.ListAPIView):
    """
    GET /api/notifications/recent/
    """

    serializer_class = NotificationSerializer

    permission_classes = [
        IsAuthenticated
    ]


    def get_queryset(self):

        return Notification.objects.filter(
            user=self.request.user
        ).order_by(
            "-created_at"
        )[:5]



class ClearAllNotificationsView(APIView):
    """
    DELETE /api/notifications/clear/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def delete(self, request):

        Notification.objects.filter(
            user=request.user
        ).delete()


        return Response(
            {
                "message":
                "All notifications deleted successfully."
            },
            status=status.HTTP_200_OK
        )