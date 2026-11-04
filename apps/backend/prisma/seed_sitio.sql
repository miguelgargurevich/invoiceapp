-- Datos legales iniciales del servicio. Idempotente y NO destructivo: si la fila "global" ya existe
-- (porque el SUPER_ADMIN la editó), DO NOTHING la deja intacta.
-- Razón social: la de la consulta RUC de SUNAT (confirmada por Miguel el 2026-11-04). Correo del producto: buzón por crear.
INSERT INTO configuracion_sitio (id, legal_marca, legal_razon_social, legal_ruc, legal_domicilio, legal_correo, updated_at)
VALUES ('global', 'Ing. Miguel F. Gargurevich', 'MIGUEL ARTURO FERNANDEZ GARGUREVICH', '10409241862',
        'Av. Las Gaviotas 2121, Santiago de Surco, Lima, Perú', 'facturo@gargurevich.dev', now())
ON CONFLICT (id) DO NOTHING;
