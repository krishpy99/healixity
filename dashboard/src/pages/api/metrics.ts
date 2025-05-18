import { NextApiRequest, NextApiResponse } from 'next';

// Empty metrics data structure
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const metrics = {
    heartRate: {
      current: "-",
      unit: "bpm",
      status: "normal",
      statusText: "-",
      data: [],
      color: "#ef4444",
    },
    bloodPressure: {
      current: "-",
      status: "normal",
      statusText: "-",
      data: [],
      color: "#3b82f6",
    },
    bmi: {
      current: "-",
      status: "normal",
      statusText: "-",
      data: [],
      color: "#8b5cf6",
    },
    spo2: {
      current: "-",
      unit: "%",
      status: "normal",
      statusText: "-",
      data: [],
      color: "#10b981",
    },
    temperature: {
      current: "-",
      unit: "°F",
      status: "normal",
      statusText: "-",
      data: [],
      color: "#f59e0b",
    },
    bloodSugar: {
      current: "-",
      unit: "mg/dL",
      status: "normal",
      statusText: "-",
      data: [],
      color: "#3b82f6",
    }
  };

  // Add a small delay to simulate network latency
  setTimeout(() => {
    res.status(200).json(metrics);
  }, 500);
} 