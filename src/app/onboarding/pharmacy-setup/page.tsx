import type { Metadata } from 'next';
import { PharmacySetupWizard } from '@/features/onboarding/pharmacy-setup-wizard';

export const metadata: Metadata = {
  title: 'Pharmacy setup',
  description: 'Set up your pharmacy workspace.',
  robots: { index: false, follow: false },
};

export default function PharmacySetupPage() {
  return <PharmacySetupWizard />;
}
