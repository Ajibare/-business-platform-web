import { redirect } from 'next/navigation';

/**
 * The sign-in route moved to `/sign-in`. This keeps every existing bookmark and
 * link working instead of showing a 404.
 */
export default function LegacyLoginPage() {
  redirect('/sign-in');
}
