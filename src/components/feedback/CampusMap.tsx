import React from 'react';
import { HealthcareMap } from '../maps/HealthcareMap';

interface CampusMapProps {
  filterType?: 'all' | 'campus' | 'hospitals' | 'pharmacies' | 'diagnostics';
  onSelectFacility?: (facility: any) => void;
  initialSelectedId?: string;
  height?: string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  filterType = 'all',
  onSelectFacility,
  initialSelectedId,
  height = '480px'
}) => {
  return (
    <HealthcareMap
      filterType={filterType}
      onSelectFacility={onSelectFacility}
      initialSelectedId={initialSelectedId}
      height={height}
    />
  );
};
