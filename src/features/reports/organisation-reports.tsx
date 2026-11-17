'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartColumn, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SectionLoader } from '@/components/ui/loading';
import { useBranch } from '@/hooks/use-branch';
import { branchReportApi } from '@/services/platform';
import type {
  BranchComparison,
  BranchComparisonRow,
  PerformanceTrend,
  TrendGranularity,
} from '@/types/platform';

const GRANULARITIES: { value: TrendGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

/**
 * Branch comparison and trend for the whole organisation.
 *
 * The comparison is always asked for every branch the member may reach. A
 * branch manager therefore sees their own branches compared with each other;
 * an owner sees the whole estate. The API decides that scope, not this page.
 */
export function OrganisationReports() {
  const { canViewAll, branches } = useBranch();
  const scope = canViewAll ? 'all' : undefined;
  const [from, setFrom] = useState(() => isoDaysAgo(29));
  const [to, setTo] = useState(() => isoDaysAgo(0));
  const [granularity, setGranularity] = useState<TrendGranularity>('day');
  const [points, setPoints] = useState('14');

  const comparison = useQuery<BranchComparison>({
    queryKey: ['reports', 'branches', scope, from, to],
    meta: { silent: true },
    queryFn: () => branchReportApi.comparison({ from, to, branchId: scope }),
  });

  const trend = useQuery<PerformanceTrend>({
    queryKey: ['reports', 'trend', scope, granularity, points],
    meta: { silent: true },
    queryFn: () =>
      branchReportApi.trend({
        granularity,
        points: Number(points) || 14,
        branchId: scope,
      }),
  });

  const currency = comparison.data?.currency ?? trend.data?.currency ?? 'NGN';
  const rows = comparison.data?.branches ?? [];
  const totals = comparison.data?.totals ?? null;

  const bestBranch = useMemo(() => {
    if (rows.length === 0) return null;
    return [...rows].sort((left, right) => right.sales.netSales - left.sales.netSales)[0];
  }, [rows]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = [
      'Branch',
      'Code',
      'Status',
      'Transactions',
      'Units sold',
      'Revenue',
      'Net sales',
      'Gross profit',
      'Stock units',
      'Stock value',
      'Low stock',
      'Out of stock',
      'Transferred in',
      'Transferred out',
      'Expired batches',
      'Near expiry batches',
      'Value at risk',
    ];
    const lines = rows.map((row) => [
      row.name,
      row.code,
      row.status,
      row.sales.transactions,
      row.sales.units,
      row.sales.revenue,
      row.sales.netSales,
      row.sales.grossProfit ?? '',
      row.stock.quantity,
      row.stock.value ?? '',
      row.stock.lowStock,
      row.stock.outOfStock,
      row.movements.transferredIn,
      row.movements.transferredOut,
      row.expiry.expiredBatches,
      row.expiry.nearExpiryBatches,
      row.expiry.valueAtRisk ?? '',
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `branch-comparison-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisation reports"
        description="Compare branches on sales, stock, transfers and expiry. Figures only ever cover branches you can reach."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="From" htmlFor="report-from">
            <Input
              id="report-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="report-to">
            <Input
              id="report-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Field label="Trend interval">
            <SearchableSelect
              options={GRANULARITIES}
              value={granularity}
              onChange={(value) => setGranularity((value || 'day') as TrendGranularity)}
              ariaLabel="Trend interval"
            />
          </Field>
          <Field label="Trend points">
            <SearchableSelect
              options={[
                { value: '7', label: 'Last 7' },
                { value: '14', label: 'Last 14' },
                { value: '30', label: 'Last 30' },
                { value: '90', label: 'Last 90' },
              ]}
              value={points}
              onChange={setPoints}
              ariaLabel="Trend points"
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate">
          {canViewAll
            ? `Comparing ${branches.length} branches you can reach.`
            : 'You are assigned to more than one branch, so your branches are compared here.'}
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ChartColumn className="h-5 w-5 text-info" aria-hidden="true" />
              Branch comparison
            </h2>
            <p className="text-sm text-slate">
              {comparison.data
                ? `${comparison.data.from} to ${comparison.data.to} · ${comparison.data.timeZone}`
                : 'Sales, stock, transfers and expiry side by side.'}
            </p>
          </div>
          {bestBranch && bestBranch.sales.netSales > 0 ? (
            <Badge status="success">
              Top branch: {bestBranch.name} · {formatMoney(bestBranch.sales.netSales, currency)}
            </Badge>
          ) : null}
        </div>

        {comparison.isLoading ? <SectionLoader label="Building the comparison…" /> : null}
        {comparison.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {comparison.error instanceof Error
                ? comparison.error.message
                : 'We could not build the comparison.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => comparison.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {comparison.data && rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No branch in reach has data for this period.</p>
        ) : null}

        {rows.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate">
                <tr>
                  <th className="py-2">Branch</th>
                  <th className="py-2 text-right">Transactions</th>
                  <th className="py-2 text-right">Units sold</th>
                  <th className="py-2 text-right">Net sales</th>
                  <th className="py-2 text-right">Gross profit</th>
                  <th className="py-2 text-right">Stock units</th>
                  <th className="py-2 text-right">Stock value</th>
                  <th className="py-2 text-right">Low / out</th>
                  <th className="py-2 text-right">Transfers in / out</th>
                  <th className="py-2 text-right">Expired / soon</th>
                  <th className="py-2 text-right">Value at risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <BranchRow key={row.branchId} row={row} currency={currency} />
                ))}
                {totals ? (
                  <tr className="bg-slate-50 font-medium">
                    <td className="py-2">Organisation</td>
                    <td className="py-2 text-right">{totals.sales.transactions}</td>
                    <td className="py-2 text-right">{formatNumber(totals.sales.units)}</td>
                    <td className="py-2 text-right">{formatMoney(totals.sales.netSales, currency)}</td>
                    <td className="py-2 text-right">
                      {totals.sales.grossProfit !== null
                        ? formatMoney(totals.sales.grossProfit, currency)
                        : '—'}
                    </td>
                    <td className="py-2 text-right">{formatNumber(totals.stock.quantity)}</td>
                    <td className="py-2 text-right">
                      {totals.stock.value !== null ? formatMoney(totals.stock.value, currency) : '—'}
                    </td>
                    <td className="py-2 text-right">
                      {totals.stock.lowStock} / {totals.stock.outOfStock}
                    </td>
                    <td className="py-2 text-right">
                      {formatNumber(totals.movements.transferredIn)} /{' '}
                      {formatNumber(totals.movements.transferredOut)}
                    </td>
                    <td className="py-2 text-right">
                      {totals.expiry.expiredBatches} / {totals.expiry.nearExpiryBatches}
                    </td>
                    <td className="py-2 text-right">
                      {totals.expiry.valueAtRisk !== null
                        ? formatMoney(totals.expiry.valueAtRisk, currency)
                        : '—'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">Performance trend</h2>
        <p className="text-sm text-slate">
          Net sales recorded per {granularity === 'day' ? 'day' : granularity === 'week' ? 'week' : 'month'}.
        </p>

        {trend.isLoading ? <SectionLoader label="Loading the trend…" /> : null}
        {trend.error ? (
          <p className="mt-4 text-sm text-danger">We could not load the trend.</p>
        ) : null}
        {trend.data && trend.data.points.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate">
                <tr>
                  <th className="py-2">Period</th>
                  <th className="py-2 text-right">Transactions</th>
                  <th className="py-2 text-right">Units</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trend.data.points.map((point) => {
                  const peak = Math.max(...trend.data.points.map((entry) => entry.sales.revenue), 1);
                  return (
                    <tr key={point.period}>
                      <td className="py-2">{point.label}</td>
                      <td className="py-2 text-right">{point.sales.transactions}</td>
                      <td className="py-2 text-right">{formatNumber(point.sales.units)}</td>
                      <td className="py-2 text-right">
                        {formatMoney(point.sales.revenue, currency)}
                      </td>
                      <td className="py-2">
                        <div className="h-2 w-full min-w-[80px] rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-primary-600"
                            style={{ width: `${Math.round((point.sales.revenue / peak) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {trend.data && trend.data.points.every((point) => point.sales.transactions === 0) ? (
          <p className="mt-4 text-sm text-slate">No sales recorded in this period yet.</p>
        ) : null}
      </Card>
    </div>
  );
}

function BranchRow({ row, currency }: { row: BranchComparisonRow; currency: string }) {
  return (
    <tr>
      <td className="py-2">
        <span className="font-medium text-ink">{row.name}</span>
        <span className="ml-2 text-xs text-slate">{row.code}</span>
        {row.status !== 'ACTIVE' ? (
          <Badge status="neutral" className="ml-2">
            inactive
          </Badge>
        ) : null}
      </td>
      <td className="py-2 text-right">{row.sales.transactions}</td>
      <td className="py-2 text-right">{formatNumber(row.sales.units)}</td>
      <td className="py-2 text-right text-ink">{formatMoney(row.sales.netSales, currency)}</td>
      <td className="py-2 text-right">
        {row.sales.grossProfit !== null ? formatMoney(row.sales.grossProfit, currency) : '—'}
      </td>
      <td className="py-2 text-right">{formatNumber(row.stock.quantity)}</td>
      <td className="py-2 text-right">
        {row.stock.value !== null ? formatMoney(row.stock.value, currency) : '—'}
      </td>
      <td className="py-2 text-right">
        {row.stock.lowStock} / {row.stock.outOfStock}
      </td>
      <td className="py-2 text-right">
        {formatNumber(row.movements.transferredIn)} / {formatNumber(row.movements.transferredOut)}
      </td>
      <td className="py-2 text-right">
        {row.expiry.expiredBatches} / {row.expiry.nearExpiryBatches}
      </td>
      <td className="py-2 text-right">
        {row.expiry.valueAtRisk !== null ? formatMoney(row.expiry.valueAtRisk, currency) : '—'}
      </td>
    </tr>
  );
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}
