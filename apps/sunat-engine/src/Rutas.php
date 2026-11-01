<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Note;
use Greenter\Ws\Services\ConsultCdrService;
use Greenter\Ws\Services\SoapClient;

final class Rutas
{
    private const CONSULTA_CDR = 'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService?wsdl';

    public function atender(string $ruta, array $b): array
    {
        return match ($ruta) {
            '/certificado/inspeccionar' => $this->inspeccionar($b),
            '/comprobantes/firmar' => $this->firmar($b),
            '/comprobantes/enviar' => $this->enviar($b),
            '/comprobantes/cdr' => $this->cdr($b),
            '/resumenes/enviar' => $this->conTicket($b, 'resumen'),
            '/bajas/enviar' => $this->conTicket($b, 'baja'),
            '/tickets/consultar' => $this->ticket($b),
            default => throw new ErrorDatos("Ruta desconocida: $ruta"),
        };
    }

    private function inspeccionar(array $b): array
    {
        $c = Certificado::leer((string) ($b['pfxBase64'] ?? ''), (string) ($b['clave'] ?? ''));
        return ['ruc' => $c['ruc'], 'vence' => $c['vence'], 'sujeto' => $c['sujeto']];
    }

    private function firmar(array $b): array
    {
        $emisor = $b['emisor'] ?? throw new ErrorDatos('Falta emisor');
        $see = Emisor::see($emisor);
        $doc = Mapper::documento($emisor, $b['comprobante'] ?? throw new ErrorDatos('Falta comprobante'));
        $xml = $see->getXmlSigned($doc);
        return ['xmlBase64' => base64_encode($xml), 'hash' => self::hash($xml), 'nombre' => $doc->getName()];
    }

    private function enviar(array $b): array
    {
        $see = Emisor::see($b['emisor'] ?? throw new ErrorDatos('Falta emisor'));
        $xml = base64_decode((string) ($b['xmlBase64'] ?? ''), true);
        if ($xml === false || $xml === '') {
            throw new ErrorDatos('xmlBase64 inválido');
        }
        $clase = in_array($b['tipoDoc'] ?? '', ['07', '08'], true) ? Note::class : Invoice::class;
        return Respuesta::deEnvio($see->sendXml($clase, (string) $b['nombre'], $xml));
    }

    private function cdr(array $b): array
    {
        $e = $b['emisor'] ?? throw new ErrorDatos('Falta emisor');
        if (($e['ambiente'] ?? 'BETA') !== 'PRODUCCION') {
            return ['codigo' => null, 'descripcion' => 'La consulta de CDR no existe en beta', 'observaciones' => [], 'cdrZipBase64' => null, 'excepcion' => true];
        }
        $ws = new SoapClient(self::CONSULTA_CDR);
        $ws->setCredentials($e['ruc'] . $e['solUsuario'], $e['solClave']);
        $servicio = new ConsultCdrService();
        $servicio->setClient($ws);
        return Respuesta::deEnvio($servicio->getStatusCdr($e['ruc'], $b['tipoDoc'], $b['serie'], (int) $b['correlativo']));
    }

    private function conTicket(array $b, string $tipo): array
    {
        $emisor = $b['emisor'] ?? throw new ErrorDatos('Falta emisor');
        $see = Emisor::see($emisor);
        $doc = $tipo === 'resumen'
            ? Mapper::resumen($emisor, $b['resumen'] ?? throw new ErrorDatos('Falta resumen'))
            : Mapper::baja($emisor, $b['baja'] ?? throw new ErrorDatos('Falta baja'));
        $r = $see->send($doc);
        $xml = $see->getFactory()->getLastXml();
        if (!$r->isSuccess()) {
            return [
                'ticket' => null,
                'codigo' => Respuesta::codigo($r->getError()?->getCode()),
                'descripcion' => $r->getError()?->getMessage(),
                'xmlBase64' => $xml ? base64_encode($xml) : null,
                'nombre' => $doc->getName(),
            ];
        }
        return ['ticket' => $r->getTicket(), 'xmlBase64' => base64_encode($xml), 'nombre' => $doc->getName()];
    }

    private function ticket(array $b): array
    {
        $see = Emisor::see($b['emisor'] ?? throw new ErrorDatos('Falta emisor'));
        return Respuesta::deTicket($see->getStatus((string) ($b['ticket'] ?? throw new ErrorDatos('Falta ticket'))));
    }

    private static function hash(string $xml): string
    {
        $dom = new \DOMDocument();
        $dom->loadXML($xml);
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        $nodo = $xpath->query('//ds:DigestValue')->item(0);
        if ($nodo === null) {
            throw new \RuntimeException('El XML firmado no tiene DigestValue');
        }
        return trim($nodo->nodeValue);
    }
}
