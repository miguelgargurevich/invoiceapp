import type { CapacitorConfig } from '@capacitor/cli';
import { destinoFacturo } from './scripts/destino.mjs';

// La app es la web de producción dentro de un WebView: la sesión (token en localStorage),
// los despliegues y el CORS de la API funcionan igual que en el navegador.
// Ver docs/APP-MOVIL.md antes de cambiar algo aquí.
const destino = destinoFacturo();

const config: CapacitorConfig = {
  appId: 'pe.facturo.app',
  appName: 'Facturo',
  webDir: 'www',
  server: {
    url: destino.url,
    // La navegación se queda en el dominio de Facturo; lo demás (SUNAT, WhatsApp, mailto, tel…)
    // sale al navegador o a la app del sistema.
    allowNavigation: [destino.host],
    // Si no hay red, Capacitor carga https://localhost/sin-conexion.html (archivo de www/).
    errorPath: 'sin-conexion.html',
    // Solo en pruebas locales: en producción no existe esta clave.
    ...(destino.http ? { cleartext: true } : {}),
  },
  android: {
    appendUserAgent: 'FacturoApp',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    appendUserAgent: 'FacturoApp',
    backgroundColor: '#FFFFFF',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#6B2C6E',
      showSpinner: false,
      launchAutoHide: true,
      launchShowDuration: 2000,
    },
    // Barra de estado y zona segura: Capacitor reserva el espacio del notch y de la barra;
    // DEFAULT deja que el sistema elija el color de los íconos (claro u oscuro).
    SystemBars: {
      insetsHandling: 'css',
      style: 'DEFAULT',
    },
  },
};

export default config;
