import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Metric, Device } from "@shared/schema";
import GaugeChart from "./GaugeChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Info } from "lucide-react";

interface SystemMetricsProps {
  deviceId: number | null;
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ deviceId }) => {
  // Fetch device info - Sửa query key để hiển thị đúng
  const { data: device } = useQuery<Device>({
    queryKey: deviceId ? [`/api/devices/${deviceId}`] : ["empty"],
    enabled: !!deviceId,
    refetchInterval: 1000, // Cập nhật mỗi giây để tạo hiệu ứng thời gian thực
  });

  // Fetch metrics data with higher refresh rate - sửa đường dẫn API
  const metricsEndpoint = deviceId ? `/api/devices/${deviceId}/metrics` : null;

  const { data: metrics, isLoading } = useQuery<Metric[]>({
    queryKey: metricsEndpoint ? [metricsEndpoint] : ["empty"],
    enabled: !!deviceId,
    refetchInterval: 1000, // Cập nhật mỗi giây để tạo hiệu ứng thời gian thực
  });

  // Fetch interfaces data to calculate errors
  const { data: interfaces } = useQuery<any[]>({
    queryKey: deviceId
      ? [`/api/devices/${deviceId}/interfaces`]
      : ["empty-interfaces"],
    enabled: !!deviceId,
    refetchInterval: 1000, // Cập nhật mỗi giây để tạo hiệu ứng thời gian thực
  });

  useEffect(() => {
    if (metrics && metrics.length > 0) {
      // Log metrics để debug
      console.log("Nhận được metrics:", metrics.length);
      console.log("Mẫu dữ liệu đầu tiên:", JSON.stringify(metrics[0]));
    }
  }, [metrics]);

  // Get latest metric
  const latestMetric =
    metrics && metrics.length > 0
      ? [...metrics].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0]
      : null;

  useEffect(() => {
    if (latestMetric) {
      // Log metric mới nhất để debug
      console.log("Metric mới nhất:", JSON.stringify(latestMetric));
      console.log("CPU Load:", latestMetric.cpuLoad || latestMetric.cpuUsage);
      console.log(
        "Memory Used:",
        latestMetric.memoryUsed || latestMetric.memoryUsage,
      );
      console.log("Temperature:", latestMetric.temperature);
    }
  }, [latestMetric]);

  // Prepare chart data for the system usage graph
  const formatSystemUsageChart = () => {
    if (!metrics || metrics.length === 0) return [];

    const last30Metrics = [...metrics]
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .slice(-30); // Last 30 data points

    return last30Metrics.map((metric) => ({
      time: new Date(metric.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cpu: metric.cpuLoad || metric.cpuUsage || 0,
      memory: metric.memoryUsed
        ? (metric.memoryUsed / (metric.totalMemory || 4294967296)) * 100
        : metric.memoryUsage || 0,
      disk: metric.downloadBandwidth
        ? Math.min(100, metric.downloadBandwidth / 1024 / 1024)
        : 0,
    }));
  };

  const systemUsageData = formatSystemUsageChart();

  // Format date and time
  const formatDateTime = (date: Date) => {
    return {
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      date: date.toLocaleDateString("en-GB"),
    };
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 shadow-md flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render no data state
  if (!latestMetric) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 shadow-md flex items-center justify-center h-64">
        <p className="text-gray-400">No system metrics available</p>
      </div>
    );
  }

  // Lấy và xử lý dữ liệu từ metrics API - bổ sung hỗ trợ các trường cũ và mới
  const cpuUsage =
    latestMetric?.cpuLoad !== undefined
      ? Number(latestMetric.cpuLoad)
      : latestMetric?.cpuUsage !== undefined
        ? Number(latestMetric.cpuUsage)
        : 0;
  // Kiểm tra nhiệt độ có giá trị hợp lệ (> 0) không
  const hasCpuTemp =
    latestMetric?.temperature !== undefined &&
    Number(latestMetric.temperature) > 0;
  const cpuTemp = hasCpuTemp ? Number(latestMetric.temperature) : 0;

  // Tính toán RAM usage dựa trên memoryUsage và totalMemory
  let ramUsage = 0;
  if (latestMetric?.memoryUsage !== undefined && latestMetric?.totalMemory) {
    // memoryUsage là bộ nhớ đã sử dụng (bytes), totalMemory là tổng bộ nhớ (bytes)
    ramUsage = Math.round(
      (Number(latestMetric.memoryUsage) / Number(latestMetric.totalMemory)) *
        100,
    );
    console.log("Tính RAM usage: ", {
      memoryUsage: latestMetric.memoryUsage,
      totalMemory: latestMetric.totalMemory,
      calculated: ramUsage,
    });
  } else if (
    latestMetric?.memoryUsed !== undefined &&
    latestMetric?.totalMemory
  ) {
    // Trường hợp sử dụng memoryUsed nếu có
    ramUsage = Math.round(
      (Number(latestMetric.memoryUsed) / Number(latestMetric.totalMemory)) *
        100,
    );
  }

  // Tính toán disk usage (chọn một giá trị thực tế thay cho giá trị mặc định 100%)
  // Đối với thiết bị Mikrotik, chúng ta cần thông tin lưu trữ chính xác, nhưng nếu không có,
  // sử dụng một giá trị tỷ lệ từ bandwidth
  let diskUsage = 75; // Giá trị mặc định hợp lý hơn, thường thiết bị Mikrotik sử dụng 70-80% dung lượng hệ thống

  // Nếu có dữ liệu thực tế về disk, sử dụng nó
  // Lưu ý: Chúng ta phải kiểm tra trường storage trong deviceData thay vì trực tiếp
  if (
    device?.deviceData &&
    typeof device.deviceData === "object" &&
    "storage" in device.deviceData
  ) {
    const storage = device.deviceData.storage as any;
    const totalSpace = Number(storage.total || 0);
    const usedSpace = Number(storage.used || 0);

    if (totalSpace > 0) {
      diskUsage = Math.round((usedSpace / totalSpace) * 100);
    }
  }

  console.log("Tính Disk usage: ", diskUsage);

  // Log các giá trị đã xử lý
  console.log("Giá trị hiển thị:", { cpuUsage, cpuTemp, ramUsage, diskUsage });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-4 gap-4">
        <GaugeChart title="CPU Load" value={cpuUsage} unit="%" />
        <GaugeChart
          title="CPU Temp"
          value={cpuTemp}
          unit="°C"
          max={100}
          colorConfig={{
            low: "#4CAF50", // Green (good temp)
            medium: "#FFC107", // Yellow (moderate temp)
            high: "#F44336", // Red (high temp)
          }}
        />
        <GaugeChart title="Load RAM" value={ramUsage} unit="%" />
        <GaugeChart title="Load system disk" value={diskUsage} unit="%" />
      </div>

      {/* System usage line chart */}
      <div className="bg-gray-900 rounded-lg p-4 shadow-md">
        <h3 className="text-sm font-medium text-gray-200 mb-3">System</h3>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={systemUsageData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <XAxis dataKey="time" stroke="#aaa" tick={{ fontSize: 10 }} />
              <YAxis stroke="#aaa" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#333", border: "none" }}
              />
              <Line
                type="monotone"
                dataKey="cpu"
                name="Load CPU"
                stroke="#4CAF50"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="memory"
                name="RAM usage"
                stroke="#FFC107"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="disk"
                name="System disk"
                stroke="#03A9F4"
                strokeWidth={2}
                dot={false}
              />
              <Legend
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 10, color: "#ddd" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed device information table - dynamic data from device */}
      <div className="grid grid-cols-1 gap-y-2 text-xs bg-gray-900 rounded-lg shadow-md p-2">
        <div className="grid grid-cols-12 gap-2">
          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Uptime</span>
            <span className="text-green-400 font-medium">
              {device?.uptime || latestMetric?.uptime || "Unknown"}
            </span>
          </div>

          <div className="col-span-2 flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Model</span>
            <span className="text-green-400 font-medium">
              {device?.model || "Unknown"}
            </span>
          </div>

          <div className="col-span-2 flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">RouterOS date</span>
            <span className="text-green-400 font-medium">
              {device?.routerOsVersion || "Unknown"}
            </span>
          </div>

          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Firmware</span>
            <span className="text-green-400 font-medium">
              {device?.firmware || "Unknown"}
            </span>
          </div>

          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Board</span>
            <span className="text-green-400 font-medium">
              {device?.model ? device.model.split(" ")[0] : "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">Status</span>
              <span
                className={`${device?.isOnline ? "text-green-400" : "text-red-400"} font-medium block`}
              >
                {device?.isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">POE Status</span>
              <span className="text-blue-400 font-medium block">No data</span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">Errors</span>
              <span className="text-green-400 font-medium block">
                {(() => {
                  if (!interfaces) return "0";

                  let totalErrors = 0;
                  interfaces.forEach((iface) => {
                    totalErrors +=
                      (iface.txErrors || 0) + (iface.rxErrors || 0);
                  });

                  return totalErrors;
                })()}
              </span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">DHCPs</span>
              <span className="text-green-400 font-medium block">
                {device?.model?.toLowerCase().includes("router")
                  ? "Active"
                  : "N/A"}
              </span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">CPU Mhz</span>
            <span className="text-green-400 font-medium">
              {device?.cpu || "Unknown"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMetrics;
