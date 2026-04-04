import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type LanguageStats } from '../services/api';

interface LanguageChartProps {
  data: LanguageStats;
}

const COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#84CC16', // Lime
];

export function LanguageChart({ data }: LanguageChartProps) {
  const chartData = Object.entries(data.languages).map(([language, info]) => ({
    name: language,
    value: Number(info.percentage.toFixed(2)),
    bytes: info.bytes,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-md shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">{data.value.toFixed(2)}%</p>
          <p className="text-xs text-gray-300">{(data.bytes / 1024).toFixed(2)} KB</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Kullanılan Yazılım Dilleri</h2>
      
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name} ${value}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 text-center py-8">Dil verisi bulunamadı</p>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Dil Dağılımı</h3>
        <div className="space-y-2">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-gray-700">{item.name}</span>
              </div>
              <span className="text-gray-600">{item.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}