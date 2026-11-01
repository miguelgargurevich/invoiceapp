#!/usr/bin/env bash
# Prueba de contrato del motor. Con BETA=1 también envía a SUNAT beta (usuario MODDATOS).
set -euo pipefail
cd "$(dirname "$0")/.."

TMP=$(mktemp -d)
HOY=$(TZ=America/Lima date +%Y-%m-%d)
# Puerto del contenedor de prueba: por defecto 8089; PUERTO=8090 si el 8089 está ocupado.
PUERTO=${PUERTO:-8089}
# Correlativo del resumen (RC): cambia en cada corrida para no repetir un RC ya enviado a SUNAT beta.
CORR=$(( $(date +%s) % 99999 + 1 ))
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TMP/key.pem" -out "$TMP/cert.pem" -days 365 \
  -subj "/CN=EMPRESA BETA SAC/serialNumber=20000000001" 2>/dev/null
openssl pkcs12 -export -inkey "$TMP/key.pem" -in "$TMP/cert.pem" -out "$TMP/cert.pfx" -passout pass:clave123
PFX=$(base64 < "$TMP/cert.pfx" | tr -d '\n')

docker build -q -t sunat-engine:test . >/dev/null
docker rm -f sunat-engine-test >/dev/null 2>&1 || true
docker run -d --name sunat-engine-test -e ENGINE_TOKEN=prueba -p "$PUERTO:80" sunat-engine:test >/dev/null
trap 'docker rm -f sunat-engine-test >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do curl -sf "localhost:$PUERTO/salud" >/dev/null && break; sleep 1; done

relleno() { sed -e "s|__PFX__|$PFX|g" -e "s|__HOY__|$HOY|g" -e "s|__CORR__|$CORR|g" "tests/fixtures/$1"; }
cuerpo() { printf '{"emisor":%s,"%s":%s}' "$(relleno emisor.json)" "$1" "$(relleno "$2")"; }
llamar() { curl -s -X POST "localhost:$PUERTO$1" -H 'content-type: application/json' -H 'x-engine-token: prueba' --data-binary @-; }
falla() { echo "FALLA: $1"; echo "$2"; exit 1; }

R=$(printf '{"pfxBase64":"%s","clave":"clave123"}' "$PFX" | llamar /certificado/inspeccionar)
echo "$R" | grep -q '"ruc":"20000000001"' || falla "inspeccionar" "$R"

R=$(curl -s -X POST "localhost:$PUERTO/comprobantes/firmar" -H 'x-engine-token: malo' -d '{}')
echo "$R" | grep -q 'No autorizado' || falla "token" "$R"

for f in factura.json factura-credito-detraccion.json nota-credito.json; do
  R=$(cuerpo comprobante "$f" | llamar /comprobantes/firmar)
  echo "$R" | grep -q '"hash":"[^"]' || falla "firmar $f" "$R"
done
echo "OK: contrato del motor (inspeccionar, token, firmar factura/crédito+detracción/nota)"

# Fechas: una cuota con fechaPago 2030-12-31 debe salir en el XML firmado como 2030-12-31 (no un día antes).
FIRMA_CRED=$(cuerpo comprobante factura-credito-detraccion.json | llamar /comprobantes/firmar)
XML_CRED=$(echo "$FIRMA_CRED" | sed -E 's/.*"xmlBase64":"([^"]+)".*/\1/' | sed 's|\\/|/|g' | openssl base64 -d -A)
echo "$XML_CRED" | grep -q 'PaymentDueDate>2030-12-31<' || falla "fecha de cuota" "$(echo "$FIRMA_CRED" | cut -c1-300)"
if echo "$XML_CRED" | grep -q 'PaymentDueDate>2030-12-30<'; then falla "fecha de cuota corrida un día" "$(echo "$XML_CRED" | grep -o 'PaymentDueDate>[^<]*' | head -1)"; fi
echo "OK: fecha de cuota en el XML firmado = 2030-12-31"

# Sin BETA: el resumen no llega a SUNAT; basta con que la ruta exista y valide (422, nunca 500).
if [ "${BETA:-0}" != "1" ]; then
  CODIGO=$(printf '{"emisor":%s}' "$(relleno emisor.json)" | curl -s -o /dev/null -w '%{http_code}' -X POST "localhost:$PUERTO/resumenes/enviar" -H 'content-type: application/json' -H 'x-engine-token: prueba' --data-binary @-)
  [ "$CODIGO" = "422" ] || falla "ruta resumenes sin resumen" "HTTP $CODIGO"
  echo "OK: ruta /resumenes/enviar responde (422 sin resumen, sin 500)"
fi

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

  # Resumen diario (RC) con porcentajeIgv: SUNAT rechaza en el ticket (2992 sin porcentaje), así que se consulta hasta el resultado.
  R=$(cuerpo resumen resumen.json | llamar /resumenes/enviar)
  echo "$R" | grep -q '"ticket":"[^"]' || falla "resumen beta" "$R"
  TICKET=$(echo "$R" | sed -E 's/.*"ticket":"([^"]+)".*/\1/')
  for _ in $(seq 1 40); do
    E=$(printf '{"emisor":%s,"ticket":"%s"}' "$(relleno emisor.json)" "$TICKET" | llamar /tickets/consultar)
    echo "$E" | grep -q '"pendiente":false' && break
    sleep 3
  done
  echo "$E" | grep -q '"pendiente":false' || falla "ticket del resumen sigue pendiente" "$E"
  echo "$E" | grep -qE '"codigo":"0"' || falla "resumen rechazado por SUNAT" "$E"
  echo "OK: SUNAT beta aceptó el resumen (RC) con porcentajeIgv"
fi
