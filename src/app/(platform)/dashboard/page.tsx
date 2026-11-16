import { SetupChecklist } from '@/features/onboarding/setup-checklist';
import { DailyPerformance } from '@/features/pharmacy/daily-performance';
import { PharmacyDashboard } from '@/features/pharmacy/pharmacy-dashboard';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Pharmacy dashboard</h1>
        <p className="text-sm text-slate">Recorded stock risk overview.</p>
      </div>
      <SetupChecklist />
      <PharmacyDashboard />
      <DailyPerformance />
    </div>
  );
}
