import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, CheckCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/components/ThemeProvider";
import { METRIC_TYPES } from "@/hooks/types";

// Import ApexCharts dynamically to prevent SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  status?: "normal" | "warning" | "alert";
  statusText?: string;
  data: number[];
  color: string;
  icon?: React.ReactNode;
  onAddMetric?: (type: string, value: number, unit: string) => Promise<boolean>;
}

const MetricCard = ({
  title,
  value,
  unit,
  status = "normal",
  statusText,
  data,
  color,
  icon,
  onAddMetric,
}: MetricCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { theme } = useTheme();

  // Fallbacks for potentially undefined props
  const safeTitle = title || 'Unknown Metric';
  const safeValue = value || '--';
  const safeStatus = status || 'normal';
  const safeStatusText = statusText || 'No status';
  const safeData = Array.isArray(data) ? data : [];
  const safeColor = color || '#6b7280';

  // Map display title to API metric type
  const getMetricType = (title: string): string => {
    if (!title) return 'unknown_metric';
    
    const titleMap: Record<string, string> = {
      'Heart Rate': METRIC_TYPES.HEART_RATE,
      'Blood Pressure': METRIC_TYPES.BLOOD_PRESSURE_SYSTOLIC,
      'BMI': METRIC_TYPES.BMI,
      'SpO2': 'blood_oxygen_saturation',
      'Temperature': 'body_temperature',
      'Blood Sugar': METRIC_TYPES.BLOOD_GLUCOSE,
    };
    return titleMap[title] || title.toLowerCase().replace(/\s+/g, '_');
  };

  // Convert status to appropriate badge variant
  const getStatusVariant = (status: "normal" | "warning" | "alert") => {
    if (status === "normal") return "outline";
    if (status === "warning") return "secondary";
    if (status === "alert") return "destructive";
    return "outline";
  };

  const badgeVariant = getStatusVariant(safeStatus);

  // Determine status badge classes based on theme and status
  const getStatusBadgeClass = (status: "normal" | "warning" | "alert") => {
    if (status === "normal") {
      return "status-normal";
    } else if (status === "warning") {
      return "status-warning";
    } else {
      return "status-alert";
    }
  };

  const statusBadgeClass = getStatusBadgeClass(safeStatus);

  // Check if there's data to display
  const hasData = safeData.length > 0 && safeData.some(val => typeof val === 'number' && !isNaN(val));

  const chartOptions = {
    chart: {
      type: "area" as const,
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: true,
      },
      animations: {
        enabled: true,
        easing: "easeinout" as const,
        speed: 800,
      },
      foreColor: theme === 'dark' ? '#e2e8f0' : '#1e293b', // Responsive text color
    },
    tooltip: {
      enabled: true,
      theme: theme === 'dark' ? 'dark' : 'light',
      x: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth" as const,
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100],
      },
    },
    colors: [safeColor],
    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
      },
    },
    xaxis: {
      floating: true,
      axisTicks: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      labels: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
  };

  const chartSeries = [
    {
      name: safeTitle,
      data: hasData ? safeData.filter(val => typeof val === 'number' && !isNaN(val)) : [0], // Filter out invalid values
    },
  ];

  // Enhanced chart options for the modal
  const modalChartOptions = {
    ...chartOptions,
    chart: {
      ...chartOptions.chart,
      sparkline: {
        enabled: false,
      },
      toolbar: {
        show: true,
      },
      height: 350,
    },
    xaxis: {
      categories: hasData 
        ? Array.from({ length: safeData.length }, (_, i) => `Day ${i + 1}`) 
        : ["No Data"],
      labels: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
      axisBorder: {
        show: true,
      },
    },
    yaxis: {
      show: true,
      title: {
        text: safeTitle + (unit ? ` (${unit})` : ""),
      },
    },
    grid: {
      show: true,
    },
    legend: {
      show: true,
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const metricType = getMetricType(safeTitle);
      const numericValue = parseFloat(newValue);
      
      if (isNaN(numericValue)) {
        throw new Error('Please enter a valid number');
      }

      const metricInput = {
        type: metricType,
        value: numericValue,
        unit: unit || '',
        notes: `Added via ${safeTitle} card`,
        source: 'manual'
      };

      const result = await onAddMetric?.(metricType, numericValue, unit || '');
      
      if (result) {
        setSubmitSuccess(true);
        setNewValue("");
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 3000);
      } else {
        throw new Error('Failed to add metric - no response received');
      }

    } catch (error) {
      console.error(`Failed to add ${safeTitle} metric:`, error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to add metric');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card 
        className="shadow-md h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" 
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {safeTitle}
            </CardTitle>
            {icon && <div className="p-1 rounded-full bg-muted flex items-center justify-center">{icon}</div>}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{safeValue}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {safeStatusText && safeStatusText !== "-" && safeStatusText !== "No status" && (
            <Badge 
              variant={badgeVariant} 
              className={`mt-1 ${statusBadgeClass}`}
            >
              {safeStatusText}
            </Badge>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="pt-2 pb-1 px-2">
          <div className="w-full h-16">
            {typeof window !== "undefined" && (
              hasData ? (
                <Chart
                  options={chartOptions}
                  series={chartSeries}
                  type="area"
                  height="100%"
                  width="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No data available
                </div>
              )
            )}
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{safeTitle} Details</DialogTitle>
            <DialogDescription>
              {hasData ? "View historical data and add new measurements" : "No historical data available. Add your first measurement below."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-[350px] my-4">
            {typeof window !== "undefined" && isModalOpen && (
              hasData ? (
                <Chart
                  options={modalChartOptions}
                  series={chartSeries}
                  type="area"
                  height="100%"
                  width="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No historical data available
                </div>
              )
            )}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newValue" className="text-right">
                New {safeTitle}:
              </Label>
              <Input
                id="newValue"
                type="number"
                step="0.1"
                className="col-span-2"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Enter new ${safeTitle.toLowerCase()} value`}
                disabled={submitting}
                required
              />
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            
            {submitSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800 mt-4">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  {safeTitle} metric added successfully! Dashboard will update shortly.
                </AlertDescription>
              </Alert>
            )}
            
            {submitError && (
              <Alert className="bg-red-50 border-red-200 text-red-800 mt-4">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={submitting || !newValue.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Data Point'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MetricCard; 