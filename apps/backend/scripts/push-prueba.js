// Manda un aviso push de PRUEBA a una cuenta (para comprobar que Firebase / el navegador quedaron bien configurados).
//   node scripts/push-prueba.js correo@del-usuario.com
// Corre dentro del contenedor del backend (Coolify › backend › Terminal), con las variables PUSH_* del despliegue.
// Solo le avisa al dueño de esa cuenta, a los dispositivos que ya registró. No toca nada más.
require('dotenv').config();
const prisma = require('../src/utils/prisma');
const { iniciarPush } = require('../src/push');

async function main() {
  const correo = (process.argv[2] || '').trim().toLowerCase();
  if (!correo) { console.error('Uso: node scripts/push-prueba.js correo@del-usuario.com'); process.exitCode = 1; return; }
  const user = await prisma.userProfile.findUnique({ where: { email: correo }, select: { id: true, empresa: { select: { id: true } } } });
  if (!user?.empresa) { console.error('No hay una cuenta con empresa para ese correo.'); process.exitCode = 1; return; }
  const dispositivos = await prisma.dispositivoPush.groupBy({ by: ['tipo'], where: { userId: user.id, empresaId: user.empresa.id }, _count: true });
  console.log('Dispositivos de la cuenta:', dispositivos.length ? dispositivos.map((d) => `${d._count} ${d.tipo === 'fcm' ? 'teléfono(s)' : 'navegador(es)'}`).join(', ') : 'ninguno (activa los avisos en la app o en Configuración › Notificaciones)');
  const push = iniciarPush({ prisma, auth: (_q, _s, n) => n(), programar: false });
  const r = await push.servicio.avisar({
    userId: user.id, empresaId: user.empresa.id, clave: `prueba:${Date.now()}`,
    titulo: 'Aviso de prueba', cuerpo: 'Si ves esto, los avisos de Facturo funcionan.', ruta: '/es/dashboard',
  });
  console.log('Resultado:', r.motivo, `(${r.enviados} enviado(s))`);
}

main().catch((e) => { console.error('Error:', String(e.message || e).split('\n')[0]); process.exitCode = 1; }).finally(() => prisma.$disconnect());
