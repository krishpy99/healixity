import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@/components/ThemeProvider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface LineChartProps {
  data: number[];
  labels?: string[];
  color: string;
  fill?: boolean;
  tension?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  labels,
  color,
  fill = true,
  tension = 0.4,
}) => {
  const { theme } = useTheme();
  const defaultLabels = Array.from({ length: data.length }, (_, i) => i.toString());

  const chartData = {
    labels: labels || defaultLabels,
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: fill ? `${color}33` : 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension,
        fill,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        mode: 'index' as const,
        backgroundColor: theme === 'dark' ? 'rgba(20, 20, 20, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: theme === 'dark' ? '#fff' : '#000',
        bodyColor: theme === 'dark' ? '#e2e8f0' : '#1e293b',
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart; 