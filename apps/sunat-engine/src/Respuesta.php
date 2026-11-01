<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Response\BaseResult;
use Greenter\Model\Response\StatusResult;

final class Respuesta
{
    // "soap-env:Client.1033" → "1033"; "0100" → "100"; "0" → "0"
    public static function codigo(?string $codigo): ?string
    {
        if ($codigo === null || $codigo === '') {
            return null;
        }
        return preg_match('/\d+/', $codigo, $m) ? (string) (int) $m[0] : null;
    }

    public static function deEnvio(BaseResult $r): array
    {
        if (!$r->isSuccess() || !method_exists($r, 'getCdrResponse') || $r->getCdrResponse() === null) {
            $error = $r->getError();
            return [
                'codigo' => self::codigo($error?->getCode()),
                'descripcion' => $error?->getMessage() ?? 'SUNAT no devolvió CDR',
                'observaciones' => [],
                'cdrZipBase64' => null,
                'excepcion' => true,
            ];
        }
        $cdr = $r->getCdrResponse();
        return [
            'codigo' => self::codigo((string) $cdr->getCode()),
            'descripcion' => $cdr->getDescription(),
            'observaciones' => $cdr->getNotes() ?? [],
            'cdrZipBase64' => $r->getCdrZip() ? base64_encode($r->getCdrZip()) : null,
            'excepcion' => false,
        ];
    }

    public static function deTicket(StatusResult $r): array
    {
        if ((string) $r->getCode() === '98') {
            return ['pendiente' => true, 'codigo' => '98', 'descripcion' => 'En proceso', 'cdrZipBase64' => null];
        }
        if (!$r->isSuccess()) {
            $error = $r->getError();
            $codigo = self::codigo($error?->getCode());
            return ['pendiente' => $codigo === '98', 'codigo' => $codigo, 'descripcion' => $error?->getMessage(), 'cdrZipBase64' => null];
        }
        $cdr = $r->getCdrResponse();
        return [
            'pendiente' => false,
            'codigo' => self::codigo((string) ($cdr?->getCode() ?? $r->getCode())),
            'descripcion' => $cdr?->getDescription(),
            'cdrZipBase64' => $r->getCdrZip() ? base64_encode($r->getCdrZip()) : null,
        ];
    }
}
