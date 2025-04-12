import React from "react";

interface GaugeChartProps {
  value: number;
  title: string;
  min?: number;
  max?: number;
  unit?: string;
  colorConfig?: {
    low: string;
    medium: string;
    high: string;
  };
}

const defaultColorConfig = {
  low: "#4CAF50", // Green
  medium: "#FFC107", // Yellow
  high: "#F44336", // Red
};

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  title,
  min = 0,
  max = 100,
  unit = "%",
  colorConfig = defaultColorConfig,
}) => {
  // Log giá trị để debug
  console.log(`GaugeChart ${title} nhận giá trị:`, value, typeof value);

  // Đảm bảo value là số và trong phạm vi min-max
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  const normalizedValue = Math.max(min, Math.min(max, numericValue));

  // Calculate percentage for the rotation
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Calculate the rotation angle (from -90 to 90 degrees)
  const rotationAngle = -90 + (180 * percentage) / 100;

  // Determine the color based on value
  let color;
  if (percentage < 50) {
    color = colorConfig.low;
  } else if (percentage < 80) {
    color = colorConfig.medium;
  } else {
    color = colorConfig.high;
  }

  // Log calculated values
  console.log(`${title} - Giá trị đã xử lý:`, {
    numericValue,
    normalizedValue,
    percentage,
    rotationAngle,
  });

  // SVG Arc parameters
  const radius = 70;
  const strokeWidth = 15;
  const viewBoxSize = (radius + strokeWidth) * 2;
  const center = viewBoxSize / 2;

  return (
    <div className="gauge-chart flex flex-col items-center justify-center p-2 bg-slate-800 rounded-lg overflow-hidden relative border border-slate-600">
      <div className="text-center mb-1">
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>

      <div className="relative">
        <svg
          width="100%"
          height="140"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="mx-auto"
        >
          {/* Background arc */}
          <path
            d={`M ${center} ${center} m 0 ${-radius} a ${radius} ${radius} 0 1 1 -0.01 0 z`}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
            strokeDasharray="540 540"
            strokeDashoffset="142"
            strokeLinecap="round"
          />

          {/* Colored arc based on percentage */}
          <path
            d={`M ${center} ${center} m 0 ${-radius} a ${radius} ${radius} 0 1 1 -0.01 0 z`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray="540 540"
            strokeDashoffset={540 - percentage * 3.98}
            strokeLinecap="round"
          />

          {/* Needle */}
          <line
            x1={center}
            y1={center}
            x2={center + radius * Math.cos((rotationAngle * Math.PI) / 180)}
            y2={center + radius * Math.sin((rotationAngle * Math.PI) / 180)}
            stroke="#FFF"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Needle center */}
          <circle cx={center} cy={center} r="6" fill="#FFF" />
        </svg>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-1 text-center">
          <span className="text-3xl font-bold text-white">
            {normalizedValue}
          </span>
          <span className="text-lg text-blue-300">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;
