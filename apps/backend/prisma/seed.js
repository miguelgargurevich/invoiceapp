const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes (opcional, comentar si no quieres limpiar)
  // await prisma.detalleFactura.deleteMany();
  // await prisma.detalleProforma.deleteMany();
  // await prisma.pagoFactura.deleteMany();
  // await prisma.factura.deleteMany();
  // await prisma.proforma.deleteMany();
  // await prisma.producto.deleteMany();
  // await prisma.categoria.deleteMany();
  // await prisma.cliente.deleteMany();
  // await prisma.empresa.deleteMany();

  // Usuario de prueba (esto debe venir de Supabase Auth)
  const userId = '00000000-0000-0000-0000-000000000001'; // ID de ejemplo

  // Crear empresa de prueba
  const empresa = await prisma.empresa.upsert({
    where: { ruc: '20123456789' },
    update: {},
    create: {
      nombre: 'Mi Empresa SAC',
      ruc: '20123456789',
      direccion: 'Av. Los Pinos 123, San Isidro, Lima',
      telefono: '987654321',
      email: 'contacto@miempresa.com',
      moneda: 'PEN',
      serieFactura: 'F001',
      serieProforma: 'P001',
      userId: userId,
    },
  });

  console.log('✅ Empresa creada:', empresa.nombre);

  // Crear categorías
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: 'Servicios' } },
      update: {},
      create: {
        empresaId: empresa.id,
        nombre: 'Servicios',
        descripcion: 'Servicios profesionales',
        color: '#3b82f6',
      },
    }),
    prisma.categoria.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: 'Productos' } },
      update: {},
      create: {
        empresaId: empresa.id,
        nombre: 'Productos',
        descripcion: 'Productos físicos',
        color: '#10b981',
      },
    }),
    prisma.categoria.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: 'Tecnología' } },
      update: {},
      create: {
        empresaId: empresa.id,
        nombre: 'Tecnología',
        descripcion: 'Equipos y tecnología',
        color: '#8b5cf6',
      },
    }),
  ]);

  console.log('✅ Categorías creadas:', categorias.length);

  // Crear productos
  const productos = await Promise.all([
    prisma.producto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'SERV001' } },
      update: {},
      create: {
        empresaId: empresa.id,
        codigo: 'SERV001',
        nombre: 'Consultoría de Negocios',
        descripcion: 'Servicio de consultoría empresarial',
        unidadMedida: 'HORA',
        precioUnitario: 150.00,
        precioConIgv: false,
        categoriaId: categorias[0].id,
        stockActual: null,
      },
    }),
    prisma.producto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'PROD001' } },
      update: {},
      create: {
        empresaId: empresa.id,
        codigo: 'PROD001',
        nombre: 'Laptop HP ProBook 450 G10',
        descripcion: 'Intel Core i5, 8GB RAM, 512GB SSD',
        unidadMedida: 'UND',
        precioUnitario: 3500.00,
        precioConIgv: true,
        categoriaId: categorias[2].id,
        stockActual: 10,
        stockMinimo: 2,
      },
    }),
    prisma.producto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'SERV002' } },
      update: {},
      create: {
        empresaId: empresa.id,
        codigo: 'SERV002',
        nombre: 'Desarrollo Web',
        descripcion: 'Desarrollo de sitio web corporativo',
        unidadMedida: 'UND',
        precioUnitario: 5000.00,
        precioConIgv: false,
        categoriaId: categorias[0].id,
      },
    }),
    prisma.producto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'PROD002' } },
      update: {},
      create: {
        empresaId: empresa.id,
        codigo: 'PROD002',
        nombre: 'Licencia Microsoft Office 365',
        descripcion: 'Licencia anual por usuario',
        unidadMedida: 'UND',
        precioUnitario: 280.00,
        precioConIgv: true,
        categoriaId: categorias[2].id,
        stockActual: 50,
      },
    }),
  ]);

  console.log('✅ Productos creados:', productos.length);

  // Crear clientes
  const clientes = await Promise.all([
    prisma.cliente.upsert({
      where: { empresaId_numeroDocumento: { empresaId: empresa.id, numeroDocumento: '20456789123' } },
      update: {},
      create: {
        empresaId: empresa.id,
        tipoDocumento: 'RUC',
        numeroDocumento: '20456789123',
        razonSocial: 'Tech Solutions Peru SAC',
        nombreComercial: 'Tech Solutions',
        direccion: 'Av. Javier Prado 567, San Isidro',
        email: 'contacto@techsolutions.pe',
        telefono: '987123456',
        contacto: 'Juan Pérez',
        notas: 'Cliente premium',
      },
    }),
    prisma.cliente.upsert({
      where: { empresaId_numeroDocumento: { empresaId: empresa.id, numeroDocumento: '20789456123' } },
      update: {},
      create: {
        empresaId: empresa.id,
        tipoDocumento: 'RUC',
        numeroDocumento: '20789456123',
        razonSocial: 'Comercial Lima EIRL',
        nombreComercial: 'Comercial Lima',
        direccion: 'Jr. Los Andes 234, Lima',
        email: 'ventas@comerciallima.com',
        telefono: '987654789',
        contacto: 'María García',
      },
    }),
    prisma.cliente.upsert({
      where: { empresaId_numeroDocumento: { empresaId: empresa.id, numeroDocumento: '12345678' } },
      update: {},
      create: {
        empresaId: empresa.id,
        tipoDocumento: 'DNI',
        numeroDocumento: '12345678',
        razonSocial: 'Carlos Rodriguez Mendoza',
        nombreComercial: null,
        direccion: 'Calle Las Flores 456, Miraflores',
        email: 'carlos.rodriguez@email.com',
        telefono: '999888777',
      },
    }),
  ]);

  console.log('✅ Clientes creados:', clientes.length);

  // Crear proforma de ejemplo
  const proforma = await prisma.proforma.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[0].id,
      serie: 'P001',
      numero: 1,
      fechaEmision: new Date(),
      fechaValidez: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      subtotal: 4237.29,
      descuento: 0,
      igv: 762.71,
      total: 5000.00,
      moneda: 'PEN',
      estado: 'pendiente',
      condiciones: 'Pago al contado con entrega',
      observaciones: 'Cotización válida por 30 días',
      userId: userId,
    },
  });

  await prisma.detalleProforma.createMany({
    data: [
      {
        proformaId: proforma.id,
        productoId: productos[2].id,
        descripcion: productos[2].nombre,
        cantidad: 1,
        unidadMedida: 'UND',
        precioUnitario: 5000.00,
        descuento: 0,
        subtotal: 4237.29,
        igv: 762.71,
        total: 5000.00,
        orden: 1,
      },
    ],
  });

  console.log('✅ Proforma creada: P001-1');

  // Crear factura de ejemplo
  const factura = await prisma.factura.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[1].id,
      serie: 'F001',
      numero: 1,
      fechaEmision: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Hace 10 días
      fechaVencimiento: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // En 20 días
      subtotal: 5932.20,
      descuento: 0,
      igv: 1067.80,
      total: 7000.00,
      moneda: 'PEN',
      estado: 'emitida',
      formaPago: 'credito_30',
      observaciones: 'Pago a 30 días',
      userId: userId,
    },
  });

  await prisma.detalleFactura.createMany({
    data: [
      {
        facturaId: factura.id,
        productoId: productos[1].id,
        descripcion: productos[1].nombre,
        cantidad: 2,
        unidadMedida: 'UND',
        precioUnitario: 3500.00,
        descuento: 0,
        subtotal: 5932.20,
        igv: 1067.80,
        total: 7000.00,
        orden: 1,
      },
    ],
  });

  console.log('✅ Factura creada: F001-1');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`   - 1 Empresa: ${empresa.nombre}`);
  console.log(`   - ${categorias.length} Categorías`);
  console.log(`   - ${productos.length} Productos`);
  console.log(`   - ${clientes.length} Clientes`);
  console.log(`   - 1 Proforma`);
  console.log(`   - 1 Factura`);
  console.log('\n👤 Para probar el sistema:');
  console.log(`   - RUC Empresa: ${empresa.ruc}`);
  console.log(`   - Debes crear un usuario en Supabase Auth y vincularlo con este userId: ${userId}`);
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
