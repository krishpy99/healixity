import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@/components/ThemeProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface RecoveryChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor?: string;
    }[];
  };
}

const RecoveryChart: React.FC<RecoveryChartProps> = ({ data }) => {
  const { theme } = useTheme();
  
  // Determine text color based on theme
  const textColor = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  const gridColor = theme === 'dark' ? 'rgba(200, 200, 200, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    color: textColor, // Set the text color
    scales: {
      y: {
        beginAtZero: true,
        max: 150,
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: textColor,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 20,
          color: textColor,
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: theme === 'dark' ? 'rgba(20, 20, 20, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: theme === 'dark' ? '#fff' : '#000',
        bodyColor: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
      },
    },
  };

  return (
    <Card className="p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl font-semibold">Recovery Progress</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-72 w-full">
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RecoveryChart; 