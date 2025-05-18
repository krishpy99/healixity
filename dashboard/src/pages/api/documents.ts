import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const documents = [
    {
      id: "1",
      name: "Medical_Report_2023.pdf",
      type: "application/pdf",
      size: 2500000,
      uploadedAt: new Date(2023, 4, 15).toISOString(),
    },
    {
      id: "2",
      name: "Blood_Test_Results.pdf",
      type: "application/pdf",
      size: 1200000,
      uploadedAt: new Date(2023, 4, 10).toISOString(),
    },
    {
      id: "3",
      name: "Vaccination_Certificate.pdf",
      type: "application/pdf",
      size: 980000,
      uploadedAt: new Date(2023, 3, 22).toISOString(),
    },
  ];

  // Add a small delay to simulate network latency
  setTimeout(() => {
    if (req.method === 'GET') {
      res.status(200).json(documents);
    } else if (req.method === 'POST') {
      // Simulate document upload
      const newDocument = {
        id: Date.now().toString(),
        name: req.body.name || 'Uploaded_Document.pdf',
        type: req.body.type || 'application/pdf',
        size: req.body.size || 1500000,
        uploadedAt: new Date().toISOString(),
      };
      
      res.status(201).json(newDocument);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  }, 500);
} 