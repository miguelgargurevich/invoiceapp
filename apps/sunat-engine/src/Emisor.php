<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\See;
use Greenter\Ws\Services\SunatEndpoints;

final class Emisor
{
    public static function see(array $e): See
    {
        foreach (['ruc', 'solUsuario', 'solClave', 'certificadoPfxBase64', 'certificadoClave', 'ambiente'] as $campo) {
            if (!isset($e[$campo]) || $e[$campo] === '') {
                throw new ErrorDatos("Falta emisor.$campo");
            }
        }
        $certificado = Certificado::leer($e['certificadoPfxBase64'], $e['certificadoClave']);

        $see = new See();
        $see->setCertificate($certificado['pem']);
        $see->setService($e['ambiente'] === 'PRODUCCION' ? SunatEndpoints::FE_PRODUCCION : SunatEndpoints::FE_BETA);
        $see->setClaveSOL($e['ruc'], $e['solUsuario'], $e['solClave']);

        return $see;
    }

    public static function compania(array $e): Company
    {
        $d = $e['direccion'] ?? throw new ErrorDatos('Falta emisor.direccion');

        return (new Company())
            ->setRuc($e['ruc'])
            ->setRazonSocial($e['razonSocial'])
            ->setNombreComercial($e['nombreComercial'] ?? $e['razonSocial'])
            ->setAddress((new Address())
                ->setUbigueo($d['ubigeo'])
                ->setDepartamento($d['departamento'])
                ->setProvincia($d['provincia'])
                ->setDistrito($d['distrito'])
                ->setUrbanizacion($d['urbanizacion'] ?? '-')
                ->setDireccion($d['direccion'])
                ->setCodLocal($d['codLocal'] ?? '0000'));
    }
}
