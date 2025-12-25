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
  const userId = '63d8dead-c546-49ff-90f2-826c7a5cb3f1';

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

  // Limpiar proformas existentes de prueba
  await prisma.detalleProforma.deleteMany({
    where: { proforma: { empresaId: empresa.id, serie: 'P001' } }
  });
  await prisma.proforma.deleteMany({
    where: { empresaId: empresa.id, serie: 'P001' }
  });

  // Crear proformas de ejemplo
  const proformas = [];

  // Proforma 1: Desarrollo Web (pendiente)
  const proforma1 = await prisma.proforma.create({
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
      condiciones: 'Pago 50% adelantado, 50% al finalizar',
      observaciones: 'Incluye hosting por 1 año',
      userId: userId,
    },
  });

  await prisma.detalleProforma.createMany({
    data: [
      {
        proformaId: proforma1.id,
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
  proformas.push(proforma1);

  // Proforma 2: Equipos tecnológicos (aprobada)
  const proforma2 = await prisma.proforma.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[1].id,
      serie: 'P001',
      numero: 2,
      fechaEmision: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Hace 5 días
      fechaValidez: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      subtotal: 13288.14,
      descuento: 200.00,
      igv: 2391.86,
      total: 15680.00,
      moneda: 'PEN',
      estado: 'aprobada',
      condiciones: 'Pago al contado con entrega',
      observaciones: 'Garantía de 2 años en equipos',
      userId: userId,
    },
  });

  await prisma.detalleProforma.createMany({
    data: [
      {
        proformaId: proforma2.id,
        productoId: productos[1].id,
        descripcion: productos[1].nombre + ' - Configuración empresarial',
        cantidad: 5,
        unidadMedida: 'UND',
        precioUnitario: 3500.00,
        descuento: 200.00,
        subtotal: 13288.14,
        igv: 2391.86,
        total: 15680.00,
        orden: 1,
      },
    ],
  });
  proformas.push(proforma2);

  // Proforma 3: Consultoría y licencias (pendiente)
  const proforma3 = await prisma.proforma.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[2].id,
      serie: 'P001',
      numero: 3,
      fechaEmision: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
      fechaValidez: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      subtotal: 2033.90,
      descuento: 50.00,
      igv: 366.10,
      total: 2400.00,
      moneda: 'PEN',
      estado: 'pendiente',
      condiciones: 'Pago contra entrega',
      observaciones: 'Renovación automática anual',
      userId: userId,
    },
  });

  await prisma.detalleProforma.createMany({
    data: [
      {
        proformaId: proforma3.id,
        productoId: productos[0].id,
        descripcion: productos[0].nombre + ' - 8 horas',
        cantidad: 8,
        unidadMedida: 'HORA',
        precioUnitario: 150.00,
        descuento: 0,
        subtotal: 1016.95,
        igv: 183.05,
        total: 1200.00,
        orden: 1,
      },
      {
        proformaId: proforma3.id,
        productoId: productos[3].id,
        descripcion: productos[3].nombre + ' - Pack 5 usuarios',
        cantidad: 5,
        unidadMedida: 'UND',
        precioUnitario: 280.00,
        descuento: 50.00,
        subtotal: 1016.95,
        igv: 183.05,
        total: 1200.00,
        orden: 2,
      },
    ],
  });
  proformas.push(proforma3);

  // Proforma 4: Proyecto rechazado
  const proforma4 = await prisma.proforma.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[0].id,
      serie: 'P001',
      numero: 4,
      fechaEmision: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Hace 15 días
      fechaValidez: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 2542.37,
      descuento: 0,
      igv: 457.63,
      total: 3000.00,
      moneda: 'PEN',
      estado: 'rechazada',
      condiciones: 'Pago al contado',
      observaciones: 'Cliente decidió otra alternativa',
      userId: userId,
    },
  });

  await prisma.detalleProforma.createMany({
    data: [
      {
        proformaId: proforma4.id,
        productoId: productos[0].id,
        descripcion: productos[0].nombre + ' - 20 horas',
        cantidad: 20,
        unidadMedida: 'HORA',
        precioUnitario: 150.00,
        descuento: 0,
        subtotal: 2542.37,
        igv: 457.63,
        total: 3000.00,
        orden: 1,
      },
    ],
  });
  proformas.push(proforma4);

  // Proforma 5: Vencida
  const proforma5 = await prisma.proforma.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[1].id,
      serie: 'P001',
      numero: 5,
      fechaEmision: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // Hace 45 días
      fechaValidez: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Venció hace 15 días
      subtotal: 6779.66,
      descuento: 0,
      igv: 1220.34,
      total: 8000.00,
      moneda: 'PEN',
      estado: 'vencida',
      condiciones: 'Pago a 15 días',
      observaciones: 'Propuesta no respondida',
      userId: userId,
    },
  });

  await prisma.detalleProforma.createMany({
    data: [
      {
        proformaId: proforma5.id,
        productoId: productos[1].id,
        descripcion: productos[1].nombre + ' - Promoción limitada',
        cantidad: 2,
        unidadMedida: 'UND',
        precioUnitario: 3500.00,
        descuento: 0,
        subtotal: 5932.20,
        igv: 1067.80,
        total: 7000.00,
        orden: 1,
      },
      {
        proformaId: proforma5.id,
        productoId: productos[3].id,
        descripcion: productos[3].nombre + ' - 4 licencias',
        cantidad: 4,
        unidadMedida: 'UND',
        precioUnitario: 280.00,
        descuento: 0,
        subtotal: 847.46,
        igv: 152.54,
        total: 1000.00,
        orden: 2,
      },
    ],
  });
  proformas.push(proforma5);

  console.log('✅ Proformas creadas:', proformas.length);

  // Limpiar y crear factura de ejemplo
  await prisma.detalleFactura.deleteMany({
    where: { factura: { empresaId: empresa.id, serie: 'F001', numero: 1 } }
  });
  await prisma.factura.deleteMany({
    where: { empresaId: empresa.id, serie: 'F001', numero: 1 }
  });

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
  console.log(`   - ${proformas.length} Proformas`);
  console.log(`   - 1 Factura`);
  console.log('\n📋 Proformas creadas:');
  console.log('   1. P001-1 - Desarrollo Web (pendiente)');
  console.log('   2. P001-2 - Equipos tecnológicos (aprobada)');
  console.log('   3. P001-3 - Consultoría y licencias (pendiente)');
  console.log('   4. P001-4 - Proyecto rechazado (rechazada)');
  console.log('   5. P001-5 - Propuesta vencida (vencida)');
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
