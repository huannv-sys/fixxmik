import React from 'react';
import { YAxis } from 'recharts';
import { formatBytes } from '@/hooks/use-data-formatter';

interface FormattedYAxisProps {
  tick?: object;
}

/**
 * Component YAxis đã được định dạng đúng để hiển thị bytes
 */
export const FormattedYAxis: React.FC<FormattedYAxisProps> = ({ tick = { fontSize: 10, fill: '#aaa' } }) => {
  return (
    <YAxis 
      tickFormatter={(value) => formatBytes(Number(value), 1)}
      tick={tick}
    />
  );
};