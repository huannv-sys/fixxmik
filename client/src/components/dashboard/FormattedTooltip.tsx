import React from 'react';
import { Tooltip, TooltipProps } from 'recharts';
import { formatBytes, formatBandwidth } from '@/hooks/use-data-formatter';

export const FormattedTooltip: React.FC<TooltipProps<any, any>> = (props) => {
  const formatter = (value: number | string, name: string) => {
    if (typeof value !== 'number') return [value, name];
    
    // Dựa vào tên để định dạng
    if (name.toLowerCase().includes('download') || 
        name.toLowerCase().includes('upload') || 
        name.toLowerCase().includes('traffic')) {
      return [formatBandwidth(value, 2), name];
    }
    
    // Mặc định định dạng bytes
    return [formatBytes(value, 2), name];
  };
  
  return <Tooltip {...props} formatter={formatter} />;
};