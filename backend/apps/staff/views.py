import mimetypes
from datetime import date

from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Employee
from .serializers import AbsenceSerializer, EmployeeSerializer


def parse_month(value):
    """'2026-10' -> (2026, 10)."""
    try:
        year, month = (int(x) for x in value.split("-"))
        date(year, month, 1)
        return year, month
    except (AttributeError, ValueError):
        raise ValidationError({"month": ["invalid_date"]})


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    Administrators only (salaries and ID documents are private).

    /api/employees/                     GET (?month=YYYY-MM adds absences_in_month, ?status=current|former)  POST (multipart)
    /api/employees/<id>/                GET  PATCH (multipart)  DELETE
    /api/employees/<id>/photo/          GET (the file)  DELETE
    /api/employees/<id>/id-document/    GET (the file)  DELETE
    /api/employees/<id>/absences/       GET ?month=YYYY-MM   POST {date, kind, note}
    /api/employees/<id>/absences/<absence_id>/   DELETE
    """

    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None  # a venue has a few dozen employees at most

    def get_queryset(self):
        qs = Employee.objects.all()
        params = self.request.query_params
        today = timezone.localdate()
        if params.get("status") == "current":
            qs = qs.filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        elif params.get("status") == "former":
            qs = qs.filter(end_date__lt=today)
        if params.get("month"):
            year, month = parse_month(params["month"])
            qs = qs.annotate(
                absences_in_month=Count("absences", filter=Q(absences__date__year=year, absences__date__month=month))
            )
        return qs

    def _file(self, request, field):
        employee = self.get_object()
        file = getattr(employee, field)
        if request.method == "DELETE":
            if file:
                file.delete(save=True)
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not file:
            raise Http404
        content_type = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        response = FileResponse(file.open("rb"), content_type=content_type)
        response["Cache-Control"] = "private, no-store"
        return response

    @action(detail=True, methods=["get", "delete"])
    def photo(self, request, pk=None):
        return self._file(request, "photo")

    @action(detail=True, methods=["get", "delete"], url_path="id-document")
    def id_document(self, request, pk=None):
        return self._file(request, "id_document")

    @action(detail=True, methods=["get", "post"])
    def absences(self, request, pk=None):
        employee = self.get_object()
        if request.method == "POST":
            serializer = AbsenceSerializer(data=request.data, context={"employee": employee})
            serializer.is_valid(raise_exception=True)
            serializer.save(employee=employee)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        qs = employee.absences.all()
        if request.query_params.get("month"):
            year, month = parse_month(request.query_params["month"])
            qs = qs.filter(date__year=year, date__month=month)
        return Response(AbsenceSerializer(qs, many=True).data)

    @action(detail=True, methods=["delete"], url_path=r"absences/(?P<absence_id>\d+)")
    def delete_absence(self, request, pk=None, absence_id=None):
        get_object_or_404(self.get_object().absences, pk=absence_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
