import { useQuery } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { useEffect, useState } from "react";

interface DeviceInfoProps {
  deviceId: number | null;
}

const DeviceInfo: React.FC<DeviceInfoProps> = ({ deviceId }) => {
  const [deviceData, setDeviceData] = useState<Device | null>(null);

  // Sửa endpoint để khớp với API
  const deviceEndpoint = deviceId ? `/api/devices/${deviceId}` : null;

  const { data: device, isLoading } = useQuery<Device>({
    queryKey: deviceEndpoint ? [deviceEndpoint] : ["empty-device"],
    enabled: !!deviceId,
    refetchInterval: 5000, // Refresh device info every 5 seconds
  });

  // Log dữ liệu thiết bị khi nhận được để debug
  useEffect(() => {
    if (device) {
      console.log("Device data received:", device);
      setDeviceData(device);
    }
  }, [device]);

  const formatLastSeen = (date: string | Date | null | undefined) => {
    if (!date) return "Never";

    const lastSeen = new Date(date);
    return lastSeen.toLocaleString();
  };

  return (
    <div className="bg-slate-900 rounded-lg shadow border border-slate-700 w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : deviceData ? (
        <div>
          {/* Status bar at the top */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
            <h3 className="font-medium text-white text-lg">
              Device Information
            </h3>
            <div className="flex items-center">
              <span
                className={`inline-block w-3 h-3 rounded-full mr-2 ${deviceData.isOnline ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span
                className={`font-medium ${deviceData.isOnline ? "text-green-400" : "text-red-400"}`}
              >
                {deviceData.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          {/* Top row showing uptime and last updated */}
          <div className="grid grid-cols-2 gap-3 p-3 border-b border-slate-700">
            {deviceData.uptime && (
              <div className="p-2 bg-slate-800 rounded">
                <div className="text-sm text-slate-400 mb-1">Uptime</div>
                <div className="text-sm font-medium text-green-400 overflow-hidden text-ellipsis">
                  {deviceData.uptime}
                </div>
              </div>
            )}
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-sm text-slate-400 mb-1">Last Updated</div>
              <div className="text-sm font-medium text-white overflow-hidden text-ellipsis">
                {formatLastSeen(deviceData.lastSeen)}
              </div>
            </div>
          </div>

          {/* Main info table - vertical layout */}
          <div className="p-3">
            <div className="grid grid-cols-1 gap-2">
              {/* Model */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">Model</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.model || "Chưa có thông tin"}
                </div>
              </div>

              {/* Serial Number */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">Serial Number</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.serialNumber || "Chưa có thông tin"}
                </div>
              </div>

              {/* RouterOS */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">RouterOS</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.routerOsVersion || "Chưa có thông tin"}
                </div>
              </div>

              {/* Firmware */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">Firmware</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.firmware || "Chưa có thông tin"}
                </div>
              </div>

              {/* CPU */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">CPU</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.cpu || "Chưa có thông tin"}
                </div>
              </div>

              {/* Memory */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">Memory</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.totalMemory
                    ? `${Math.round(parseInt(deviceData.totalMemory as string) / (1024 * 1024))} MB`
                    : "Chưa có thông tin"}
                </div>
              </div>

              {/* Storage */}
              <div className="bg-slate-800 rounded p-2">
                <div className="text-sm text-slate-400 mb-1">Storage</div>
                <div className="text-sm font-medium text-white">
                  {deviceData.storage || "Chưa có thông tin"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-400 text-center py-10">
          No device information available
        </div>
      )}
    </div>
  );
};

export default DeviceInfo;
