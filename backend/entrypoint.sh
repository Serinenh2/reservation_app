#!/bin/sh
# Runs before the web server starts.
set -e

if [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "Applying database migrations..."
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput -v 0
  python manage.py ensure_admin
fi

exec "$@"
