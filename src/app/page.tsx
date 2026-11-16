import { redirect } from 'next/navigation';
import { REGISTRATION_ENTRY } from '@/lib/route-guard';

/**
 * `middleware.ts` normally answers this request before it reaches a page. This
 * is the fallback for anything that reaches the route anyway: a new visitor
 * starts at registration rather than at a dashboard they cannot use.
 */
export default function Home() {
  redirect(REGISTRATION_ENTRY);
}
