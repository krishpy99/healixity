import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { METRIC_TYPES, METRIC_UNITS, getMetricDisplayName } from "@/hooks/types";
import { Heart, Activity, Gauge, Droplet, Thermometer, Scale, Ruler, Zap, Moon, Dumbbell, GlassWater, Footprints } from "lucide-react";

interface MetricSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMetrics: string[];
  onSaveSettings: (selectedMetrics: string[]) => void;
}

// Define metric categories and their icons
const METRIC_CATEGORIES = {
  cardiovascular: {
    name: "Cardiovascular",
    icon: <Heart className="h-4 w-4" />,
    color: "bg-red-100 text-red-800",
    metrics: [
      METRIC_TYPES.BLOOD_PRESSURE,
      METRIC_TYPES.HEART_RATE,
    ]
  },
  physical: {
    name: "Physical Measurements",
    icon: <Scale className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800",
    metrics: [
      METRIC_TYPES.WEIGHT,
      METRIC_TYPES.HEIGHT,
      METRIC_TYPES.BMI,
    ]
  },
  metabolic: {
    name: "Metabolic Health",
    icon: <Zap className="h-4 w-4" />,
    color: "bg-green-100 text-green-800",
    metrics: [
      METRIC_TYPES.BLOOD_GLUCOSE,
      METRIC_TYPES.CHOLESTEROL_TOTAL,
      METRIC_TYPES.CHOLESTEROL_HDL,
      METRIC_TYPES.CHOLESTEROL_LDL,
    ]
  },
  vital_signs: {
    name: "Vital Signs",
    icon: <Activity className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-800",
    metrics: [
      METRIC_TYPES.BODY_TEMPERATURE,
      METRIC_TYPES.BLOOD_OXYGEN_SATURATION,
    ]
  },
  lifestyle: {
    name: "Lifestyle & Activity",
    icon: <Dumbbell className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-800",
    metrics: [
      METRIC_TYPES.SLEEP_DURATION,
      METRIC_TYPES.EXERCISE_DURATION,
      METRIC_TYPES.WATER_INTAKE,
      METRIC_TYPES.STEPS,
    ]
  }
};

// Get icon for specific metric
const getMetricIcon = (metricType: string) => {
  switch (metricType) {
    case METRIC_TYPES.HEART_RATE:
      return <Heart className="h-4 w-4 text-red-500" />;
    case METRIC_TYPES.BLOOD_PRESSURE:
      return <Activity className="h-4 w-4 text-blue-500" />;
    case METRIC_TYPES.BMI:
      return <Gauge className="h-4 w-4 text-purple-500" />;
    case METRIC_TYPES.BLOOD_OXYGEN_SATURATION:
      return <Droplet className="h-4 w-4 text-green-500" />;
    case METRIC_TYPES.BODY_TEMPERATURE:
      return <Thermometer className="h-4 w-4 text-amber-500" />;
    case METRIC_TYPES.BLOOD_GLUCOSE:
      return <Droplet className="h-4 w-4 text-blue-500" />;
    case METRIC_TYPES.WEIGHT:
      return <Scale className="h-4 w-4 text-indigo-500" />;
    case METRIC_TYPES.HEIGHT:
      return <Ruler className="h-4 w-4 text-gray-500" />;
    case METRIC_TYPES.SLEEP_DURATION:
      return <Moon className="h-4 w-4 text-indigo-500" />;
    case METRIC_TYPES.EXERCISE_DURATION:
      return <Dumbbell className="h-4 w-4 text-orange-500" />;
    case METRIC_TYPES.WATER_INTAKE:
      return <GlassWater className="h-4 w-4 text-blue-400" />;
    case METRIC_TYPES.STEPS:
      return <Footprints className="h-4 w-4 text-green-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

export function MetricSettingsModal({ isOpen, onClose, selectedMetrics, onSaveSettings }: MetricSettingsModalProps) {
  const [tempSelectedMetrics, setTempSelectedMetrics] = useState<string[]>(selectedMetrics);

  // Update temp selection when props change
  useEffect(() => {
    setTempSelectedMetrics(selectedMetrics);
  }, [selectedMetrics]);

  const handleMetricToggle = (metricType: string) => {
    setTempSelectedMetrics(prev => {
      if (prev.includes(metricType)) {
        return prev.filter(m => m !== metricType);
      } else {
        return [...prev, metricType];
      }
    });
  };

  const handleSelectAll = () => {
    const allMetrics = Object.values(METRIC_TYPES);
    setTempSelectedMetrics(allMetrics);
  };

  const handleSelectNone = () => {
    setTempSelectedMetrics([]);
  };

  const handleSelectDefaults = () => {
    // Default to the 6 metrics currently shown
    const defaultMetrics = [
      METRIC_TYPES.HEART_RATE,
      METRIC_TYPES.BLOOD_PRESSURE,
      METRIC_TYPES.BMI,
      METRIC_TYPES.BLOOD_OXYGEN_SATURATION,
      METRIC_TYPES.BODY_TEMPERATURE,
      METRIC_TYPES.BLOOD_GLUCOSE,
    ];
    setTempSelectedMetrics(defaultMetrics);
  };

  const handleSave = () => {
    onSaveSettings(tempSelectedMetrics);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedMetrics(selectedMetrics); // Reset to original selection
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metric Display Settings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose which health metrics to display on your dashboard. You can select any combination of metrics.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectNone}>
              Select None
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectDefaults}>
              Default Selection
            </Button>
            <div className="ml-auto">
              <Badge variant="secondary">
                {tempSelectedMetrics.length} selected
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Metrics by Category */}
          <div className="space-y-6">
            {Object.entries(METRIC_CATEGORIES).map(([categoryKey, category]) => (
              <div key={categoryKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={category.color}>
                    {category.icon}
                    <span className="ml-1">{category.name}</span>
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                  {category.metrics.map((metricType) => {
                    const isSelected = tempSelectedMetrics.includes(metricType);
                    const displayName = getMetricDisplayName(metricType);
                    const unit = METRIC_UNITS[metricType];
                    
                    return (
                      <div
                        key={metricType}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'bg-muted border-primary' : 'border-border'
                        }`}
                        onClick={() => handleMetricToggle(metricType)}
                      >
                        <Checkbox
                          id={metricType}
                          checked={isSelected}
                          onCheckedChange={() => handleMetricToggle(metricType)}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {getMetricIcon(metricType)}
                          <div className="flex-1">
                            <Label 
                              htmlFor={metricType} 
                              className="text-sm font-medium cursor-pointer"
                            >
                              {displayName}
                            </Label>
                            {unit && (
                              <p className="text-xs text-muted-foreground">
                                Unit: {unit}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {tempSelectedMetrics.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No metrics selected. Your dashboard will be empty.</p>
              <p className="text-sm">Select at least one metric to display data.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 