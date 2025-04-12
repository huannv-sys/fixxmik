import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Metric } from "@shared/schema";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

interface NetworkTrafficChartProps {
  deviceId: number | null;
}

type TimeRange = "1H" | "24H" | "7D";

const NetworkTrafficChart: React.FC<NetworkTrafficChartProps> = ({ deviceId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1H");
  
  // Fetch metrics data
  const { data: metrics, isLoading } = useQuery<Metric[]>({ 
    queryKey: deviceId ? [`/api/devices/${deviceId}/metrics`] : null,
    enabled: !!deviceId,
  });
  
  const formatChartData = (metrics: Metric[] | undefined) => {
    if (!metrics) return [];
    
    // Sort by timestamp ascending
    const sortedMetrics = [...metrics].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Filter based on time range
    const now = new Date();
    const filteredMetrics = sortedMetrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      if (timeRange === "1H") {
        return now.getTime() - metricTime.getTime() <= 60 * 60 * 1000;
      } else if (timeRange === "24H") {
        return now.getTime() - metricTime.getTime() <= 24 * 60 * 60 * 1000;
      } else {
        return now.getTime() - metricTime.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }
    });
    
    return filteredMetrics.map(metric => ({
      timestamp: new Date(metric.timestamp).toLocaleTimeString(),
      downloadBandwidth: metric.downloadBandwidth || 0,
      uploadBandwidth: metric.uploadBandwidth || 0,
    }));
  };
  
  const chartData = formatChartData(metrics);
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-neutral-dark">Network Traffic</h3>
        <div className="flex space-x-2">
          <button 
            className={`px-2 py-1 text-xs font-medium rounded ${timeRange === "1H" ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setTimeRange("1H")}
          >
            1H
          </button>
          <button 
            className={`px-2 py-1 text-xs font-medium rounded ${timeRange === "24H" ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setTimeRange("24H")}
          >
            24H
          </button>
          <button 
            className={`px-2 py-1 text-xs font-medium rounded ${timeRange === "7D" ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setTimeRange("7D")}
          >
            7D
          </button>
        </div>
      </div>
      <div className="h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="downloadBandwidth" 
                name="Download (Mbps)" 
                stroke="#0078d4" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="uploadBandwidth" 
                name="Upload (Mbps)" 
                stroke="#d83b01" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available
          </div>
        )}
      </div>
      <div className="flex items-center justify-center mt-3 text-sm text-gray-500">
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 rounded-full bg-primary mr-1" />
          <span>Download</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-amber-500 mr-1" />
          <span>Upload</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkTrafficChart;
