import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface AnimatedMetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  unit?: string;
  icon?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  contentClassName?: string;
  valueClassName?: string;
  changeClassName?: string;
  formatter?: (value: number) => string;
  pulseColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  showTrend?: boolean;
  shouldAnimate?: boolean;
}

export const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  title,
  value,
  previousValue,
  unit = '',
  icon,
  className = '',
  iconClassName = '',
  contentClassName = '',
  valueClassName = '',
  changeClassName = '',
  formatter = (v) => v.toString(),
  pulseColor = 'rgba(59, 130, 246, 0.15)',
  trend,
  showTrend = true,
  shouldAnimate = true,
}) => {
  const [showPulse, setShowPulse] = useState(false);
  const [calculatedTrend, setCalculatedTrend] = useState<'up' | 'down' | 'neutral'>(trend || 'neutral');
  const [percentChange, setPercentChange] = useState<number>(0);
  
  // Determine trend based on current and previous values
  useEffect(() => {
    if (trend) {
      setCalculatedTrend(trend);
      return;
    }
    
    if (previousValue !== undefined && previousValue !== value) {
      const newTrend = value > previousValue ? 'up' : value < previousValue ? 'down' : 'neutral';
      setCalculatedTrend(newTrend);
      
      if (previousValue !== 0) {
        const change = ((value - previousValue) / previousValue) * 100;
        setPercentChange(Math.abs(change));
      }
    }
  }, [value, previousValue, trend]);
  
  // Pulse animation when value changes
  useEffect(() => {
    if (!shouldAnimate) return;
    
    if (previousValue !== undefined && previousValue !== value) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue, shouldAnimate]);
  
  // Determine trend icon and color
  const renderTrendIndicator = () => {
    if (!showTrend) return null;
    
    const trendColors = {
      up: 'text-green-500',
      down: 'text-red-500',
      neutral: 'text-gray-400'
    };
    
    const trendIcons = {
      up: <ArrowUpIcon className="h-3 w-3" />,
      down: <ArrowDownIcon className="h-3 w-3" />,
      neutral: <MinusIcon className="h-3 w-3" />,
    };
    
    return (
      <div className={cn("flex items-center text-xs", trendColors[calculatedTrend], changeClassName)}>
        {trendIcons[calculatedTrend]}
        {percentChange > 0 && (
          <span className="ml-1">{percentChange.toFixed(1)}%</span>
        )}
      </div>
    );
  };
  
  return (
    <Card className={cn(
      "overflow-hidden relative border-none bg-slate-800", 
      className,
      showPulse && shouldAnimate ? "shadow-md" : ""
    )}>
      {/* Pulse animation overlay */}
      {showPulse && shouldAnimate && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundColor: pulseColor,
            animation: "pulse-fade 1.5s ease-in-out" 
          }}
        />
      )}
      
      <CardContent className={cn("p-3 flex flex-col", contentClassName)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-xs text-gray-400">
            {icon && (
              <span className={cn("mr-1.5", iconClassName)}>
                {icon}
              </span>
            )}
            {title}
          </div>
          {renderTrendIndicator()}
        </div>
        
        <div className={cn("text-lg font-semibold mt-1", valueClassName)}>
          {formatter(value)}{unit && ` ${unit}`}
        </div>
      </CardContent>
    </Card>
  );
};