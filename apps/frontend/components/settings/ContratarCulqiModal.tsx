'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button, Input, Modal } from '@/components/common';
import {
  formatPrice,
  suscribirCulqi,
  cambiarTarjetaCulqi,
  type Plan,
  type Facturacion,
  type RespuestaCulqi,
  type Autenticacion3DS,
} from '@/lib/subscriptions';
import {
  pedirTokenTarjeta,
  autenticar3DS,
  validarFacturacion,
  montoCentimos,
  MONTO_CAMBIO_TARJETA_CENTIMOS,
  type ErrorFacturacion,
} from '@/lib/culqi';

interface Props {
  plan: Plan;
  intervalo: 'MONTH' | 'YEAR';
  modo: 'contratar' | 'tarjeta';
  email: string;
  inicial: Partial<Facturacion>;
  onListo: () => void;
  onCerrar: () => void;
}

// Etapas: form (esperando al usuario) → tarjeta (checkout de Culqi abierto) → procesando (llamada al backend)
// → 3ds (autenticación del banco) → listo.
type Etapa = 'form' | 'tarjeta' | 'procesando' | '3ds' | 'listo';

const CAMPOS: (keyof Facturacion)[] = ['nombre', 'apellido', 'telefono', 'direccion', 'ciudad'];

export default function ContratarCulqiModal({ plan, intervalo, modo, email, inicial, onListo, onCerrar }: Props) {
  const t = useTranslations('subscription.culqi');
  const [facturacion, setFacturacion] = useState<Facturacion>({
    nombre: inicial.nombre ?? '',
    apellido: inicial.apellido ?? '',
    telefono: inicial.telefono ?? '',
    direccion: inicial.direccion ?? '',
    ciudad: inicial.ciudad ?? '',
  });
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<keyof Facturacion | 'terminos', ErrorFacturacion | 'requerido'>>>({});
  const [error, setError] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('form');

  // El ref se marca al instante (el estado llega tarde): así un doble clic nunca lanza dos pagos.
  const enCurso = useRef(false);
  const abortar = useRef<AbortController | null>(null);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      abortar.current?.abort();
    };
  }, []);

  const precio = intervalo === 'YEAR' ? plan.priceYearly : plan.priceMonthly;
  const ocupado = etapa !== 'form';
  // No se deja cerrar mientras el backend o el banco están trabajando: el cobro podría completarse igual.
  const puedeCerrar = etapa === 'form' || etapa === 'tarjeta';

  const cerrar = () => {
    if (!puedeCerrar) return;
    abortar.current?.abort();
    onCerrar();
  };

  const cambiar = (campo: keyof Facturacion, valor: string) => {
    setFacturacion((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const textoError = (campo: keyof Facturacion) => {
    const codigo = errores[campo];
    return codigo ? t(`errores.${codigo}`) : undefined;
  };

  const pagar = async () => {
    if (enCurso.current) return;
    setError(null);

    const datos: Facturacion = {
      nombre: facturacion.nombre.trim(),
      apellido: facturacion.apellido.trim(),
      telefono: facturacion.telefono.trim(),
      direccion: facturacion.direccion.trim(),
      ciudad: facturacion.ciudad.trim(),
    };

    if (modo === 'contratar') {
      const faltas: Partial<Record<keyof Facturacion | 'terminos', ErrorFacturacion | 'requerido'>> = validarFacturacion(datos);
      if (!acepto) faltas.terminos = 'requerido';
      if (Object.keys(faltas).length > 0) {
        setErrores(faltas);
        return;
      }
    }

    enCurso.current = true;
    const control = new AbortController();
    abortar.current = control;
    let terminoBien = false;
    try {
      setEtapa('tarjeta');
      const tokenId = await pedirTokenTarjeta({
        titulo: modo === 'contratar' ? plan.name : t('cambiarTarjeta'),
        email,
        nombre: datos.nombre || email,
        apellido: datos.apellido || '-',
        signal: control.signal,
      });
      if (!montado.current) return;
      setEtapa('procesando');

      const llamar = (authentication3DS?: Autenticacion3DS): Promise<RespuestaCulqi> =>
        modo === 'contratar'
          ? suscribirCulqi({ planSlug: plan.id, intervalo, tokenId, facturacion: datos, authentication3DS })
          : cambiarTarjetaCulqi({ tokenId, authentication3DS });

      let respuesta = await llamar();
      if (respuesta.requiere3DS) {
        setEtapa('3ds');
        const authentication3DS = await autenticar3DS(tokenId, {
          email,
          montoCentimos: modo === 'contratar' ? montoCentimos(precio) : MONTO_CAMBIO_TARJETA_CENTIMOS,
        });
        setEtapa('procesando');
        respuesta = await llamar(authentication3DS);
      }

      if (respuesta.subscription || respuesta.ok) {
        terminoBien = true;
        setEtapa('listo');
        onListo();
      } else {
        setError(t('errorGenerico'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (montado.current) setError(err instanceof Error && err.message ? err.message : t('errorGenerico'));
    } finally {
      enCurso.current = false;
      if (montado.current && !terminoBien) setEtapa('form');
    }
  };

  // Culqi no avisa si el usuario cierra su ventana de tarjeta: este botón suelta la espera.
  const reintentar = () => {
    abortar.current?.abort();
  };

  const textoBoton =
    etapa === 'procesando' || etapa === 'listo' ? t('procesando') : etapa === '3ds' ? t('autenticando') : etapa === 'tarjeta' ? t('esperandoTarjeta') : modo === 'contratar' ? t('pagarConTarjeta') : t('cambiarTarjeta');

  const titulo = modo === 'contratar' ? t('titulo', { plan: plan.name }) : t('tituloTarjeta');

  return (
    <Modal
      isOpen
      onClose={cerrar}
      title={titulo}
      subtitle={modo === 'contratar' ? t('subtitulo') : t('subtituloTarjeta')}
      icon={CreditCard}
      size="md"
      showCloseButton={puedeCerrar}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={cerrar} disabled={!puedeCerrar}>
            {t('cancelar')}
          </Button>
          <Button onClick={pagar} disabled={ocupado} data-testid="culqi-pagar">
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {textoBoton}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {modo === 'contratar' && (
          <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(precio, 'PEN')}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{intervalo === 'YEAR' ? t('porAnio') : t('porMes')}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('igvIncluido')}</p>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-lg flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {modo === 'contratar' ? (
          <>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('datosFacturacion')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAMPOS.map((campo) => (
                  <div key={campo} className={campo === 'direccion' ? 'sm:col-span-2' : undefined}>
                    <Input
                      label={t(`campos.${campo}`)}
                      value={facturacion[campo]}
                      onChange={(e) => cambiar(campo, e.target.value)}
                      error={textoError(campo)}
                      type={campo === 'telefono' ? 'tel' : 'text'}
                      autoComplete={campo === 'telefono' ? 'tel' : campo === 'direccion' ? 'street-address' : campo === 'ciudad' ? 'address-level2' : campo === 'nombre' ? 'given-name' : 'family-name'}
                      disabled={ocupado}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acepto}
                  onChange={(e) => {
                    setAcepto(e.target.checked);
                    setErrores((er) => ({ ...er, terminos: undefined }));
                  }}
                  disabled={ocupado}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{t('terminos')}</span>
              </label>
              {errores.terminos && <p className="mt-1 text-sm text-red-500">{t('errores.terminos')}</p>}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300">{t('descripcionTarjeta')}</p>
        )}

        {etapa === 'tarjeta' && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t('ventanaAbierta')}{' '}
            <button type="button" onClick={reintentar} className="underline text-primary-700 dark:text-primary-400">
              {t('yaCerreVentana')}
            </button>
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          {t('seguro')}
        </p>
      </div>
    </Modal>
  );
}
