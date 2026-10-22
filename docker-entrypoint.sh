#!/bin/sh
echo "=== Iniciando NewsFlow AI en Coolify ==="
echo "Directorio actual: $(pwd)"
echo "Puerto configurado: ${PORT:-3000}"

# Intentar aplicar migraciones en la base de datos si está conectada
npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma || echo "Aviso: Migraciones en pausa hasta conectar base de datos."

# Identificar ubicación exacta de main.js compilado
if [ -f "apps/api/dist/main.js" ]; then
  TARGET="apps/api/dist/main.js"
elif [ -f "apps/api/dist/src/main.js" ]; then
  TARGET="apps/api/dist/src/main.js"
else
  TARGET=$(find apps/api/dist -name "main.js" 2>/dev/null | head -n 1)
fi

if [ -z "$TARGET" ]; then
  echo "Error critico: No se encontro el archivo main.js en apps/api/dist"
  find apps/api -maxdepth 3 -ls
  exit 1
fi

echo "Ejecutando proceso: node $TARGET"
exec node "$TARGET"
