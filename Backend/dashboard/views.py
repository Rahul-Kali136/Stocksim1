from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .services import DashboardService



class DashboardView(APIView):


    permission_classes=[
        IsAuthenticated
    ]



    def get(
        self,
        request
    ):


        organization = request.user.organizations.first()



        if organization is None:


            return Response(

                {
                    "success":False,

                    "message":
                    "No organization assigned"

                },

                status=status.HTTP_400_BAD_REQUEST
            )



        data={



            "summary":
                DashboardService.get_dashboard_summary(
                    organization
                ),



            "inventory_summary":
                DashboardService.inventory_summary(
                    organization
                ),



            "statistics":
                DashboardService.statistics(
                    organization
                ),



            "recent_simulations":
                DashboardService.recent_simulations(
                    organization
                ),



            "top_products":
                DashboardService.top_products(
                    organization
                ),



            "best_policy":
                DashboardService.best_policy(
                    organization
                )

        }




        return Response(


            {

                "success":True,

                "dashboard":
                    "Overall Dashboard",


                "data":
                    data

            },


            status=status.HTTP_200_OK

        )