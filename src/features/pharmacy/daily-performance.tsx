'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Coins, PackageMinus, Receipt, TrendingUp, Users } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { DailyPerformance as DailyPerformanceData } from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';

const todayKey = () => new Date().toLocaleDateString('en-CA');

/**
 * Daily performance section for the dashboard.
 *
 * Income comes from recorded sales only. Revenue, net sales and gross profit
 * are separate figures and revenue is never labelled as profit.
 */
export function DailyPerformance() {
  const [date, setDate] = useState(todayKey());

  const performance = useQuery<DailyPerformanceData>({
    queryKey: ['pharmacy', 'reports', 'daily', date],
    queryFn: () => apiFetch<DailyPerformanceData>(`/pharmacy/reports/daily?date=${date}`),
  });

  const data = performance.data;

  return (
    <section className="space-y-4" aria-labelledby="daily-performance-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="daily-performance-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CalendarDays className="h-5 w-5 text-info" aria-hidden="true" />
            Daily performance
          </h2>
          <p className="text-sm text-slate">
            Sales, refunds and profit for the workspace calendar day
            {data ? ` (${data.timeZone})` : ''}. Stock issues are shown separately because an
            issue is not always a sale.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Date</span>
            <Input
              type="date"
              value={date}
              max={todayKey()}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <Button variant="outline" size="sm" onClick={() => setDate(todayKey())}>
            Today
          </Button>
        </div>
      </div>

      {performance.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-4 h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : null}

      {performance.error ? (
        <Alert
          tone="danger"
          title="Unable to load daily performance"
          action={
            <Button variant="outline" size="sm" onClick={() => performance.refetch()}>
              Retry
            </Button>
          }
        >
          {performance.error instanceof Error ? performance.error.message : 'Please try again.'}
        </Alert>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Sales revenue"
              value={formatCurrency(data.income.revenue, data.currency)}
              description="Completed sales after discounts. Revenue is not profit."
              icon={Coins}
              status="info"
              badgeLabel="Revenue"
            />
            <MetricCard
              label="Transactions"
              value={data.income.transactions}
              description={`${data.income.unitsSold} unit(s) sold across ${data.sales.products} product(s).`}
              icon={Receipt}
              status="info"
              badgeLabel="Recorded"
            />
            <MetricCard
              label="Net sales"
              value={formatCurrency(data.income.netSales, data.currency)}
              description={`Revenue ${formatCurrency(data.income.revenue, data.currency)} less refunds ${formatCurrency(data.income.refunds, data.currency)}.`}
              icon={TrendingUp}
              status="neutral"
              badgeLabel="After refunds"
            />
            <MetricCard
              label="Gross profit"
              value={
                data.gain.available
                  ? formatCurrency(data.gain.amount, data.currency)
                  : formatCurrency(null, data.currency)
              }
              unavailable={!data.gain.available}
              description={data.gain.reason}
              icon={TrendingUp}
              status={data.gain.available ? 'success' : 'neutral'}
            />
            <MetricCard
              label="Cost of goods sold"
              value={
                data.income.cogs === null
                  ? formatCurrency(null, data.currency)
                  : formatCurrency(data.income.cogs, data.currency)
              }
              unavailable={data.income.cogs === null}
              description={
                data.income.cogs === null
                  ? 'Not every sold batch has a recorded purchase cost.'
                  : 'Recorded purchase cost of the batches sold.'
              }
              icon={PackageMinus}
              status="neutral"
            />
            <MetricCard
              label="Stock issues recorded"
              value={data.recordedStockIssues.transactions}
              description={`${data.recordedStockIssues.quantity} unit(s) issued across ${data.recordedStockIssues.products} product(s).`}
              icon={Users}
              status="neutral"
              badgeLabel="Operational"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Gross sales"
              value={formatCurrency(data.income.grossSales, data.currency)}
              description="Value of goods sold before discounts."
              icon={Coins}
              status="neutral"
            />
            <MetricCard
              label="Discounts"
              value={formatCurrency(data.income.discounts, data.currency)}
              description="Discount given on completed sales."
              icon={Receipt}
              status="neutral"
            />
            <MetricCard
              label="Commission"
              value={formatCurrency(null, data.currency)}
              unavailable
              description={data.commission.reason}
              icon={Users}
              status="neutral"
            />
          </div>

          <Card className="p-4">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-ink">
                Metric definitions and data requirements
              </summary>
              <dl className="mt-3 space-y-2 text-xs text-slate">
                {Object.entries(data.definitions).map(([key, definition]) => (
                  <div key={key}>
                    <dt className="font-medium text-ink">{key}</dt>
                    <dd>{definition}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>
        </>
      ) : null}
    </section>
  );
}
