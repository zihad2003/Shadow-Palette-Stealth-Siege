#!/bin/sh
set -e

# A deleted Aiven hostname in SPRING_DATASOURCE_URL fails DNS and Flyway
# aborts the process. Boot on the embedded database instead of crash-looping.
url="${SPRING_DATASOURCE_URL:-}"
if [ -n "$url" ]; then
  host=$(printf '%s' "$url" | sed -n 's#.*://\([^:/?]*\).*#\1#p')
  if [ -n "$host" ] && ! getent hosts "$host" >/dev/null 2>&1; then
    echo "Datasource host ${host} does not resolve. Starting on embedded H2."
    unset SPRING_DATASOURCE_URL
    unset SPRING_DATASOURCE_USERNAME
    unset SPRING_DATASOURCE_PASSWORD
    unset SPRING_DATASOURCE_DRIVER
    unset SPRING_DATASOURCE_DRIVER_CLASS_NAME
    export SPRING_PROFILES_ACTIVE=local
    export FLYWAY_ENABLED=false
    export HIBERNATE_DDL_AUTO=update
  fi
fi

if [ -z "${SPRING_PROFILES_ACTIVE:-}" ] && [ -z "${SPRING_DATASOURCE_URL:-}" ]; then
  export SPRING_PROFILES_ACTIVE=local
  export FLYWAY_ENABLED=false
fi

exec java -jar /app/app.jar
