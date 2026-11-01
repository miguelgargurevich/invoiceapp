import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigir a la landing page con el idioma por defecto (español). El middleware ya atiende `/` antes.
  redirect('/es/landing');
}

