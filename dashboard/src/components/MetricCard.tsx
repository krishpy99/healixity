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
import dynamic from "next/dynamic";
import { useTheme } from "@/components/ThemeProvider";

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
}: MetricCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const { theme } = useTheme();

  // Convert status to appropriate badge variant
  const getStatusVariant = (status: "normal" | "warning" | "alert") => {
    if (status === "normal") return "outline";
    if (status === "warning") return "secondary";
    if (status === "alert") return "destructive";
    return "outline";
  };

  const badgeVariant = getStatusVariant(status);

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

  const statusBadgeClass = getStatusBadgeClass(status);

  // Check if there's data to display
  const hasData = data && data.length > 0;

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
    colors: [color],
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
      name: title,
      data: hasData ? data : [0], // Provide at least one value for empty charts
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
        ? Array.from({ length: data.length }, (_, i) => `Day ${i + 1}`) 
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
        text: title + (unit ? ` (${unit})` : ""),
      },
    },
    grid: {
      show: true,
    },
    legend: {
      show: true,
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would add logic to save the new data point
    console.log(`Adding new ${title} value: ${newValue}`);
    setNewValue("");
    // You could close the modal here if desired
    // setIsModalOpen(false);
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
              {title}
            </CardTitle>
            {icon && <div className="p-1 rounded-full bg-muted flex items-center justify-center">{icon}</div>}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {statusText && statusText !== "-" && (
            <Badge 
              variant={badgeVariant} 
              className={`mt-1 ${statusBadgeClass}`}
            >
              {statusText}
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
            <DialogTitle>{title} Details</DialogTitle>
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
                New {title}:
              </Label>
              <Input
                id="newValue"
                className="col-span-2"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Enter new ${title.toLowerCase()} value`}
              />
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="submit">Add Data Point</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MetricCard; 