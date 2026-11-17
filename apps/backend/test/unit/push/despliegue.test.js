const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

// Las variables PUSH_* tienen que llegar al contenedor: Coolify solo pasa las que el compose declara en `environment:`.
const raiz = path.join(__dirname, '..', '..', '..', '..', '..');
const compose = readFileSync(path.join(raiz, 'docker-compose.coolify.yml'), 'utf8');
const ejemplo = readFileSync(path.join(__dirname, '..', '..', '..', '.env.example'), 'utf8');
const config = readFileSync(path.join(__dirname, '..', '..', '..', 'src', 'push', 'config.js'), 'utf8');

const VARIABLES_EN_COMPOSE = ['PUSH_FCM_PROJECT_ID', 'PUSH_FCM_CUENTA_BASE64', 'PUSH_VAPID_PUBLIC_KEY', 'PUSH_VAPID_PRIVATE_KEY', 'PUSH_VAPID_SUBJECT'];

test('el compose de Coolify pasa al backend las variables del push, vacías por defecto (= apagado)', () => {
  for (const v of VARIABLES_EN_COMPOSE) assert.match(compose, new RegExp(`- ${v}=\\$\\{${v}:-\\}`), v);
});

test('.env.example documenta cada variable del push y config.js las lee todas', () => {
  for (const v of VARIABLES_EN_COMPOSE) {
    assert.match(ejemplo, new RegExp(`^${v}=`, 'm'), `.env.example: ${v}`);
    assert.ok(config.includes(`env.${v}`), `config.js lee ${v}`);
  }
});
