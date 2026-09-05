from django.urls import path

from .views import (
    OverallReportView,
    OverallPDFExportView,
    OverallExcelExportView,
)



urlpatterns = [

    path(
        "",
        OverallReportView.as_view(),
        name="overall-report"
    ),


    path(
        "pdf/",
        OverallPDFExportView.as_view(),
        name="overall-report-pdf"
    ),


    path(
        "excel/",
        OverallExcelExportView.as_view(),
        name="overall-report-excel"
    ),

] 