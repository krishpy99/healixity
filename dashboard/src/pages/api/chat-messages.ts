import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const chatMessages = [
    {
      id: "1",
      message: "Hi, Doctor. I've been having frequent headaches, mostly in the morning.",
      timestamp: "12:00 PM",
      isUser: true,
    },
    {
      id: "2",
      message: "I see. On a scale of 1 to 10, how severe are the headaches?",
      timestamp: "12:10 PM",
      isUser: false,
      senderName: "Dr. Darrell Steward",
    },
    {
      id: "3",
      message: "About a 7 or 8. Very painful.",
      timestamp: "12:15 PM",
      isUser: true,
    },
  ];

  // Add a small delay to simulate network latency
  setTimeout(() => {
    if (req.method === 'GET') {
      res.status(200).json(chatMessages);
    } else if (req.method === 'POST') {
      // Simulate adding a new message
      const newMessage = {
        id: Date.now().toString(),
        message: req.body.message || "New message",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: req.body.isUser || true,
        senderName: req.body.senderName,
      };
      
      res.status(201).json(newMessage);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  }, 500);
} 