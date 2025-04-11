import React from 'react';
import { Tooltip } from 'recharts';
import { formatBytes, formatBandwidth } from '@/hooks/use-data-formatter';

interface FormattedTooltipProps {
  isBandwidth?: boolean;
}

export const FormattedTooltip: React.FC<FormattedTooltipProps> = ({ isBandwidth = false }) => {
  return (
    <Tooltip 
      formatter={(value, name) => {
        if (isBandwidth) {
          return [formatBandwidth(Number(value), 2), name];
        } else {
          return [formatBytes(Number(value), 2), name];
        }
      }}
      labelFormatter={(label) => `Thời gian: ${label}`}
    />
  );
};