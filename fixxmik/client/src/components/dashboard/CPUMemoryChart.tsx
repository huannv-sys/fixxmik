import { useState, useEffect, useCallback } from "react";
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
import { useWebSocketContext } from "../../lib/websocket-context";

interface CPUMemoryChartProps {
  deviceId: number | null;
}

type TimeRange = "1H" | "24H" | "7D";

interface ChartDataPoint {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
}

const CPUMemoryChart: React.FC<CPUMemoryChartProps> = ({ deviceId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1H");
  const [realTimeData, setRealTimeData] = useState<ChartDataPoint[]>([]);
  
  // WebSocket
  const { subscribe, unsubscribe } = useWebSocketContext();
  
  // Fetch initial metrics data
  const { data: metrics, isLoading } = useQuery<Metric[]>({ 
    queryKey: deviceId ? [`/api/devices/${deviceId}/metrics`] : ['/api/devices/metrics/none'],
    enabled: !!deviceId,
  });
  
  // Hàm để thêm dữ liệu thời gian thực mới
  const addRealTimeDataPoint = useCallback((metric: Metric) => {
    setRealTimeData(prevData => {
      // Tạo điểm dữ liệu mới
      const newDataPoint = {
        timestamp: new Date(metric.timestamp).toLocaleTimeString(),
        cpuUsage: metric.cpuUsage || 0,
        memoryUsage: metric.totalMemory ? (metric.memoryUsage || 0) / metric.totalMemory * 100 : 0
      };
      
      // Giới hạn số lượng điểm
      const maxPoints = timeRange === "1H" ? 60 : timeRange === "24H" ? 24 : 7;
      const newData = [...prevData, newDataPoint];
      
      // Giữ lại chỉ maxPoints điểm dữ liệu gần nhất
      if (newData.length > maxPoints) {
        return newData.slice(newData.length - maxPoints);
      }
      
      return newData;
    });
  }, [timeRange]);
  
  // Đăng ký nhận cập nhật WebSocket
  useEffect(() => {
    if (deviceId) {
      // Đăng ký nhận cập nhật từ thiết bị cụ thể
      const deviceTopic = `device_metrics_${deviceId}`;
      
      // Xử lý dữ liệu khi nhận được
      const handleMetricsUpdate = (data: any) => {
        console.log("Nhận được metrics qua WebSocket:", data);
        if (data && data.metrics) {
          addRealTimeDataPoint(data.metrics);
        }
      };
      
      // Đăng ký nhận cập nhật
      const unsubscribeDevice = subscribe(deviceTopic, handleMetricsUpdate);
      const unsubscribeAll = subscribe('all_devices_metrics', (data: any) => {
        if (data && data.deviceId === deviceId && data.metrics) {
          handleMetricsUpdate(data);
        }
      });
      
      // Hủy đăng ký khi component unmount
      return () => {
        unsubscribeDevice();
        unsubscribeAll();
        unsubscribe(deviceTopic);
        unsubscribe('all_devices_metrics');
      };
    }
  }, [deviceId, subscribe, unsubscribe, addRealTimeDataPoint]);
  
  // Reset dữ liệu thời gian thực khi thay đổi thiết bị hoặc khoảng thời gian
  useEffect(() => {
    setRealTimeData([]);
  }, [deviceId, timeRange]);
  
  // Khởi tạo dữ liệu thời gian thực từ metrics
  useEffect(() => {
    if (metrics && metrics.length > 0) {
      const formattedData = formatChartData(metrics);
      setRealTimeData(formattedData);
    }
  }, [metrics]);
  
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
      cpuUsage: metric.cpuUsage,
      memoryUsage: metric.totalMemory ? (metric.memoryUsage || 0) / metric.totalMemory * 100 : 0
    }));
  };
  
  // Kết hợp dữ liệu từ API và dữ liệu thời gian thực
  const chartData = realTimeData.length > 0 ? realTimeData : formatChartData(metrics);
  
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">CPU & Memory Usage</h3>
        <div className="flex space-x-2">
          <button 
            className={`px-2 py-1 text-xs font-medium rounded ${timeRange === "1H" ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => setTimeRange("1H")}
          >
            1H
          </button>
          <button 
            className={`px-2 py-1 text-xs font-medium rounded ${timeRange === "24H" ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => setTimeRange("24H")}
          >
            24H
          </button>
          <button 
            className={`px-2 py-1 text-xs font-medium rounded ${timeRange === "7D" ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-700 hover:bg-slate-600'}`}
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
                dataKey="cpuUsage" 
                name="CPU (%)" 
                stroke="#0078d4" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="memoryUsage" 
                name="Memory (%)" 
                stroke="#009688" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Đang tải dữ liệu...
          </div>
        )}
      </div>
      <div className="flex items-center justify-center mt-3 text-sm text-slate-300">
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1" />
          <span>CPU</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-teal-500 mr-1" />
          <span>Memory</span>
        </div>
      </div>
    </div>
  );
};

export default CPUMemoryChart;
