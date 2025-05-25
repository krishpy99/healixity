import React, { useState } from "react";
import MetricCard from "@/components/MetricCard";
import ChatBox from "@/components/ChatBox";
import DocumentUpload from "@/components/DocumentUpload";
import RecoveryChart from "@/components/RecoveryChart";
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
import { getMetricUnit, METRIC_TYPES, getMetricDisplayName } from "@/hooks/types";

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
  const { metrics, recoveryChartData, loading, error, reloadSpecificMetric } = useDashboardData();
  
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Health Dashboard</h1>
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
            <div className="md:col-span-6 lg:col-span-8">
              {visibleMetrics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Metrics Selected</h3>
                  <p className="mb-4">Choose which health metrics to display on your dashboard.</p>
                  <Button onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Open Settings
                  </Button>
                </div>
              ) : (
                <div className={`grid gap-4 ${
                  visibleMetrics.length === 1 ? 'grid-cols-1' :
                  visibleMetrics.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  visibleMetrics.length <= 4 ? 'grid-cols-2' :
                  'grid-cols-2 md:grid-cols-3'
                }`}>
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

      {/* Settings Modal */}
      <MetricSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedMetrics={selectedMetrics}
        onSaveSettings={saveSettings}
      />
    </div>
  );
}
