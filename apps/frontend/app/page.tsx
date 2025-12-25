import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigir a la ruta con locale por defecto
  redirect('/es/login');
}
