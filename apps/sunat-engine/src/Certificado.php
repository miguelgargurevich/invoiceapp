<?php
declare(strict_types=1);

namespace Engine;

final class Certificado
{
    /** @return array{pem: string, ruc: ?string, vence: string, sujeto: string} */
    public static function leer(string $pfxBase64, string $clave): array
    {
        $pfx = base64_decode($pfxBase64, true);
        if ($pfx === false || $pfx === '') {
            throw new ErrorDatos('El certificado no está en base64');
        }
        $certs = [];
        if (!openssl_pkcs12_read($pfx, $certs, $clave)) {
            throw new ErrorDatos('No se pudo abrir el certificado: clave incorrecta o formato no soportado');
        }
        $info = openssl_x509_parse($certs['cert']);
        if ($info === false) {
            throw new ErrorDatos('El certificado no es un X.509 válido');
        }
        $sujeto = json_encode($info['subject'] ?? [], JSON_UNESCAPED_UNICODE) ?: '';
        preg_match('/\b(10|15|17|20)\d{9}\b/', $sujeto, $m);

        return [
            'pem' => $certs['pkey'] . $certs['cert'],
            'ruc' => $m[0] ?? null,
            'vence' => gmdate('c', (int) $info['validTo_time_t']),
            'sujeto' => (string) ($info['name'] ?? ''),
        ];
    }
}
