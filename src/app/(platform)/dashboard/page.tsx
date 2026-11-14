import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const summaryCards = [
  {
    title: 'Out of stock',
    value: '2',
    description: 'Products with zero recorded stock.',
    status: 'danger' as const,
  },
  {
    title: 'Low stock',
    value: '3',
    description: 'Below minimum level.',
    status: 'warning' as const,
  },
  {
    title: 'Near expiry',
    value: '2',
    description: 'Batches expiring within warning window.',
    status: 'warning' as const,
  },
  {
    title: 'Expired',
    value: '1',
    description: 'Batches past expiry.',
    status: 'danger' as const,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Pharmacy dashboard</h1>
          <p className="text-sm text-slate">Recorded stock risk overview.</p>
        </div>
        <Button>Run inventory review</Button>
      </div>

      <div className="rounded-md border border-warning/50 bg-warning/10 p-4 text-sm text-ink">
        Quantities are recorded balances, not physically verified.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate">{card.title}</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{card.value}</p>
              </div>
              <Badge status={card.status}>{card.title}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate">{card.description}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-ink">Expiry exposure</h2>
        <p className="mt-2 text-sm text-slate">
          Two batches are approaching expiry and one batch is expired.
        </p>
      </Card>
    </div>
  );
}
