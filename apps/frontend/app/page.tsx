import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigir a la landing page con locale por defecto
  redirect('/en/landing');
}

