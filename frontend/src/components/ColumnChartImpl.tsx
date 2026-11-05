import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../i18n/context';
import { formatNumber } from '../lib/format';
import type { ColumnChartProps } from './ColumnChart';

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown }[];
  valueLabel: string;
}

function ChartTooltip({ active, payload, label, valueLabel }: ChartTooltipProps) {
  const { locale } = useI18n();
  const value = payload?.[0]?.value;
  if (!active || typeof value !== 'number') {
    return null;
  }
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-ink-2">{label}</p>
      <p className="font-semibold text-ink tabular-nums">
        {formatNumber(value, locale)} <span className="font-normal text-ink-2">{valueLabel}</span>
      </p>
    </div>
  );
}

/** A single-series column chart: one hue, thin rounded columns, a recessive grid and a hover tooltip. */
export default function ColumnChartImpl({ data, ariaLabel, valueLabel, height = 220 }: ColumnChartProps) {
  const axisTick = { fill: 'var(--muted)', fontSize: 12 };

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--baseline)' }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={32}
            tickCount={4}
          />
          <Tooltip
            cursor={{ fill: 'var(--hairline)' }}
            isAnimationActive={false}
            content={(props) => (
              <ChartTooltip active={props.active} label={props.label} payload={props.payload} valueLabel={valueLabel} />
            )}
          />
          <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
