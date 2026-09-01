from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import ReportsService
from .utils import generate_pdf, generate_excel



class BaseReportView(APIView):

    permission_classes = [
        IsAuthenticated
    ]


    def get_organization(self, request):

        return request.user.organizations.first()



    def no_organization_response(self):

        return Response(
            {
                "error": "Organization not assigned"
            },
            status=400
        )




class OverallReportView(BaseReportView):


    def get(self, request):

        organization = self.get_organization(request)


        if not organization:

            return self.no_organization_response()



        data = {

            "inventory":
                ReportsService.inventory_report(
                    organization
                ),


            "simulation":
                ReportsService.simulation_report(
                    organization
                ),


            "cost":
                ReportsService.cost_report(
                    organization
                ),


            "policy":
                ReportsService.policy_report(
                    organization
                ),


            "policy_comparison":
                ReportsService.policy_comparison_report(
                    organization
                )

        }


        return Response(
            {
                "success": True,
                "report": data
            }
        )





class OverallPDFExportView(BaseReportView):


    def get(self, request):

        organization = self.get_organization(request)


        if not organization:

            return self.no_organization_response()



        data = {

            "inventory":
                ReportsService.inventory_report(
                    organization
                ),


            "simulation":
                ReportsService.simulation_report(
                    organization
                ),


            "cost":
                ReportsService.cost_report(
                    organization
                ),


            "policy":
                ReportsService.policy_report(
                    organization
                ),


            "policy_comparison":
                ReportsService.policy_comparison_report(
                    organization
                )

        }


        return generate_pdf(
            data,
            "overall_report"
        )






class OverallExcelExportView(BaseReportView):


    def get(self, request):

        organization = self.get_organization(request)


        if not organization:

            return self.no_organization_response()



        data = {

            "inventory":
                ReportsService.inventory_report(
                    organization
                ),


            "simulation":
                ReportsService.simulation_report(
                    organization
                ),


            "cost":
                ReportsService.cost_report(
                    organization
                ),


            "policy":
                ReportsService.policy_report(
                    organization
                ),


            "policy_comparison":
                ReportsService.policy_comparison_report(
                    organization
                )

        }


        return generate_excel(
            data,
            "overall_report"
        )