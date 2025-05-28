import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import dynamic from "next/dynamic";
import { METRIC_TYPES } from "@/hooks/types";
import { api } from "@/lib/api";

// Import ApexCharts dynamically to prevent SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  status?: "normal" | "warning" | "alert";
  statusText?: string;
  data: number[] | { systolic: number[]; diastolic: number[] } | { fasting: number[]; postprandial: number[] }; // Support all formats
  color: string;
  icon?: React.ReactNode;
  onAddMetric?: (type: string, value: number) => Promise<boolean>;
  onReloadMetric?: (metricType: string) => Promise<void>;
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
  onReloadMetric,
}: MetricCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [systolicValue, setSystolicValue] = useState("");
  const [diastolicValue, setDiastolicValue] = useState("");
  const [fastingValue, setFastingValue] = useState("");
  const [postprandialValue, setPostprandialValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const { theme } = useTheme();

  // Fallbacks for potentially undefined props
  const safeTitle = title || 'Unknown Metric';
  const safeValue = value || '--';
  const safeStatus = status || 'normal';
  const safeStatusText = statusText || 'No status';
  const safeColor = color || '#6b7280';

  // Check if this is a blood pressure metric
  const isBloodPressure = safeTitle === 'Blood Pressure';
  
  // Check if this is a blood glucose metric
  const isBloodGlucose = safeTitle === 'Blood Sugar';

  // Map display title to API metric type
  const getMetricType = (title: string): string => {
    if (!title) return 'unknown_metric';
    
    const titleMap: Record<string, string> = {
      'Heart Rate': METRIC_TYPES.HEART_RATE,
      'Blood Pressure': METRIC_TYPES.BLOOD_PRESSURE,
      'BMI': METRIC_TYPES.BMI,
      'SpO2': METRIC_TYPES.BLOOD_OXYGEN_SATURATION,
      'Temperature': METRIC_TYPES.BODY_TEMPERATURE,
      'Blood Sugar': METRIC_TYPES.BLOOD_GLUCOSE,
    };
    return titleMap[title] || title.toLowerCase().replace(/\s+/g, '_');
  };
  
  const badgeVariant = "outline";

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
  const hasData = isBloodPressure 
    ? (typeof data === 'object' && 'systolic' in data && 'diastolic' in data && 
       (data.systolic.length > 0 || data.diastolic.length > 0))
    : isBloodGlucose
    ? (typeof data === 'object' && 'fasting' in data && 'postprandial' in data && 
       (data.fasting.length > 0 || data.postprandial.length > 0))
    : (Array.isArray(data) && data.length > 0 && data.some(val => typeof val === 'number' && !isNaN(val)));

  // Prepare chart series based on metric type
  const getChartSeries = () => {
    if (isBloodPressure && typeof data === 'object' && 'systolic' in data && 'diastolic' in data) {
      return [
        {
          name: 'Systolic',
          data: data.systolic.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
        },
        {
          name: 'Diastolic', 
          data: data.diastolic.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
        }
      ];
    } else if (isBloodGlucose && typeof data === 'object' && 'fasting' in data && 'postprandial' in data) {
      return [
        {
          name: 'Fasting',
          data: data.fasting.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
        },
        {
          name: 'Postprandial', 
          data: data.postprandial.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
        }
      ];
    } else if (Array.isArray(data)) {
      return [
        {
          name: safeTitle,
          data: data.filter(val => typeof val === 'number' && !isNaN(val)).reverse(),
        }
      ];
    }
    return [{ name: safeTitle, data: [0] }];
  };

  // Get chart colors based on metric type
  const getChartColors = () => {
    if (isBloodPressure) {
      return ['#ef4444', '#3b82f6']; // Red for systolic, blue for diastolic
    } else if (isBloodGlucose) {
      return ['#10b981', '#f59e0b']; // Green for fasting, amber for postprandial
    }
    return [safeColor];
  };

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
    colors: getChartColors(),
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

  const chartSeries = getChartSeries();

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
        ? (() => {
            if (isBloodPressure && typeof data === 'object' && 'systolic' in data && 'diastolic' in data) {
              const maxLength = Math.max(data.systolic.length, data.diastolic.length);
              return Array.from({ length: maxLength }, (_, i) => `Reading ${maxLength - i}`).reverse();
            } else if (Array.isArray(data)) {
              return Array.from({ length: data.length }, (_, i) => `Reading ${data.length - i}`).reverse();
            }
            return ["No Data"];
          })()
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
    
    // Validate inputs based on metric type
    if (isBloodPressure) {
      if (!systolicValue.trim() || !diastolicValue.trim()) return;
    } else if (isBloodGlucose) {
      if (!fastingValue.trim() || !postprandialValue.trim()) return;
    } else {
      if (!newValue.trim()) return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const metricType = getMetricType(safeTitle);
      
      if (isBloodPressure) {
        // Handle blood pressure with systolic and diastolic values
        const systolic = parseFloat(systolicValue);
        const diastolic = parseFloat(diastolicValue);
        
        // Enhanced validation for blood pressure
        if (isNaN(systolic) || isNaN(diastolic)) {
          throw new Error('Please enter valid numbers for both systolic and diastolic values');
        }
        
        if (!isFinite(systolic) || !isFinite(diastolic)) {
          throw new Error('Please enter finite numbers');
        }
        
        if (systolic <= 0 || diastolic <= 0) {
          throw new Error('Please enter positive numbers');
        }
        
        if (systolic <= diastolic) {
          throw new Error('Systolic pressure must be greater than diastolic pressure');
        }

        // Use the composite API for blood pressure
        const result = await api.health.addCompositeMetric({
          type: metricType,
          systolic: systolic,
          diastolic: diastolic,
          unit: 'mmHg',
          notes: `Added via ${safeTitle} card`,
          source: 'manual'
        });
        
        if (result) {
          setSubmitSuccess(true);
          setSystolicValue("");
          setDiastolicValue("");
          
          // Auto-reload the metric to update the graph
          if (onReloadMetric) {
            await onReloadMetric(metricType);
          }
          
          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            setSubmitSuccess(false);
          }, 3000);
        } else {
          throw new Error('Failed to add blood pressure - no response received');
        }
      } else if (isBloodGlucose) {
        // Handle blood glucose with fasting and postprandial values
        const fasting = parseFloat(fastingValue);
        const postprandial = parseFloat(postprandialValue);
        
        // Enhanced validation for blood glucose
        if (isNaN(fasting) || isNaN(postprandial)) {
          throw new Error('Please enter valid numbers for both fasting and postprandial values');
        }
        
        if (!isFinite(fasting) || !isFinite(postprandial)) {
          throw new Error('Please enter finite numbers');
        }
        
        if (fasting <= 0 || postprandial <= 0) {
          throw new Error('Please enter positive numbers');
        }

        // Use the composite API for blood glucose
        const result = await api.health.addCompositeMetric({
          type: metricType,
          fasting: fasting,
          postprandial: postprandial,
          unit: 'mg/dL',
          notes: `Added via ${safeTitle} card`,
          source: 'manual'
        });
        
        if (result) {
          setSubmitSuccess(true);
          setFastingValue("");
          setPostprandialValue("");
          
          // Auto-reload the metric to update the graph
          if (onReloadMetric) {
            await onReloadMetric(metricType);
          }
          
          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            setSubmitSuccess(false);
          }, 3000);
        } else {
          throw new Error('Failed to add blood glucose - no response received');
        }
      } else {
        // Handle regular metrics
        const numericValue = parseFloat(newValue);
        
        // Enhanced validation
        if (isNaN(numericValue)) {
          throw new Error('Please enter a valid number');
        }
        
        if (!isFinite(numericValue)) {
          throw new Error('Please enter a finite number');
        }
        
        if (numericValue < 0) {
          throw new Error('Please enter a positive number');
        }

        const result = await onAddMetric?.(metricType, numericValue);
        
        if (result) {
          setSubmitSuccess(true);
          setNewValue("");
          
          // Auto-reload the metric to update the graph
          if (onReloadMetric) {
            await onReloadMetric(metricType);
          }
          
          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            setSubmitSuccess(false);
          }, 3000);
        } else {
          throw new Error('Failed to add metric - no response received');
        }
      }

    } catch (error) {
      console.error(`Failed to add ${safeTitle} metric:`, error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to add metric');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal when clicking reload
    
    if (!onReloadMetric || reloading) return;
    
    setReloading(true);
    try {
      await onReloadMetric(getMetricType(safeTitle));
    } catch (error) {
      console.error(`Failed to reload ${safeTitle} metric:`, error);
      // Could add error toast here if needed
    } finally {
      setReloading(false);
    }
  };

  return (
    <>
      <Card 
        className="shadow-md h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" 
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="pb-2 pt-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-md font-medium text-muted-foreground">
              {safeTitle}
            </CardTitle>
            <div className="flex items-center gap-1">
              {icon && <div className="p-1 rounded-full bg-muted flex items-center justify-center">{icon}</div>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">{safeValue}</span>
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
        <CardFooter className="pt-2 pb-2 px-2">
          <div className="w-full h-14">
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
            <div className="flex items-center justify-between">
              <DialogTitle>{safeTitle} Details</DialogTitle>
              {onReloadMetric && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReload}
                  disabled={reloading}
                  className="text-foreground mr-5"
                >
                  {reloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reloading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reload
                    </>
                  )}
                </Button>
              )}
            </div>
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
            {isBloodPressure ? (
              // Blood pressure form with systolic and diastolic inputs
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="systolic" className="text-right">
                    Systolic:
                  </Label>
                  <Input
                    id="systolic"
                    type="number"
                    step="1"
                    className="col-span-2"
                    value={systolicValue}
                    onChange={(e) => setSystolicValue(e.target.value)}
                    placeholder="Enter systolic pressure"
                    disabled={submitting}
                    required
                  />
                  <span className="text-sm text-muted-foreground">mmHg</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="diastolic" className="text-right">
                    Diastolic:
                  </Label>
                  <Input
                    id="diastolic"
                    type="number"
                    step="1"
                    className="col-span-2"
                    value={diastolicValue}
                    onChange={(e) => setDiastolicValue(e.target.value)}
                    placeholder="Enter diastolic pressure"
                    disabled={submitting}
                    required
                  />
                  <span className="text-sm text-muted-foreground">mmHg</span>
                </div>
              </div>
            ) : isBloodGlucose ? (
              // Blood glucose form with fasting and postprandial inputs
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fasting" className="text-right">
                    Fasting:
                  </Label>
                  <Input
                    id="fasting"
                    type="number"
                    step="0.1"
                    className="col-span-2"
                    value={fastingValue}
                    onChange={(e) => setFastingValue(e.target.value)}
                    placeholder="Enter fasting blood glucose"
                    disabled={submitting}
                    required
                  />
                  <span className="text-sm text-muted-foreground">mg/dL</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="postprandial" className="text-right">
                    Postprandial:
                  </Label>
                  <Input
                    id="postprandial"
                    type="number"
                    step="0.1"
                    className="col-span-2"
                    value={postprandialValue}
                    onChange={(e) => setPostprandialValue(e.target.value)}
                    placeholder="Enter postprandial blood glucose"
                    disabled={submitting}
                    required
                  />
                  <span className="text-sm text-muted-foreground">mg/dL</span>
                </div>
              </div>
            ) : (
              // Regular metric form with single input
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
            )}
            
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
              <Button 
                type="submit" 
                disabled={
                  submitting || 
                  (isBloodPressure ? (!systolicValue.trim() || !diastolicValue.trim()) : isBloodGlucose ? (!fastingValue.trim() || !postprandialValue.trim()) : !newValue.trim())
                }
              >
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