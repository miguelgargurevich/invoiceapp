#!/usr/bin/env bash
# Arranca, revisa y para el backend (4001) y el frontend (3000) de Facturo para grabar los videos. Solo local.
# Uso: scripts/marketing/arrancar-facturo.sh <backend|frontend|estado|parar>
#   backend  → node app.js con el entorno de videos (base invoiceapp_videos, sin correos ni cobros)
#   frontend → next build (si falta .next o se pasa BUILD=1) y next start en el 3000
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"
# shellcheck disable=SC1091
source scripts/marketing/entorno-videos.sh
LOG_DIR="$RAIZ/.claude/videos"
mkdir -p "$LOG_DIR"

pid_en() { lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null | head -1 || true; }

esperar() {
  local url="$1" intentos="$2"
  for _ in $(seq 1 "$intentos"); do
    if curl -s -m 3 -o /dev/null "$url"; then return 0; fi
    sleep 1
  done
  return 1
}

case "${1:-estado}" in
  backend)
    if [ -n "$(pid_en 4001)" ]; then echo "backend ya escucha en 4001 (pid $(pid_en 4001))"; exit 0; fi
    (cd "$RAIZ/apps/backend" && nohup node app.js > "$LOG_DIR/backend.log" 2>&1 &)
    esperar http://localhost:4001/api/auth/me 20 || true
    curl -s -m 3 -o /dev/null -w 'backend /api/auth/me → %{http_code} (401 es lo esperado sin sesión)\n' http://localhost:4001/api/auth/me
    ;;
  frontend)
    if [ -n "$(pid_en 3000)" ]; then echo "frontend ya escucha en 3000"; exit 0; fi
    # Modo DESARROLLO (next dev): `next build` falla al pre-generar páginas en este worktree (node_modules enlazado a marca-frontend;
    # «Cannot read properties of null (reading 'useContext')»). Con `next dev` las páginas responden 200.
    (cd "$RAIZ/apps/frontend" && nohup npx next dev -p 3000 > "$LOG_DIR/frontend.log" 2>&1 &)
    esperar http://localhost:3000/es/login 90 || true
    curl -s -m 5 -o /dev/null -w 'frontend /es/login → %{http_code}\n' http://localhost:3000/es/login
    ;;
  estado)
    p4001="$(pid_en 4001)"; p3000="$(pid_en 3000)"
    echo "backend 4001: ${p4001:-apagado}"
    echo "frontend 3000: ${p3000:-apagado}"
    ;;
  parar)
    for p in 4001 3000; do
      pid="$(pid_en "$p")"
      if [ -n "$pid" ]; then kill "$pid" && echo "parado el que escucha en $p"; fi
    done
    ;;
  *) echo "uso: $0 <backend|frontend|estado|parar>"; exit 1 ;;
esac
