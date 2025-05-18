import React from 'react';
import Image from 'next/image';
import DummyImage from './DummyImage';
import { Card } from '@/components/ui/card';

interface LocationMapProps {
  address: string;
  mapImageUrl?: string;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  address, 
  mapImageUrl 
}) => {
  return (
    <Card className="overflow-hidden">
      <div className="h-36 relative">
        {mapImageUrl ? (
          <Image
            src={mapImageUrl}
            alt="Location map"
            fill
            className="object-cover"
          />
        ) : (
          <DummyImage 
            width={400} 
            height={144} 
            text="Map" 
            bgColor="#e2e8f0" 
            className="w-full h-full"
          />
        )}
        <div className="absolute bottom-2 right-2 bg-background p-1 rounded-full">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground">Location</h3>
        <p className="text-xs text-muted-foreground mt-1">{address}</p>
      </div>
    </Card>
  );
};

export default LocationMap; 