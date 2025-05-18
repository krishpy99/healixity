import React from 'react';

interface AppointmentCardProps {
  date: string;
  time: string;
  onBook: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  date,
  time,
  onBook,
}) => {
  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-200 last:border-0">
      <div>
        <div className="text-sm font-medium">{date}</div>
        <div className="text-xs text-gray-500">{time}</div>
      </div>
      <button
        onClick={onBook}
        className="px-3 py-1 text-xs text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
      >
        Book Now
      </button>
    </div>
  );
};

export default AppointmentCard; 