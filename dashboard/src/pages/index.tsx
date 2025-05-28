import React, { useState } from "react";
import Head from "next/head";
import MetricCard from "@/components/MetricCard";
import ChatBox from "@/components/ChatBox";
import DocumentUpload from "@/components/DocumentUpload";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MetricSettingsModal } from "@/components/MetricSettingsModal";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Activity,
  Thermometer,
  Droplet,
  Gauge,
  BarChart,
  Settings,
  Scale,
  Ruler,
  Zap,
  Moon,
  Dumbbell,
  GlassWater,
  Footprints,
} from "lucide-react";
import { useDashboardData, useMetrics } from "@/hooks";
import { useMetricSettings } from "@/hooks/useMetricSettings";
import { getMetricUnit, METRIC_TYPES } from "@/hooks/types";

// Define metric configuration with icons and display info
const METRIC_CONFIG: Record<string, {
  title: string;
  icon: React.ReactElement;
  dataKey: string;
}> = {
  [METRIC_TYPES.HEART_RATE]: {
    title: "Heart Rate",
    icon: <Heart className="h-4 w-4 text-red-500" />,
    dataKey: "heartRate"
  },
  [METRIC_TYPES.BLOOD_PRESSURE]: {
    title: "Blood Pressure",
    icon: <Activity className="h-4 w-4 text-blue-500" />,
    dataKey: "bloodPressure"
  },
  [METRIC_TYPES.BMI]: {
    title: "BMI",
    icon: <Gauge className="h-4 w-4 text-purple-500" />,
    dataKey: "bmi"
  },
  [METRIC_TYPES.BLOOD_OXYGEN_SATURATION]: {
    title: "SpO2",
    icon: <Droplet className="h-4 w-4 text-green-500" />,
    dataKey: "spo2"
  },
  [METRIC_TYPES.BODY_TEMPERATURE]: {
    title: "Temperature",
    icon: <Thermometer className="h-4 w-4 text-amber-500" />,
    dataKey: "temperature"
  },
  [METRIC_TYPES.BLOOD_GLUCOSE]: {
    title: "Blood Sugar",
    icon: <Droplet className="h-4 w-4 text-blue-500" />,
    dataKey: "bloodSugar"
  },
  [METRIC_TYPES.WEIGHT]: {
    title: "Weight",
    icon: <Scale className="h-4 w-4 text-indigo-500" />,
    dataKey: "weight"
  },
  [METRIC_TYPES.HEIGHT]: {
    title: "Height",
    icon: <Ruler className="h-4 w-4 text-gray-500" />,
    dataKey: "height"
  },
  [METRIC_TYPES.CHOLESTEROL_TOTAL]: {
    title: "Total Cholesterol",
    icon: <Zap className="h-4 w-4 text-yellow-500" />,
    dataKey: "cholesterolTotal"
  },
  [METRIC_TYPES.CHOLESTEROL_HDL]: {
    title: "HDL Cholesterol",
    icon: <Zap className="h-4 w-4 text-green-600" />,
    dataKey: "cholesterolHDL"
  },
  [METRIC_TYPES.CHOLESTEROL_LDL]: {
    title: "LDL Cholesterol",
    icon: <Zap className="h-4 w-4 text-red-600" />,
    dataKey: "cholesterolLDL"
  },
  [METRIC_TYPES.SLEEP_DURATION]: {
    title: "Sleep Duration",
    icon: <Moon className="h-4 w-4 text-indigo-500" />,
    dataKey: "sleepDuration"
  },
  [METRIC_TYPES.EXERCISE_DURATION]: {
    title: "Exercise Duration",
    icon: <Dumbbell className="h-4 w-4 text-orange-500" />,
    dataKey: "exerciseDuration"
  },
  [METRIC_TYPES.WATER_INTAKE]: {
    title: "Water Intake",
    icon: <GlassWater className="h-4 w-4 text-blue-400" />,
    dataKey: "waterIntake"
  },
  [METRIC_TYPES.STEPS]: {
    title: "Steps",
    icon: <Footprints className="h-4 w-4 text-green-600" />,
    dataKey: "steps"
  },
};

export default function Dashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use our composite hook that combines all dashboard data
  const { metrics, loading, error, reloadSpecificMetric } = useDashboardData();

  // Get addMetric function to pass to MetricCard components
  const { addMetric } = useMetrics();

  // Use metric settings hook
  const { selectedMetrics, isLoaded: settingsLoaded, saveSettings } = useMetricSettings();

  // Create a simplified addMetric function for MetricCard
  const handleAddMetric = async (type: string, value: number): Promise<boolean> => {
    try {
      const result = await addMetric({
        type,
        value,
        unit: getMetricUnit(type), // Use the correct unit from backend mapping
        notes: `Added via ${type} card`,
        source: 'manual'
      });
      return !!result;
    } catch (error) {
      console.error('Failed to add metric:', error);
      return false;
    }
  };

  // Filter metrics based on user selection and available data
  const getVisibleMetrics = () => {
    if (!metrics || !settingsLoaded) return [];

    return selectedMetrics
      .map(metricType => {
        const config = METRIC_CONFIG[metricType];
        if (!config) return null;

        // Get the metric data using the dataKey
        const metricData = metrics[config.dataKey as keyof typeof metrics];
        if (!metricData) return null;

        return {
          metricType,
          config,
          data: metricData
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };

  const visibleMetrics = getVisibleMetrics();

  return (
    <>
      <Head>
        <title>Healixity - Personal Health Dashboard</title>
        <meta name="description" content="Your comprehensive health monitoring and management platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col min-h-screen lg:h-screen bg-background p-2 md:p-4">
        <div className="mx-auto max-w-7xl w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between py-2 mb-3">
            <h1 className="text-2xl font-semibold text-foreground">Healixity</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="text-foreground"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button size="sm">
                <BarChart className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>

          {loading || !settingsLoaded ? (
            <div className="flex items-center justify-center flex-1">
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
            /* Main layout: responsive stacking on mobile, 60-40 split on desktop */
            <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:overflow-hidden">
              {/* Left side (60% on desktop) - split horizontally 60-40 on desktop, stacked on mobile */}
              <div className="lg:flex-[6] flex flex-col gap-4 lg:overflow-hidden">
                {/* Top-left section (60% of left side on desktop) - Metric Cards */}
                <div className="lg:flex-[6] lg:min-h-0">
                  <div className="h-full bg-card rounded-lg border p-4 lg:overflow-y-auto">
                    <h2 className="text-lg font-bold pb-2">Health Metrics</h2>
                    {visibleMetrics.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Metrics Selected</h3>
                        <p className="mb-4">Choose which health metrics to display on your dashboard.</p>
                        <Button onClick={() => setIsSettingsOpen(true)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Open Settings
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {visibleMetrics.map(({ metricType, config, data }) => (
                          <MetricCard
                            key={metricType}
                            title={config.title}
                            value={data.current}
                            unit={data.unit}
                            status={data.status}
                            statusText={data.statusText}
                            data={data.data}
                            color={data.color}
                            icon={config.icon}
                            onAddMetric={handleAddMetric}
                            onReloadMetric={reloadSpecificMetric}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom-left section (40% of left side on desktop) - Document Upload */}
                <div className="lg:flex-[4] lg:min-h-0">
                  <DocumentUpload />
                </div>
              </div>

              {/* Right side (40% on desktop) - Chat Window */}
              <div className="lg:flex-[4] lg:min-h-0 h-[500px] lg:h-full">
                <ChatBox />
              </div>
            </div>
          )}
        </div>

        {/* Settings Modal */}
        <MetricSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          selectedMetrics={selectedMetrics}
          onSaveSettings={saveSettings}
        />
      </div>
    </>
  );
}