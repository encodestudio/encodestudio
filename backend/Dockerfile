# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=encodestudio.settings

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Static files (Django admin CSS/JS) — safe to run without real secrets since
# it never touches the database.
RUN python manage.py collectstatic --noinput

EXPOSE 8080

CMD ["gunicorn", "encodestudio.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "3", "--timeout", "60"]
