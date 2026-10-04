from django.db.models import Count, DecimalField, ProtectedError, Q, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.files import private_file_response

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    /api/clients/          GET (list, ?search=name or phone)  POST
    /api/clients/<id>/     GET  PATCH  DELETE (refused if the client has reservations)
    """

    serializer_class = ClientSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # multipart: ID document upload

    def get_queryset(self):
        active = ~Q(reservations__status="cancelled")
        money = lambda field: Coalesce(  # noqa: E731
            Sum(f"reservations__{field}", filter=active), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
        )
        qs = Client.objects.annotate(
            reservation_count=Count("reservations"),
            total_amount=money("total"),
            paid_amount=money("paid_amount"),
        ).order_by("full_name", "id")
        search = self.request.query_params.get("search", "").strip()
        if search:
            # Phones are compared without spaces: "0550 12 34" finds "0550123456".
            digits = search.replace(" ", "")
            qs = qs.filter(Q(full_name__icontains=search) | Q(phone__icontains=search) | Q(phone__icontains=digits))
        return qs

    @action(detail=True, methods=["get", "delete"], url_path="id-document")
    def id_document(self, request, pk=None):
        """GET: the private file. DELETE: remove it."""
        client = self.get_object()
        if request.method == "DELETE":
            if client.id_document:
                client.id_document.delete(save=True)
            return Response(status=status.HTTP_204_NO_CONTENT)
        return private_file_response(client.id_document)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({"code": "client_has_reservations"}, status=status.HTTP_409_CONFLICT)
