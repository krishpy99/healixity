import React from "react";
import MetricCard from "@/components/MetricCard";
import ChatBox from "@/components/ChatBox";
import DocumentUpload from "@/components/DocumentUpload";
import RecoveryChart from "@/components/RecoveryChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Activity,
  Thermometer,
  Droplet,
  Gauge,
  BarChart,
} from "lucide-react";
import { useDashboardData, useMetrics } from "@/hooks";

export default function Dashboard() {
  // Use our composite hook that combines all dashboard data
  const { metrics, recoveryChartData, loading, error } = useDashboardData();
  
  // Get addMetric function to pass to MetricCard components
  const { addMetric } = useMetrics();
  
  // Create a simplified addMetric function for MetricCard
  const handleAddMetric = async (type: string, value: number, unit: string): Promise<boolean> => {
    try {
      const result = await addMetric({
        type,
        value,
        unit
      });
      return !!result;
    } catch (error) {
      console.error('Failed to add metric:', error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Health Dashboard</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" className="text-foreground">
              Settings
            </Button>
            <Button size="sm">
              <BarChart className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading dashboard data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            {error}
          </div>
        ) : (
          /* Main grid layout */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Health Metrics */}
            <div className="md:col-span-6 lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
              {metrics && (
                <>
                  <MetricCard
                    title="Heart Rate"
                    value={metrics.heartRate.current}
                    unit={metrics.heartRate.unit}
                    status={metrics.heartRate.status}
                    statusText={metrics.heartRate.statusText}
                    data={metrics.heartRate.data}
                    color={metrics.heartRate.color}
                    icon={<Heart className="h-4 w-4 text-red-500" />}
                    onAddMetric={handleAddMetric}
                  />
                  <MetricCard
                    title="Blood Pressure"
                    value={metrics.bloodPressure.current}
                    status={metrics.bloodPressure.status}
                    statusText={metrics.bloodPressure.statusText}
                    data={metrics.bloodPressure.data}
                    color={metrics.bloodPressure.color}
                    icon={<Activity className="h-4 w-4 text-blue-500" />}
                    onAddMetric={handleAddMetric}
                  />
                  <MetricCard
                    title="BMI"
                    value={metrics.bmi.current}
                    status={metrics.bmi.status}
                    statusText={metrics.bmi.statusText}
                    data={metrics.bmi.data}
                    color={metrics.bmi.color}
                    icon={<Gauge className="h-4 w-4 text-purple-500" />}
                    onAddMetric={handleAddMetric}
                  />
                  <MetricCard
                    title="SpO2"
                    value={metrics.spo2.current}
                    unit={metrics.spo2.unit}
                    status={metrics.spo2.status}
                    statusText={metrics.spo2.statusText}
                    data={metrics.spo2.data}
                    color={metrics.spo2.color}
                    icon={<Droplet className="h-4 w-4 text-green-500" />}
                    onAddMetric={handleAddMetric}
                  />
                  <MetricCard
                    title="Temperature"
                    value={metrics.temperature.current}
                    unit={metrics.temperature.unit}
                    status={metrics.temperature.status}
                    statusText={metrics.temperature.statusText}
                    data={metrics.temperature.data}
                    color={metrics.temperature.color}
                    icon={<Thermometer className="h-4 w-4 text-amber-500" />}
                    onAddMetric={handleAddMetric}
                  />
                  <MetricCard
                    title="Blood Sugar"
                    value={metrics.bloodSugar.current}
                    unit={metrics.bloodSugar.unit}
                    status={metrics.bloodSugar.status}
                    statusText={metrics.bloodSugar.statusText}
                    data={metrics.bloodSugar.data}
                    color={metrics.bloodSugar.color}
                    icon={<Droplet className="h-4 w-4 text-blue-500" />}
                    onAddMetric={handleAddMetric}
                  />
                </>
              )}
            </div>

            {/* Chat Box Component */}
            <div className="md:col-span-6 lg:col-span-4">
              <ChatBox />
            </div>

            {/* Recovery Tracker */}
            <div className="md:col-span-8">
              {recoveryChartData && <RecoveryChart data={recoveryChartData} />}
            </div>

            {/* Document Upload Section */}
            <div className="md:col-span-4">
              <DocumentUpload />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
