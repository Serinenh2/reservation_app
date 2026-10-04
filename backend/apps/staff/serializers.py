from rest_framework import serializers

from apps.core.files import DOCUMENT_TYPES, IMAGE_TYPES, check_file, document_type

from .models import Absence, Employee


class EmployeeSerializer(serializers.ModelSerializer):
    # Files are uploaded here but never returned as URLs: the frontend
    # downloads them from /photo/ and /id-document/ with the login token.
    photo = serializers.FileField(write_only=True, required=False)
    id_document = serializers.FileField(write_only=True, required=False)
    has_photo = serializers.SerializerMethodField()
    has_id_document = serializers.SerializerMethodField()
    id_document_type = serializers.SerializerMethodField()
    full_name = serializers.CharField(read_only=True)
    # Filled by the list query for the requested month (?month=YYYY-MM).
    absences_in_month = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = Employee
        fields = [
            "id", "last_name", "first_name", "full_name", "position", "phone",
            "hire_date", "end_date", "monthly_salary", "notes",
            "photo", "id_document", "has_photo", "has_id_document", "id_document_type",
            "absences_in_month", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_has_photo(self, obj):
        return bool(obj.photo)

    def get_has_id_document(self, obj):
        return bool(obj.id_document)

    def get_id_document_type(self, obj):
        return document_type(obj.id_document)

    def _clean_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("required")
        return value

    validate_last_name = _clean_name
    validate_first_name = _clean_name

    def validate_photo(self, file):
        return check_file(file, IMAGE_TYPES, max_mb=5)

    def validate_id_document(self, file):
        return check_file(file, DOCUMENT_TYPES, max_mb=10)

    def validate(self, attrs):
        hire = attrs.get("hire_date", getattr(self.instance, "hire_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if hire and end and end < hire:
            raise serializers.ValidationError({"end_date": ["end_before_start"]})
        return attrs

    def create(self, validated_data):
        # Save first so the files land in employees/<id>/.
        files = {k: validated_data.pop(k) for k in ("photo", "id_document") if k in validated_data}
        employee = super().create(validated_data)
        if files:
            for key, file in files.items():
                setattr(employee, key, file)
            employee.save()
        return employee

    def update(self, instance, validated_data):
        # A new file replaces the old one: delete the old file from disk.
        for field in ("photo", "id_document"):
            if field in validated_data and getattr(instance, field):
                getattr(instance, field).delete(save=False)
        return super().update(instance, validated_data)


class AbsenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Absence
        fields = ["id", "date", "kind", "note", "created_at"]
        read_only_fields = ["created_at"]

    def validate_date(self, value):
        employee = self.context["employee"]
        if value < employee.hire_date or (employee.end_date and value > employee.end_date):
            raise serializers.ValidationError("outside_employment")
        if employee.absences.filter(date=value).exists():
            raise serializers.ValidationError("absence_exists")
        return value
