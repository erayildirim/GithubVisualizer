import { lazy, Suspense } from 'react';
import { Skeleton } from './ui';

export interface ColumnChartProps {
  data: { label: string; value: number }[];
  ariaLabel: string;
  valueLabel: string;
  height?: number;
}

// Recharts is by far the largest dependency, so it loads only when a chart is first shown.
const ColumnChartImpl = lazy(() => import('./ColumnChartImpl'));

export function ColumnChart(props: ColumnChartProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[220px]" />}>
      <ColumnChartImpl {...props} />
    </Suspense>
  );
}
