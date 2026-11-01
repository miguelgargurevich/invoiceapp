#!/usr/bin/env bash
# Prueba de contrato del motor. Con BETA=1 también envía a SUNAT beta (usuario MODDATOS).
set -euo pipefail
cd "$(dirname "$0")/.."

TMP=$(mktemp -d)
HOY=$(TZ=America/Lima date +%Y-%m-%d)
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TMP/key.pem" -out "$TMP/cert.pem" -days 365 \
  -subj "/CN=EMPRESA BETA SAC/serialNumber=20000000001" 2>/dev/null
openssl pkcs12 -export -inkey "$TMP/key.pem" -in "$TMP/cert.pem" -out "$TMP/cert.pfx" -passout pass:clave123
PFX=$(base64 < "$TMP/cert.pfx" | tr -d '\n')

docker build -q -t sunat-engine:test . >/dev/null
docker rm -f sunat-engine-test >/dev/null 2>&1 || true
docker run -d --name sunat-engine-test -e ENGINE_TOKEN=prueba -p 8089:80 sunat-engine:test >/dev/null
trap 'docker rm -f sunat-engine-test >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do curl -sf localhost:8089/salud >/dev/null && break; sleep 1; done

relleno() { sed -e "s|__PFX__|$PFX|g" -e "s|__HOY__|$HOY|g" "tests/fixtures/$1"; }
cuerpo() { printf '{"emisor":%s,"%s":%s}' "$(relleno emisor.json)" "$1" "$(relleno "$2")"; }
llamar() { curl -s -X POST "localhost:8089$1" -H 'content-type: application/json' -H 'x-engine-token: prueba' --data-binary @-; }
falla() { echo "FALLA: $1"; echo "$2"; exit 1; }

R=$(printf '{"pfxBase64":"%s","clave":"clave123"}' "$PFX" | llamar /certificado/inspeccionar)
echo "$R" | grep -q '"ruc":"20000000001"' || falla "inspeccionar" "$R"

R=$(curl -s -X POST localhost:8089/comprobantes/firmar -H 'x-engine-token: malo' -d '{}')
echo "$R" | grep -q 'No autorizado' || falla "token" "$R"

for f in factura.json factura-credito-detraccion.json nota-credito.json; do
  R=$(cuerpo comprobante "$f" | llamar /comprobantes/firmar)
  echo "$R" | grep -q '"hash":"[^"]' || falla "firmar $f" "$R"
done
echo "OK: contrato del motor (inspeccionar, token, firmar factura/crédito+detracción/nota)"

if [ "${BETA:-0}" = "1" ]; then
  FIRMA=$(cuerpo comprobante factura.json | llamar /comprobantes/firmar)
  XML=$(echo "$FIRMA" | sed -E 's/.*"xmlBase64":"([^"]+)".*/\1/' | sed 's|\\/|/|g')
  NOMBRE=$(echo "$FIRMA" | sed -E 's/.*"nombre":"([^"]+)".*/\1/')
  R=$(printf '{"emisor":%s,"tipoDoc":"01","nombre":"%s","xmlBase64":"%s"}' "$(relleno emisor.json)" "$NOMBRE" "$XML" | llamar /comprobantes/enviar)
  echo "SUNAT beta (factura): $R" | cut -c1-300
  echo "$R" | grep -qE '"codigo":"(0|4[0-9]{3})"' || falla "envío beta" "$R"
  R=$(cuerpo baja baja.json | llamar /bajas/enviar)
  echo "$R" | grep -q '"ticket":"[^"]' || falla "baja beta" "$R"
  echo "OK: SUNAT beta aceptó la factura y entregó ticket de baja"
fi
