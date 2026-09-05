from rest_framework import generics

from .models import InventorySummary

from .serializers import InventorySummarySerializer



class InventorySummaryListCreateView(
    generics.ListCreateAPIView
):

    queryset = InventorySummary.objects.select_related("product", "organization").all()

    serializer_class = InventorySummarySerializer



class InventorySummaryDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = InventorySummary.objects.select_related("product", "organization").all()

    serializer_class = InventorySummarySerializer