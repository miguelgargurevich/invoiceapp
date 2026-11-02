'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, Send } from 'lucide-react';
import { Button, Card, ConfirmDialog, Input, SearchableSelect, Select, Textarea } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { sunatApi } from '@/lib/sunat/api';
import { useCatalogosSunat, useEmisorSunat } from '@/lib/sunat/hooks';
import { normalizarError } from '@/lib/sunat/errores';
import { filasDesdeVista, numeroComprobante } from '@/lib/sunat/formato';
import {
  aPayload, camposVisibles, clientesPermitidos, diferenciaCuotas, esNota, listoParaVistaPrevia, payloadVistaPrevia, seriesDeTipo,
  type FormularioComprobante,
} from '@/lib/sunat/formulario';
import type { ClienteResumen, Comprobante, Moneda, ProductoResumen, Serie, TipoComprobante, TipoOperacion, VistaPrevia } from '@/lib/sunat/tipos';
import { CuotasEditor } from './CuotasEditor';
import { LineasEditor } from './LineasEditor';
import { PanelTotales } from './PanelTotales';

interface Props {
  locale: string;
  inicial: FormularioComprobante;
  comprobanteId?: string;
  documentoAfectado?: Comprobante | null;
}

const comoLista = <T,>(r: T[] | { data: T[] }): T[] => (Array.isArray(r) ? r : r.data ?? []);

export function ComprobanteForm({ locale, inicial, comprobanteId, documentoAfectado = null }: Props) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const catalogos = useCatalogosSunat();
  const { emisor } = useEmisorSunat();
  const [f, setF] = useState<FormularioComprobante>(inicial);
  const [series, setSeries] = useState<Serie[]>([]);
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [productos, setProductos] = useState<ProductoResumen[]>([]);
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorVista, setErrorVista] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState<'borrador' | 'emitir' | null>(null);
  const [confirmarEmision, setConfirmarEmision] = useState(false);
  const peticion = useRef(0);

  useEffect(() => {
    sunatApi.series().then(setSeries).catch(() => setSeries([]));
    api.get<ClienteResumen[] | { data: ClienteResumen[] }>('/clientes', { limit: '500' })
      .then((r) => setClientes(comoLista(r))).catch(() => setClientes([]));
    api.get<ProductoResumen[] | { data: ProductoResumen[] }>('/productos', { limit: '500' })
      .then((r) => setProductos(comoLista(r))).catch(() => setProductos([]));
  }, []);

  const nota = esNota(f.tipoComprobante);
  const visibles = camposVisibles(f, emisor);
  const seriesTipo = useMemo(() => seriesDeTipo(series, f.tipoComprobante), [series, f.tipoComprobante]);
  const opcionesClientes = useMemo(
    () => clientesPermitidos(clientes, f).map((c) => ({ value: c.id, label: c.razonSocial || c.nombre || '', description: c.numeroDocumento ?? undefined })),
    [clientes, f],
  );
  const cambiar = (cambios: Partial<FormularioComprobante>) => setF((actual) => ({ ...actual, ...cambios }));

  useEffect(() => {
    if (!f.serie && seriesTipo.length === 1) setF((actual) => ({ ...actual, serie: seriesTipo[0].serie }));
  }, [seriesTipo, f.serie]);

  const clavePayload = JSON.stringify(payloadVistaPrevia(f));
  useEffect(() => {
    if (!listoParaVistaPrevia(f)) {
      setVista(null);
      setErrorVista(null);
      setCalculando(false);
      return undefined;
    }
    const id = ++peticion.current;
    setCalculando(true);
    const temporizador = setTimeout(async () => {
      try {
        const r = await sunatApi.vistaPrevia(payloadVistaPrevia(f));
        if (id === peticion.current) { setVista(r); setErrorVista(null); }
      } catch (error) {
        if (id === peticion.current) { setVista(null); setErrorVista(normalizarError(error, t('errores.noDisponible')).mensaje); }
      } finally {
        if (id === peticion.current) setCalculando(false);
      }
    }, 500);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePayload]);

  const cambiarOperacion = (tipoOperacion: TipoOperacion) => setF((actual) => ({
    ...actual,
    tipoOperacion,
    lineas: actual.lineas.map((l) => ({
      ...l,
      afectacion: tipoOperacion === '0200' ? '40' : l.afectacion === '40' ? '10' : l.afectacion,
    })),
    detraccionCodigo: tipoOperacion === '1001' ? actual.detraccionCodigo : '',
  }));

  const guardar = async (emitir: boolean) => {
    setErrores([]);
    setGuardando(emitir ? 'emitir' : 'borrador');
    let id = comprobanteId;
    try {
      const payload = aPayload(f);
      const guardado = id ? await sunatApi.actualizar(id, payload) : await sunatApi.crear(payload);
      id = guardado.id;
      if (emitir) await sunatApi.emitir(id);
      showSuccess(emitir ? t('form.emitido') : t('form.guardado'));
      router.push(`/${locale}/comprobantes/${id}`);
    } catch (error) {
      const n = normalizarError(error, t('errores.noDisponible'));
      setErrores(n.errores.length ? n.errores : [n.mensaje]);
      showError(n.mensaje);
      // Si el borrador se creó pero la emisión falló, se va a su detalle para no duplicarlo al reintentar.
      if (id && id !== comprobanteId) router.push(`/${locale}/comprobantes/${id}`);
    } finally {
      setGuardando(null);
      setConfirmarEmision(false);
    }
  };

  const opcionesCatalogo = (lista: { codigo: string; descripcion: string }[] = []) =>
    lista.map((o) => ({ value: o.codigo, label: o.descripcion }));
  const motivos = f.tipoComprobante === '08' ? catalogos?.motivosNotaDebito : catalogos?.motivosNotaCredito;
  const opcionesTipo = (nota ? [f.tipoComprobante] : (['01', '03'] as TipoComprobante[]))
    .map((tipo) => ({ value: tipo, label: t(`tipos.${tipo}`) }));

  // Con crédito, el backend exige cuotas que sumen el neto pendiente al céntimo: sin eso no se puede emitir.
  // «Guardar borrador» no depende de esto.
  const creditoSinCuotasExactas = visibles.cuotas
    && (f.cuotas.length === 0 || !vista || diferenciaCuotas(f.cuotas, vista.netoPendiente) !== '0.00');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t('form.tipoComprobante')}
              options={opcionesTipo}
              value={f.tipoComprobante}
              disabled={nota || Boolean(comprobanteId)}
              onChange={(e) => cambiar({ tipoComprobante: e.target.value as TipoComprobante, serie: '' })}
            />
            <div>
              <Select
                label={t('form.serie')}
                placeholder={t('form.seleccionaSerie')}
                options={seriesTipo.map((s) => ({ value: s.serie, label: s.serie }))}
                value={f.serie}
                onChange={(e) => cambiar({ serie: e.target.value })}
              />
              {seriesTipo.length === 0 && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  {t('form.sinSeries')}{' '}
                  <a href={`/${locale}/configuracion?tab=sunat`} className="font-medium underline">{t('form.irConfigSunat')}</a>
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <SearchableSelect
                label={t('form.cliente')}
                placeholder={t('form.seleccionaCliente')}
                searchPlaceholder={t('form.buscarCliente')}
                options={opcionesClientes}
                value={f.clienteId}
                disabled={nota}
                onChange={(clienteId) => cambiar({ clienteId })}
              />
            </div>
            {visibles.operacion && (
              <Select
                label={t('form.operacion')}
                options={opcionesCatalogo(catalogos?.tiposOperacion)}
                value={f.tipoOperacion}
                onChange={(e) => cambiarOperacion(e.target.value as TipoOperacion)}
              />
            )}
            <Select
              label={t('form.moneda')}
              options={[{ value: 'PEN', label: 'PEN' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
              value={f.moneda}
              disabled={nota}
              onChange={(e) => cambiar({ moneda: e.target.value as Moneda })}
            />
            {visibles.tipoCambio && (
              <Input label={t('form.tipoCambio')} inputMode="decimal" value={f.tipoCambio} disabled={nota} onChange={(e) => cambiar({ tipoCambio: e.target.value })} />
            )}
            {visibles.detraccion && (
              <Select
                label={t('form.detraccion')}
                placeholder={t('form.seleccionaDetraccion')}
                options={(catalogos?.detracciones ?? []).map((d) => ({ value: d.codigo, label: `${d.codigo} · ${d.descripcion} (${d.porcentaje} %)` }))}
                value={f.detraccionCodigo}
                onChange={(e) => cambiar({ detraccionCodigo: e.target.value })}
              />
            )}
            {visibles.percepcion && (
              <Select
                label={t('form.percepcion')}
                options={[{ value: '', label: t('form.sinPercepcion') }, ...(catalogos?.percepciones ?? []).map((p) => ({ value: p.codigo, label: `${p.descripcion} (${p.porcentaje} %)` }))]}
                value={f.percepcionRegimen}
                onChange={(e) => cambiar({ percepcionRegimen: e.target.value })}
              />
            )}
          </div>
        </Card>

        {visibles.documentoAfectado && (
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('form.documentoAfectado')}</p>
            {documentoAfectado && (
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                {t(`tipos.${documentoAfectado.tipoComprobante}`)} {numeroComprobante(documentoAfectado)}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t('form.motivo')}
                placeholder={t('form.seleccionaMotivo')}
                options={opcionesCatalogo(motivos)}
                value={f.motivoCodigo}
                onChange={(e) => cambiar({ motivoCodigo: e.target.value })}
              />
              <Input label={t('form.motivoDescripcion')} value={f.motivoDescripcion} maxLength={250} onChange={(e) => cambiar({ motivoDescripcion: e.target.value })} />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('form.lineas')}</h2>
          <LineasEditor
            lineas={f.lineas}
            onChange={(lineas) => cambiar({ lineas })}
            productos={productos}
            unidades={catalogos?.unidades ?? [{ codigo: 'NIU', descripcion: 'Unidad (bienes)' }]}
            afectaciones={catalogos?.afectaciones ?? []}
            exportacion={f.tipoOperacion === '0200'}
          />
        </Card>

        {visibles.formaPago && (
          <Card>
            <div className="max-w-xs">
              <Select
                label={t('form.formaPago')}
                options={[{ value: 'Contado', label: t('form.contado') }, { value: 'Credito', label: t('form.credito') }]}
                value={f.formaPago}
                onChange={(e) => cambiar({ formaPago: e.target.value as 'Contado' | 'Credito' })}
              />
            </div>
            {visibles.cuotas && (
              <div className="mt-4">
                <CuotasEditor cuotas={f.cuotas} onChange={(cuotas) => cambiar({ cuotas })} neto={vista?.netoPendiente ?? null} moneda={f.moneda} />
              </div>
            )}
          </Card>
        )}

        <Card>
          <Textarea label={t('form.observaciones')} value={f.observaciones} rows={2} maxLength={1000} onChange={(e) => cambiar({ observaciones: e.target.value })} />
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 self-start">
        <PanelTotales
          filas={vista ? filasDesdeVista(vista) : []}
          total={vista?.totales.total ?? null}
          montoEnLetras={vista?.leyendas[0]?.valor ?? null}
          moneda={f.moneda}
          cargando={calculando}
          error={errorVista}
        />
        {errores.length > 0 && (
          <Card className="border-red-300 dark:border-red-700">
            <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">{t('form.revisa')}</p>
            <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400 space-y-1">
              {errores.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </Card>
        )}
        <div className="flex flex-col gap-2">
          <Button variant="outline" icon={<Save className="w-4 h-4" />} loading={guardando === 'borrador'} disabled={guardando !== null} onClick={() => guardar(false)}>
            {t('form.guardarBorrador')}
          </Button>
          <Button icon={<Send className="w-4 h-4" />} disabled={!vista || Boolean(errorVista) || guardando !== null || creditoSinCuotasExactas} onClick={() => setConfirmarEmision(true)}>
            {t('form.guardarEmitir')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmarEmision}
        onClose={() => setConfirmarEmision(false)}
        onConfirm={() => guardar(true)}
        title={t('form.confirmarEmitirTitulo')}
        message={t('form.confirmarEmitir')}
        confirmLabel={t('form.emitir')}
        variant="warning"
        loading={guardando === 'emitir'}
      />
    </div>
  );
}
