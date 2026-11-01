<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Client\Client;
use Greenter\Model\Sale\Charge;
use Greenter\Model\Sale\Cuota;
use Greenter\Model\Sale\Detraction;
use Greenter\Model\Sale\Document;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\FormaPagos\FormaPagoCredito;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\Note;
use Greenter\Model\Sale\SaleDetail;
use Greenter\Model\Sale\SalePerception;
use Greenter\Model\Summary\Summary;
use Greenter\Model\Summary\SummaryDetail;
use Greenter\Model\Voided\Voided;
use Greenter\Model\Voided\VoidedDetail;

// JSON del backend (src/sunat/engine/mapper.js) → modelos Greenter.
final class Mapper
{
    public static function documento(array $e, array $c): Invoice|Note
    {
        $esNota = in_array($c['tipoDoc'] ?? '', ['07', '08'], true);
        $doc = $esNota ? new Note() : new Invoice();
        $t = $c['totales'] ?? throw new ErrorDatos('Falta comprobante.totales');

        $doc->setUblVersion('2.1')
            ->setTipoDoc($c['tipoDoc'])
            ->setSerie($c['serie'])
            ->setCorrelativo((string) $c['correlativo'])
            ->setFechaEmision(new \DateTime($c['fechaEmision']))
            ->setTipoMoneda($c['moneda'])
            ->setCompany(Emisor::compania($e))
            ->setClient(self::cliente($c['cliente']))
            ->setMtoOperGravadas((float) $t['gravadas'])
            ->setMtoOperExoneradas((float) $t['exoneradas'])
            ->setMtoOperInafectas((float) $t['inafectas'])
            ->setMtoOperExportacion((float) $t['exportacion'])
            ->setMtoIGV((float) $t['igv'])
            ->setIcbper((float) $t['icbper'])
            ->setTotalImpuestos((float) $t['totalImpuestos'])
            ->setValorVenta((float) $t['valorVenta'])
            ->setSubTotal((float) $t['subTotal'])
            ->setMtoImpVenta((float) $t['total'])
            ->setDetails(array_map([self::class, 'linea'], $c['lineas']))
            ->setLegends(array_map(
                fn (array $l) => (new Legend())->setCode($l['codigo'])->setValue($l['valor']),
                $c['leyendas']
            ));

        if ($doc instanceof Note) {
            $a = $c['documentoAfectado'] ?? throw new ErrorDatos('Una nota requiere documentoAfectado');
            $doc->setTipDocAfectado($a['tipoDoc'])
                ->setNumDocfectado($a['numero'])
                ->setCodMotivo($a['motivoCodigo'])
                ->setDesMotivo($a['motivoDescripcion']);
            return $doc;
        }

        $doc->setTipoOperacion($c['tipoOperacion']);
        self::formaPago($doc, $c['formaPago'] ?? ['tipo' => 'Contado'], $c['moneda']);

        if (!empty($c['detraccion'])) {
            $d = $c['detraccion'];
            $doc->setDetraccion((new Detraction())
                ->setCodBienDetraccion($d['codigo'])
                ->setCodMedioPago($d['medioPago'] ?? '001')
                ->setCtaBanco($d['cuentaBanco'])
                ->setPercent((float) $d['porcentaje'])
                ->setMount((float) $d['monto']));
        }
        if (!empty($c['percepcion'])) {
            $p = $c['percepcion'];
            $doc->setPerception((new SalePerception())
                ->setCodReg($p['regimen'])
                ->setPorcentaje((float) $p['porcentaje'] / 100)
                ->setMtoBase((float) $p['base'])
                ->setMto((float) $p['monto'])
                ->setMtoTotal((float) $p['total']));
        }
        if (!empty($c['retencion'])) {
            $r = $c['retencion'];
            $doc->setDescuentos([(new Charge())
                ->setCodTipo('62')
                ->setMontoBase((float) $r['base'])
                ->setFactor((float) $r['porcentaje'] / 100)
                ->setMonto((float) $r['monto'])]);
        }

        return $doc;
    }

    public static function resumen(array $e, array $r): Summary
    {
        return (new Summary())
            ->setFecGeneracion(new \DateTime($r['fecGeneracion']))
            ->setFecResumen(new \DateTime($r['fecResumen']))
            ->setCorrelativo((string) $r['correlativo'])
            ->setMoneda($r['moneda'] ?? 'PEN')
            ->setCompany(Emisor::compania($e))
            ->setDetails(array_map(function (array $d): SummaryDetail {
                $detalle = (new SummaryDetail())
                    ->setTipoDoc($d['tipoDoc'])
                    ->setSerieNro($d['serieNro'])
                    ->setEstado($d['estado'])
                    ->setClienteTipo($d['clienteTipo'])
                    ->setClienteNro($d['clienteNro'])
                    ->setTotal((float) $d['total'])
                    ->setMtoOperGravadas((float) $d['gravadas'])
                    ->setMtoOperExoneradas((float) $d['exoneradas'])
                    ->setMtoOperInafectas((float) $d['inafectas'])
                    ->setMtoOperExportacion((float) $d['exportacion'])
                    ->setMtoIGV((float) $d['igv']);
                if (!empty($d['docReferencia'])) {
                    $detalle->setDocReferencia((new Document())
                        ->setTipoDoc($d['docReferencia']['tipoDoc'])
                        ->setNroDoc($d['docReferencia']['numero']));
                }
                return $detalle;
            }, $r['detalles']));
    }

    public static function baja(array $e, array $b): Voided
    {
        return (new Voided())
            ->setCorrelativo((string) $b['correlativo'])
            ->setFecGeneracion(new \DateTime($b['fecGeneracion']))
            ->setFecComunicacion(new \DateTime($b['fecComunicacion']))
            ->setCompany(Emisor::compania($e))
            ->setDetails(array_map(
                fn (array $d) => (new VoidedDetail())
                    ->setTipoDoc($d['tipoDoc'])
                    ->setSerie($d['serie'])
                    ->setCorrelativo((string) $d['correlativo'])
                    ->setDesMotivoBaja($d['motivo']),
                $b['detalles']
            ));
    }

    private static function linea(array $l): SaleDetail
    {
        $d = (new SaleDetail())
            ->setCodProducto($l['codigo'] ?? null)
            ->setUnidad($l['unidad'])
            ->setCantidad((float) $l['cantidad'])
            ->setDescripcion($l['descripcion'])
            ->setMtoValorUnitario((float) $l['valorUnitario'])
            ->setMtoBaseIgv((float) $l['baseIgv'])
            ->setPorcentajeIgv((float) $l['porcentajeIgv'])
            ->setIgv((float) $l['igv'])
            ->setTipAfeIgv($l['afectacion'])
            ->setTotalImpuestos((float) $l['totalImpuestos'])
            ->setMtoValorVenta((float) $l['valorVenta'])
            ->setMtoPrecioUnitario((float) $l['precioUnitario']);

        if ((int) ($l['bolsas'] ?? 0) > 0) {
            $d->setFactorIcbper((float) $l['factorIcbper'])->setIcbper((float) $l['icbper']);
        }
        if ((float) ($l['descuento'] ?? 0) > 0) {
            $d->setDescuentos([(new Charge())
                ->setCodTipo('00')
                ->setMontoBase((float) $l['valorBruto'])
                ->setFactor(round((float) $l['descuento'] / (float) $l['valorBruto'], 5))
                ->setMonto((float) $l['descuento'])]);
        }

        return $d;
    }

    private static function formaPago(Invoice $doc, array $f, string $moneda): void
    {
        if (($f['tipo'] ?? 'Contado') !== 'Credito') {
            $doc->setFormaPago(new FormaPagoContado());
            return;
        }
        $doc->setFormaPago(new FormaPagoCredito((float) $f['monto'], $moneda));
        $doc->setCuotas(array_map(
            fn (array $q) => (new Cuota())->setMonto((float) $q['monto'])->setFechaPago(new \DateTime($q['fechaPago'])),
            $f['cuotas']
        ));
    }

    private static function cliente(array $c): Client
    {
        return (new Client())
            ->setTipoDoc($c['tipoDoc'])
            ->setNumDoc($c['numDoc'])
            ->setRznSocial($c['razonSocial']);
    }
}
