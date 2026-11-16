import { DailyPerformance } from '@/features/pharmacy/daily-performance';
import { PharmacyDashboard } from '@/features/pharmacy/pharmacy-dashboard';

export default function PharmacyDashboardPage() {
  return (
    <div className="space-y-6">
      <PharmacyDashboard />
      <DailyPerformance />
    </div>
  );
}
