export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Página no encontrada</p>
        <a href="/es/login" className="mt-4 inline-block text-primary-600 hover:underline">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
