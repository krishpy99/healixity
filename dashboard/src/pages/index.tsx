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

export default function Dashboard() {
  // Sample data for metrics
  const heartRateData = [75, 72, 78, 71, 73, 76, 70, 74, 72, 75, 71, 69];
  const bloodPressureData = [120, 118, 122, 119, 121, 120, 118, 120, 119, 121];
  const bmiData = [24.3, 24.4, 24.5, 24.5, 24.4, 24.5, 24.6, 24.5, 24.4, 24.5];
  const spo2Data = [98, 97, 98, 98, 97, 98, 99, 98, 98, 97, 98, 99, 98];
  const temperatureData = [98.4, 98.5, 98.6, 98.5, 98.6, 98.7, 98.6, 98.5, 98.6, 98.7];
  const bloodSugarData = [94, 96, 93, 95, 97, 94, 96, 95, 93, 95, 96, 94, 95];

  // Recovery chart data
  const recoveryChartData = {
    labels: ["Feb 10", "Feb 11", "Feb 12", "Feb 13", "Feb 14", "Feb 15", "Feb 16"],
    datasets: [
      {
        label: "Pain Level (1-10)",
        data: [65, 55, 45, 40, 45, 35, 30],
        borderColor: "#ff6384",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
      },
      {
        label: "Mobility (%)",
        data: [30, 40, 55, 70, 65, 80, 90],
        borderColor: "#4bc0c0",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
      },
      {
        label: "Medication (mg)",
        data: [100, 90, 80, 70, 80, 60, 50],
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.1)",
      },
      {
        label: "Energy Level (1-10)",
        data: [30, 45, 55, 60, 55, 70, 80],
        borderColor: "#9966ff",
        backgroundColor: "rgba(153, 102, 255, 0.1)",
      },
    ],
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

        {/* Main grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Health Metrics */}
          <div className="md:col-span-6 lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              title="Heart Rate"
              value="72"
              unit="bpm"
              status="normal"
              statusText="Resting"
              data={heartRateData}
              color="#ef4444"
              icon={<Heart className="h-4 w-4 text-red-500" />}
            />
            <MetricCard
              title="Blood Pressure"
              value="120/80"
              status="normal"
              statusText="Healthy"
              data={bloodPressureData}
              color="#3b82f6"
              icon={<Activity className="h-4 w-4 text-blue-500" />}
            />
            <MetricCard
              title="BMI"
              value="24.5"
              status="warning"
              statusText="Slight increase"
              data={bmiData}
              color="#8b5cf6"
              icon={<Gauge className="h-4 w-4 text-purple-500" />}
            />
            <MetricCard
              title="SpO2"
              value="98"
              unit="%"
              status="normal"
              statusText="Healthy"
              data={spo2Data}
              color="#10b981"
              icon={<Droplet className="h-4 w-4 text-green-500" />}
            />
            <MetricCard
              title="Temperature"
              value="98.6"
              unit="°F"
              status="normal"
              statusText="Healthy"
              data={temperatureData}
              color="#f59e0b"
              icon={<Thermometer className="h-4 w-4 text-amber-500" />}
            />
            <MetricCard
              title="Blood Sugar"
              value="95"
              unit="mg/dL"
              status="normal"
              statusText="Stable"
              data={bloodSugarData}
              color="#3b82f6"
              icon={<Droplet className="h-4 w-4 text-blue-500" />}
            />
          </div>

          {/* Chat Box Component */}
          <div className="md:col-span-6 lg:col-span-4">
            <ChatBox />
          </div>

          {/* Recovery Tracker */}
          <div className="md:col-span-8">
            <RecoveryChart data={recoveryChartData} />
          </div>

          {/* Document Upload Section */}
          <div className="md:col-span-4">
            <DocumentUpload />
          </div>
        </div>
      </div>
    </div>
  );
}
