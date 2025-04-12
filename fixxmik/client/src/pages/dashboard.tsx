import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { ChevronDown, Search } from "lucide-react";

import SummaryCards from "@/components/dashboard/SummaryCards";
import CPUMemoryChart from "@/components/dashboard/CPUMemoryChart";
import NetworkTrafficChart from "@/components/dashboard/NetworkTrafficChart";
import NetworkTrafficFixed from "@/components/dashboard/NetworkTrafficFixed";
import InterfaceStatus from "@/components/dashboard/InterfaceStatus";
import InterfaceTable from "@/components/dashboard/InterfaceTable";
import DeviceInfo from "@/components/dashboard/DeviceInfo";
import ActiveAlerts from "@/components/dashboard/ActiveAlerts";
import SystemMetrics from "@/components/dashboard/SystemMetrics";
import DeviceLogs from "@/components/dashboard/DeviceLogs";
// import DeviceInfoTest from "@/components/dashboard/DeviceInfoTest"; // Đã ẩn component này

// Chế độ xem dashboard
type ViewMode = "basic" | "advanced" | "multi";

const Dashboard = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("basic");
  const [deviceSelectorOpen, setDeviceSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deviceSelectorRef = useRef<HTMLDivElement>(null);

  // Theo dõi click ngoài device selector để đóng nó
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".device-selector") && deviceSelectorOpen) {
        setDeviceSelectorOpen(false);
      }
      if (!target.closest(".view-mode-switcher")) {
        // Nếu click ngoài view mode switcher, không làm gì cả
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [deviceSelectorOpen]);

  // Lấy danh sách thiết bị từ API
  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 60000, // Refresh danh sách thiết bị mỗi 60 giây
  });

  // Lọc danh sách thiết bị theo từ khóa tìm kiếm
  const filteredDevices = devices?.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.includes(searchQuery),
  );

  // Đọc tham số thiết bị từ URL và thiết lập thiết bị được chọn
  useEffect(() => {
    // Đọc device id từ URL search params
    const params = new URLSearchParams(window.location.search);
    const deviceIdFromUrl = params.get("device");

    if (deviceIdFromUrl && devices) {
      // Kiểm tra thiết bị tồn tại trong danh sách
      const deviceId = parseInt(deviceIdFromUrl, 10);
      const deviceExists = devices.some((device) => device.id === deviceId);

      if (deviceExists) {
        setSelectedDeviceId(deviceId);
      } else if (devices.length > 0) {
        // Nếu thiết bị không tồn tại, chọn thiết bị đầu tiên
        setSelectedDeviceId(devices[0].id);
      }
    } else if (devices && devices.length > 0 && !selectedDeviceId) {
      // Nếu không có tham số thiết bị, chọn thiết bị đầu tiên
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // Tìm thiết bị được chọn hiện tại
  const selectedDevice = devices?.find(
    (device) => device.id === selectedDeviceId,
  );

  return (
    <div className="space-y-6">
      {/* Header với bộ chọn thiết bị và chế độ xem */}
      <div className="flex flex-wrap justify-between items-center mb-2 gap-3">
        {/* Device Selector */}
        <div className="device-selector relative" ref={deviceSelectorRef}>
          <div
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 transition-colors p-2 rounded-md cursor-pointer border border-gray-700"
            onClick={() => setDeviceSelectorOpen(!deviceSelectorOpen)}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                {selectedDevice ? selectedDevice.name : "Chọn thiết bị"}
              </span>
              <span className="text-xs text-gray-400">
                {selectedDevice
                  ? selectedDevice.ipAddress
                  : "Không có thiết bị nào"}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transform transition-transform ${deviceSelectorOpen ? "rotate-180" : ""}`}
            />
          </div>

          {deviceSelectorOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-30">
              <div className="p-2 border-b border-gray-700">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2 top-2.5 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Tìm thiết bị..."
                    className="w-full bg-gray-900 text-white text-sm rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {devicesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </div>
                ) : filteredDevices && filteredDevices.length > 0 ? (
                  <div className="py-1">
                    {filteredDevices.map((device) => (
                      <div
                        key={device.id}
                        className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-700 ${device.id === selectedDeviceId ? "bg-gray-700" : ""}`}
                        onClick={() => {
                          setSelectedDeviceId(device.id);
                          setDeviceSelectorOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm text-white">
                            {device.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {device.ipAddress}
                          </span>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${device.isOnline ? "bg-green-500" : "bg-red-500"}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-gray-400 text-sm">
                    {searchQuery
                      ? "Không tìm thấy thiết bị"
                      : "Chưa có thiết bị nào"}
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-gray-700">
                <button
                  className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded-sm transition-colors"
                  onClick={() => {
                    setViewMode("multi");
                    setDeviceSelectorOpen(false);
                  }}
                >
                  Xem tất cả thiết bị
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="view-mode-switcher inline-flex items-center rounded-md bg-gray-900 p-1">
          <button
            onClick={() => setViewMode("basic")}
            className={`px-3 py-1 text-sm rounded-md ${viewMode === "basic" ? "bg-gray-700 text-white" : "text-gray-300"}`}
          >
            Basic View
          </button>
          <button
            onClick={() => setViewMode("advanced")}
            className={`px-3 py-1 text-sm rounded-md ${viewMode === "advanced" ? "bg-gray-700 text-white" : "text-gray-300"}`}
          >
            Advanced View
          </button>
          <button
            onClick={() => setViewMode("multi")}
            className={`px-3 py-1 text-sm rounded-md ${viewMode === "multi" ? "bg-gray-700 text-white" : "text-gray-300"}`}
          >
            Multi Device
          </button>
        </div>
      </div>

      {viewMode === "basic" ? (
        /* Basic View - Xem chi tiết một thiết bị */
        <>
          {/* Summary Cards */}
          <SummaryCards deviceId={selectedDeviceId} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CPUMemoryChart deviceId={selectedDeviceId} />
            <NetworkTrafficChart deviceId={selectedDeviceId} />
          </div>

          {/* Bottom Row - Đã sắp xếp lại theo chiều dọc */}
          <div className="grid grid-cols-1 gap-6">
            <InterfaceStatus deviceId={selectedDeviceId} />
            <DeviceInfo deviceId={selectedDeviceId} />
          </div>
        </>
      ) : viewMode === "advanced" ? (
        /* Advanced View - Xem nâng cao một thiết bị */
        <>
          {/* DeviceInfoTest Component đã bị ẩn theo yêu cầu */}

          {/* System Metrics (Gauges and Line Chart) */}
          <SystemMetrics deviceId={selectedDeviceId} />

          {/* Network Traffic Fixed Chart */}
          <NetworkTrafficFixed deviceId={selectedDeviceId} />

          {/* Interfaces Table */}
          <InterfaceTable deviceId={selectedDeviceId} />

          {/* Device Info */}
          <div className="grid grid-cols-1 gap-6">
            <DeviceInfo deviceId={selectedDeviceId} />
          </div>

          {/* Device Logs */}
          <DeviceLogs deviceId={selectedDeviceId || 0} />
        </>
      ) : (
        /* Multi Device View - Xem nhiều thiết bị cùng lúc */
        <>
          {/* Dashboard tổng quan nhiều thiết bị */}
          <div className="grid grid-cols-1 gap-6">
            {/* Bảng trạng thái thiết bị */}
            <div className="bg-gray-800 rounded-lg shadow p-4 border border-gray-700">
              <h2 className="text-lg font-medium text-white mb-4">
                Trạng thái thiết bị
              </h2>

              {devicesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : devices && devices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          Thiết bị
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          Địa chỉ IP
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          Trạng thái
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          CPU
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          RAM
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          Cảnh báo
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {devices.map((device) => (
                        <tr
                          key={device.id}
                          className="hover:bg-gray-700 cursor-pointer"
                          onClick={() => {
                            setSelectedDeviceId(device.id);
                            setViewMode("advanced");
                          }}
                        >
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-2">
                                <div className="text-sm font-medium text-white">
                                  {device.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {device.model || "Unknown"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {device.ipAddress}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${device.isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              {device.isOnline ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">
                              <div className="w-16 bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: "0%" }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">
                              <div className="w-16 bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{ width: "0%" }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              0
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-500 hover:text-blue-400 mr-3">
                              Xem
                            </button>
                            <button className="text-red-500 hover:text-red-400">
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    Chưa có thiết bị nào. Vui lòng thêm thiết bị trước.
                  </p>
                </div>
              )}
            </div>

            {/* Biểu đồ sử dụng mạng và cảnh báo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Biểu đồ sử dụng mạng tổng quan */}
              <div className="bg-gray-800 rounded-lg shadow p-4 border border-gray-700">
                <h2 className="text-lg font-medium text-white mb-4">
                  Sử dụng mạng tổng quan
                </h2>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">
                    Biểu đồ tổng hợp lưu lượng mạng từ tất cả thiết bị
                  </div>
                </div>
              </div>

              {/* Cảnh báo từ tất cả thiết bị */}
              <div className="bg-gray-800 rounded-lg shadow p-4 border border-gray-700">
                <h2 className="text-lg font-medium text-white mb-4">
                  Cảnh báo hệ thống
                </h2>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="text-gray-400 text-sm">
                    Không có cảnh báo nào
                  </div>
                </div>
              </div>
            </div>

            {/* Hiệu suất thiết bị */}
            <div className="bg-gray-800 rounded-lg shadow p-4 border border-gray-700">
              <h2 className="text-lg font-medium text-white mb-4">
                Hiệu suất thiết bị
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {devices?.map((device) => (
                  <div key={device.id} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-sm font-medium text-white">
                        {device.name}
                      </h3>
                      <div
                        className={`w-2 h-2 rounded-full ${device.isOnline ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">CPU</span>
                        <span className="text-xs text-white">0%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: "0%" }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">RAM</span>
                        <span className="text-xs text-white">0%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-green-500 h-1 rounded-full"
                          style={{ width: "0%" }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Disk</span>
                        <span className="text-xs text-white">0%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-yellow-500 h-1 rounded-full"
                          style={{ width: "0%" }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-gray-400">
                          Up: 0 Mbps
                        </span>
                        <span className="text-xs text-gray-400">
                          Down: 0 Mbps
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
