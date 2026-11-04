-- Datos legales iniciales del servicio. Idempotente y NO destructivo: si la fila "global" ya existe
-- (porque el SUPER_ADMIN la editó), DO NOTHING la deja intacta.
-- Razón social y correo quedan en NULL a propósito: el sitio muestra «por confirmar» hasta que se carguen.
INSERT INTO configuracion_sitio (id, legal_marca, legal_razon_social, legal_ruc, legal_domicilio, legal_correo, updated_at)
VALUES ('global', 'Ing. Miguel F. Gargurevich', NULL, '10409241862',
        'Av. Las Gaviotas 2121, Santiago de Surco, Lima, Perú', NULL, now())
ON CONFLICT (id) DO NOTHING;
