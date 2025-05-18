import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const recoveryChartData = {
    labels: [],
    datasets: [
      {
        label: "Pain Level (1-10)",
        data: [],
        borderColor: "#ff6384",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
      },
      {
        label: "Mobility (%)",
        data: [],
        borderColor: "#4bc0c0",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
      },
      {
        label: "Medication (mg)",
        data: [],
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.1)",
      },
      {
        label: "Energy Level (1-10)",
        data: [],
        borderColor: "#9966ff",
        backgroundColor: "rgba(153, 102, 255, 0.1)",
      },
    ],
  };

  // Add a small delay to simulate network latency
  setTimeout(() => {
    res.status(200).json(recoveryChartData);
  }, 500);
} 