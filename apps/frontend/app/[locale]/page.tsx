import { redirect } from 'next/navigation';

export default function LocalePage({ params: { locale } }: { params: { locale: string } }) {
  // Redirect from /es or /en to the dashboard
  redirect(`/${locale}/dashboard`);
}
