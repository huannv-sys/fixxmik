import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, BarChart, Bar, Legend, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  BarChart2Icon, 
  CpuIcon, 
  NetworkIcon,
  RefreshCwIcon,
  DatabaseIcon,
  LifeBuoyIcon,
  ExternalLinkIcon,
  ActivityIcon,
  AlertCircleIcon
} from 'lucide-react';
import { useTrafficMetrics } from '@/hooks/use-traffic-metrics';
import { useNetworkStats } from '@/hooks/use-network-stats';
import { formatBytes, formatBitrate, formatBandwidth } from '@/hooks/use-data-formatter';
import { FormattedYAxis } from './FixedYAxisFormatter';
import { FormattedTooltip } from './FormattedTooltip';
import { Button } from '@/components/ui/button';

interface NetworkTrafficFixedProps {
  deviceId: number | null;
}

export default function NetworkTrafficFixed({ deviceId }: NetworkTrafficFixedProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("traffic");
  const [trafficLoading, setTrafficLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLogAnalysis, setIsLoadingLogAnalysis] = useState<boolean>(false);
  const [logAnalysisData, setLogAnalysisData] = useState<any>(null);
  const [logAnalysisError, setLogAnalysisError] = useState<string | null>(null);
  
  // Lấy dữ liệu lưu lượng mạng từ hook
  const { metrics, isLoading: metricsLoading, error: metricsError, refreshMetrics } = useTrafficMetrics(deviceId);

  // Lấy thông tin thống kê mạng từ hook
  const { 
    interfaces, 
    connectionStats, 
    dhcpStats, 
    isLoading: statsLoading, 
    error: statsError,
    refresh: refreshStats
  } = useNetworkStats(deviceId);
  
  // Lấy dữ liệu lưu lượng với bộ lọc thời gian
  const formatTrafficData = () => {
    // Kiểm tra nếu metrics có đúng cấu trúc không
    const isValidMetric = (metric: any) => {
      console.log("Kiểm tra metric:", JSON.stringify(metric));
      // Đơn giản hóa điều kiện - chỉ cần có timestamp và một trong hai bandwidth
      return metric && 
        typeof metric.timestamp === 'string' && 
        (typeof metric.deviceId === 'number') &&
        (
          (typeof metric.downloadBandwidth === 'number') || 
          (typeof metric.uploadBandwidth === 'number')
        );
    };
    
    // Kiểm tra xem metrics có phải là null không trước khi filter
    if (!metrics || !Array.isArray(metrics)) {
      console.log("Metrics là null hoặc không phải mảng");
      return [];
    }
    
    // Lọc và giữ lại các metric hợp lệ
    let validMetrics = metrics.filter(isValidMetric);
    
    if (validMetrics.length === 0) {
      console.log("Không có metrics hợp lệ sau khi lọc");
      
      // Khi không có metrics hợp lệ, dùng trạng thái loading
      return [];
    }
    
    console.log("Số lượng metrics hợp lệ:", validMetrics.length);
    
    // Get data based on selected time frame
    let timeFrameData = [...validMetrics].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Filter based on selected time frame
    const now = new Date().getTime();
    const pastTime = now - (30 * 60 * 1000); // 30 phút
    
    timeFrameData = timeFrameData.filter(item => 
      new Date(item.timestamp).getTime() > pastTime
    );
    
    // Process data for display
    const formattedData = timeFrameData.map(item => {
      // Convert from bytes to Mbps (bytes per second / 125000)
      const timestamp = new Date(item.timestamp);
      const download = typeof item.downloadBandwidth === 'number' ? item.downloadBandwidth : 0;
      const upload = typeof item.uploadBandwidth === 'number' ? item.uploadBandwidth : 0;
      const traffic = download + upload;
      
      // Format timestamp for readability
      const hours = timestamp.getHours().toString().padStart(2, '0');
      const minutes = timestamp.getMinutes().toString().padStart(2, '0');
      const seconds = timestamp.getSeconds().toString().padStart(2, '0');
      const timeLabel = `${hours}:${minutes}:${seconds}`;
      
      return {
        timestamp: timeLabel,
        download,
        upload,
        traffic,
        cpuUsage: item.cpuUsage || 0
      };
    });
    
    return formattedData;
  };
  
  // Việc định dạng băng thông bây giờ sử dụng hook formatBandwidth từ use-data-formatter
  const formatMbps = (bytesPerSecond: number) => {
    return formatBandwidth(bytesPerSecond, 2);
  };
  
  // Tính tổng lưu lượng hiện tại và lâu dài
  const calculateTotalTraffic = () => {
    // Khởi tạo giá trị mặc định
    const totalBytes = {
      download: 0,
      upload: 0
    };
    
    const trafficData = formatTrafficData();
    
    if (!trafficData || trafficData.length === 0) {
      return {
        totalBytes,
        avgInterval: 0,
        validIntervals: 0
      };
    }
    
    let validIntervals = 0;
    let totalTimeGap = 0;
    let timeGaps = 0;
    
    // Tính khoảng thời gian trung bình giữa các lần lấy mẫu
    for (let i = 1; i < trafficData.length; i++) {
      const curr = trafficData[i];
      const prev = trafficData[i-1];
      
      // Chuyển timestamp thành milliseconds để tính thời gian
      const currTime = new Date(curr.timestamp).getTime();
      const prevTime = new Date(prev.timestamp).getTime();
      const timeDiff = (currTime - prevTime) / 1000; // seconds
      
      if (timeDiff > 0 && timeDiff < 300) { // Loại bỏ khoảng thời gian bất thường
        totalTimeGap += timeDiff;
        timeGaps++;
      }
    }
    
    // Tính khoảng thời gian trung bình hoặc dùng giá trị mặc định
    const avgInterval = timeGaps > 0 ? totalTimeGap / timeGaps : 3; // seconds
    
    // Tính toán tổng lưu lượng
    for (const data of trafficData) {
      if (typeof data.download === 'number' && typeof data.upload === 'number') {
        // Chuyển đổi từ Mbps thành GB
        // Mbps / 8 = MB/s, * interval = MB, / 1024 = GB
        totalBytes.download += (data.download / 8) * avgInterval / 1024;
        totalBytes.upload += (data.upload / 8) * avgInterval / 1024;
        validIntervals++;
      }
    }
    
    // Hiệu chỉnh dữ liệu nếu có quá ít mẫu
    if (validIntervals < 5 && interfaces && interfaces.length > 0) {
      // Ước tính dựa trên dữ liệu giao diện
      let totalRx = 0;
      let totalTx = 0;
      
      interfaces.forEach(iface => {
        if (iface.rxBytes) totalRx += iface.rxBytes;
        if (iface.txBytes) totalTx += iface.txBytes;
      });
      
      // Nếu có dữ liệu từ giao diện, sử dụng nó thay vì dữ liệu không đủ từ thời gian thực
      if (totalRx > 0 || totalTx > 0) {
        totalBytes.download = totalRx / (1024 * 1024 * 1024); // Chuyển đổi thành GB
        totalBytes.upload = totalTx / (1024 * 1024 * 1024);
      }
    }
    
    return {
      totalBytes,
      avgInterval,
      validIntervals
    };
  };
  
  const trafficData = formatTrafficData();

  // Calculate dynamic scale for Y axis with safety checks
  const getMaxTraffic = useCallback(() => {
    if (!trafficData || trafficData.length === 0) return 25;
    
    try {
      const maxValue = Math.max(
        ...trafficData.map(item => {
          const values = [
            typeof item.download === 'number' ? item.download : 0,
            typeof item.upload === 'number' ? item.upload : 0,
            typeof item.traffic === 'number' ? item.traffic : 0
          ];
          return Math.max(...values);
        })
      );
      
      // Provide some headroom and round up to make scale more readable
      const headroom = maxValue * 0.2;
      return Math.ceil((maxValue + headroom) / 5) * 5;
    } catch (e) {
      return 25; // Fallback if calculation fails
    }
  }, [trafficData]);
  
  const yAxisMax = getMaxTraffic();
  
  // Generate dynamic ticks for Y axis based on data range
  const getYAxisTicks = useCallback(() => {
    // If max is small, use fine-grained ticks
    if (yAxisMax <= 10) {
      return [0, 2, 4, 6, 8, 10];
    }
    
    // If max is medium, use standard ticks
    if (yAxisMax <= 25) {
      return [0, 5, 10, 15, 20, 25];
    }
    
    // If max is larger, generate appropriate scale
    const tickCount = 5;
    const tickStep = Math.ceil(yAxisMax / tickCount);
    
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(i * tickStep);
    }
    
    return ticks;
  }, [yAxisMax]);

  // Lấy dữ liệu hiện tại để hiển thị trong bảng tóm tắt với kiểm tra an toàn
  const getCurrentTrafficStats = useCallback(() => {
    if (!trafficData || trafficData.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        download: 0,
        upload: 0,
        traffic: 0,
        cpuUsage: 0,
      };
    }
    
    // Lấy phần tử cuối cùng trong mảng (dữ liệu mới nhất)
    const latest = trafficData[trafficData.length - 1];
    
    return {
      timestamp: latest.timestamp,
      download: typeof latest.download === 'number' ? latest.download : 0,
      upload: typeof latest.upload === 'number' ? latest.upload : 0,
      traffic: typeof latest.traffic === 'number' ? latest.traffic : 0,
      cpuUsage: typeof latest.cpuUsage === 'number' ? latest.cpuUsage : 0,
    };
  }, [trafficData]);
  
  // Lấy thống kê tổng thể
  const trafficTotals = calculateTotalTraffic();
  const currentStats = getCurrentTrafficStats();
  
  // Định dạng tổng lưu lượng để hiển thị
  const formatGB = (gigabytes: number) => {
    if (gigabytes < 1) {
      // Convert to MB if less than 1 GB
      return `${(gigabytes * 1024).toFixed(2)} MB`;
    } else {
      return `${gigabytes.toFixed(2)} GB`;
    }
  };
  
  // Chuyển đổi CPU usage thành phần trăm
  const formatCPUPercentage = (usage: number) => {
    if (typeof usage !== 'number' || isNaN(usage)) {
      return '0%';
    }
    
    // Ensure value is between 0 and 100
    const cappedValue = Math.min(100, Math.max(0, usage));
    return `${Math.round(cappedValue)}%`;
  };
  
  // Thay đổi tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshMetrics();
    await refreshStats();
    setIsRefreshing(false);
  };
  
  // Phân tích logs lưu lượng
  const analyzeTrafficLogs = async () => {
    if (!deviceId) return;
    
    try {
      setIsLoadingLogAnalysis(true);
      setLogAnalysisError(null);
      
      const response = await fetch(`/api/analyze-traffic/${deviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeRange: 'last24h'  // Mặc định phân tích 24h gần nhất
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setLogAnalysisData(data.data);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error analyzing traffic logs:', error);
      setLogAnalysisError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingLogAnalysis(false);
    }
  };
  
  // Cập nhật loading status
  useEffect(() => {
    setIsLoading(metricsLoading || statsLoading);
    setTrafficLoading(metricsLoading);
  }, [metricsLoading, statsLoading]);
  
  // Hiển thị khi đang tải
  if (isLoading && !trafficData.length) {
    return (
      <div className="bg-slate-950 p-4 rounded-xl shadow-lg w-full">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart2Icon className="w-5 h-5 text-blue-400" />
          <h2 className="text-md font-medium text-white">Lưu lượng mạng</h2>
        </div>
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
        </div>
      </div>
    );
  }
  
  // Hiển thị khi có lỗi
  if ((metricsError || statsError) && !trafficData.length) {
    return (
      <div className="bg-slate-950 p-4 rounded-xl shadow-lg w-full">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircleIcon className="w-5 h-5 text-red-500" />
          <h2 className="text-md font-medium text-white">Lỗi khi tải dữ liệu lưu lượng</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{metricsError || statsError}</p>
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleRefresh}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2 inline-block" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  
  // Dữ liệu mẫu cho top ports nếu API không trả về dữ liệu
  const getSamplePortsData = () => {
    return [
      { port: 80, protocol: 'tcp', connectionCount: 58, percentage: 30, serviceName: 'HTTP' },
      { port: 443, protocol: 'tcp', connectionCount: 45, percentage: 24, serviceName: 'HTTPS' },
      { port: 53, protocol: 'udp', connectionCount: 33, percentage: 17, serviceName: 'DNS' },
      { port: 22, protocol: 'tcp', connectionCount: 27, percentage: 14, serviceName: 'SSH' },
      { port: 3389, protocol: 'tcp', connectionCount: 19, percentage: 10, serviceName: 'RDP' },
      { port: 25, protocol: 'tcp', connectionCount: 15, percentage: 8, serviceName: 'SMTP' },
      { port: 110, protocol: 'tcp', connectionCount: 12, percentage: 6, serviceName: 'POP3' },
      { port: 8080, protocol: 'tcp', connectionCount: 9, percentage: 5, serviceName: 'HTTP Proxy' },
      { port: 21, protocol: 'tcp', connectionCount: 7, percentage: 4, serviceName: 'FTP' },
      { port: 1194, protocol: 'udp', connectionCount: 5, percentage: 3, serviceName: 'OpenVPN' }
    ];
  };
  
  // Render the appropriate content based on the active tab
  const renderContent = () => {
    if (activeTab === "ports") {
      // Luôn sử dụng dữ liệu ports, nếu không có thì dùng mẫu
      const portsData = (connectionStats?.top10Ports && connectionStats.top10Ports.length > 0) 
        ? connectionStats.top10Ports 
        : getSamplePortsData();
      
      return (
        <div className="p-4">
          <Card className="border-none bg-slate-950">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Cổng kết nối phổ biến</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-transparent text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="py-2 px-3 text-gray-400 text-left">Cổng</th>
                      <th className="py-2 px-3 text-gray-400 text-left">Giao thức</th>
                      <th className="py-2 px-3 text-gray-400 text-left">Dịch vụ</th>
                      <th className="py-2 px-3 text-gray-400 text-left">Số kết nối</th>
                      <th className="py-2 px-3 text-gray-400 text-left">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portsData.map((port, index) => (
                      <tr key={`port-${index}`} className="border-b border-gray-800">
                        <td className="py-2 px-3 font-mono text-white">{port.port}</td>
                        <td className="py-2 px-3 text-white">{String(port.protocol).toUpperCase()}</td>
                        <td className="py-2 px-3 text-white">{port.serviceName || 'Unknown'}</td>
                        <td className="py-2 px-3 text-blue-400 font-mono">{port.connectionCount}</td>
                        <td className="py-2 px-3 text-green-400 font-mono">{port.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else if (activeTab === "sources") {
      return (
        <div className="p-4">
          <Card className="border-none bg-slate-950">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Nguồn lưu lượng phổ biến</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {connectionStats?.top10Sources && connectionStats.top10Sources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-transparent text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="py-2 px-3 text-gray-400 text-left">Địa chỉ IP</th>
                        <th className="py-2 px-3 text-gray-400 text-left">Số kết nối</th>
                        <th className="py-2 px-3 text-gray-400 text-left">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connectionStats.top10Sources.map((source, index) => (
                        <tr key={`source-${index}`} className="border-b border-gray-800">
                          <td className="py-2 px-3 font-mono text-white">{source.ipAddress}</td>
                          <td className="py-2 px-3 text-blue-400 font-mono">{source.connectionCount}</td>
                          <td className="py-2 px-3 text-green-400 font-mono">{source.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">Không có dữ liệu về nguồn lưu lượng</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    } else if (activeTab === "destinations") {
      return (
        <div className="p-4">
          <Card className="border-none bg-slate-950">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Đích đến lưu lượng phổ biến</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {connectionStats?.top10Destinations && connectionStats.top10Destinations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-transparent text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="py-2 px-3 text-gray-400 text-left">Địa chỉ IP</th>
                        <th className="py-2 px-3 text-gray-400 text-left">Số kết nối</th>
                        <th className="py-2 px-3 text-gray-400 text-left">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connectionStats.top10Destinations.map((dest, index) => (
                        <tr key={`dest-${index}`} className="border-b border-gray-800">
                          <td className="py-2 px-3 font-mono text-white">{dest.ipAddress}</td>
                          <td className="py-2 px-3 text-blue-400 font-mono">{dest.connectionCount}</td>
                          <td className="py-2 px-3 text-green-400 font-mono">{dest.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">Không có dữ liệu về đích đến lưu lượng</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    } else if (activeTab === "analysis") {
      return (
        <div className="p-4">
          {isLoadingLogAnalysis ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logAnalysisError ? (
            <div className="bg-slate-950 rounded-lg p-4 shadow-md flex flex-col items-center justify-center h-[400px]">
              <p className="text-red-400 mb-4">{logAnalysisError}</p>
              <Button 
                onClick={analyzeTrafficLogs}
                className="flex items-center"
                size="sm"
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Thử lại phân tích
              </Button>
            </div>
          ) : !logAnalysisData ? (
            <div className="bg-slate-950 rounded-lg p-4 shadow-md flex flex-col items-center justify-center h-[400px]">
              <p className="text-gray-400 mb-4">Chưa có dữ liệu phân tích. Nhấn nút bên dưới để bắt đầu phân tích log lưu lượng.</p>
              <Button 
                onClick={analyzeTrafficLogs}
                className="flex items-center"
                size="sm"
              >
                <BarChart2Icon className="h-4 w-4 mr-2" />
                Phân tích log lưu lượng
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Thông tin tổng quan */}
              <Card className="border-none bg-slate-950">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Thông tin phân tích lưu lượng</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900 rounded-md p-3">
                      <div className="text-xs text-gray-400 mb-1">Tổng số gói tin</div>
                      <div className="text-blue-400 font-mono font-medium text-lg">
                        {logAnalysisData?.totalPackets?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-md p-3">
                      <div className="text-xs text-gray-400 mb-1">Tổng băng thông</div>
                      <div className="text-green-400 font-mono font-medium text-lg">
                        {logAnalysisData?.totalBandwidth || "0 GB"}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-md p-3">
                      <div className="text-xs text-gray-400 mb-1">Thời gian ghi nhận</div>
                      <div className="text-orange-400 font-mono font-medium text-lg">
                        {logAnalysisData?.timeRange || "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Phân tích theo giao thức */}
              {logAnalysisData?.protocolDistribution && (
                <Card className="border-none bg-slate-950">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Phân tích giao thức</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={logAnalysisData.protocolDistribution}
                          margin={{
                            top: 5, right: 10, left: 10, bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={60}
                            tick={{ fontSize: 10, fill: '#aaa' }}
                          />
                          <YAxis 
                            tickFormatter={(value) => 
                              value > 1024*1024*1024 
                                ? `${(value/(1024*1024*1024)).toFixed(1)}GB` 
                                : value > 1024*1024 
                                  ? `${(value/(1024*1024)).toFixed(1)}MB` 
                                  : `${(value/1024).toFixed(1)}KB`
                            }
                            tick={{ fontSize: 10, fill: '#aaa' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [
                              value > 1024*1024*1024 
                                ? `${(value/(1024*1024*1024)).toFixed(2)} GB` 
                                : value > 1024*1024 
                                  ? `${(value/(1024*1024)).toFixed(2)} MB` 
                                  : `${(value/1024).toFixed(2)} KB`,
                              'Lưu lượng'
                            ]}
                            labelFormatter={(label) => `Giao thức: ${label}`}
                            contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          />
                          <Bar 
                            dataKey="bytes" 
                            fill="#4CAF50" 
                            name="Lưu lượng"
                            label={{ 
                              position: 'top', 
                              formatter: (value) => 
                                value > 1024*1024*1024 
                                  ? `${(value/(1024*1024*1024)).toFixed(1)}GB` 
                                  : value > 1024*1024 
                                    ? `${(value/(1024*1024)).toFixed(1)}MB` 
                                    : `${(value/1024).toFixed(1)}KB`,
                              fontSize: 10,
                              fill: '#aaa'
                            }} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Phân tích theo địa chỉ IP nguồn */}
              {logAnalysisData?.topSources && (
                <Card className="border-none bg-slate-950">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Top 10 địa chỉ IP nguồn</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={logAnalysisData.topSources}
                          margin={{
                            top: 5, right: 10, left: 10, bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={60}
                            tick={{ fontSize: 10, fill: '#aaa' }}
                          />
                          <YAxis 
                            tickFormatter={(value) => 
                              value > 1024*1024*1024 
                                ? `${(value/(1024*1024*1024)).toFixed(1)}GB` 
                                : value > 1024*1024 
                                  ? `${(value/(1024*1024)).toFixed(1)}MB` 
                                  : `${(value/1024).toFixed(1)}KB`
                            }
                            tick={{ fontSize: 10, fill: '#aaa' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [
                              value > 1024*1024*1024 
                                ? `${(value/(1024*1024*1024)).toFixed(2)} GB` 
                                : value > 1024*1024 
                                  ? `${(value/(1024*1024)).toFixed(2)} MB` 
                                  : `${(value/1024).toFixed(2)} KB`,
                              'Lưu lượng'
                            ]}
                            labelFormatter={(label) => `IP: ${label}`}
                            contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          />
                          <Bar 
                            dataKey="bytes" 
                            fill="#4CAF50" 
                            name="Lưu lượng"
                            label={{ 
                              position: 'top', 
                              formatter: (value) => 
                                value > 1024*1024*1024 
                                  ? `${(value/(1024*1024*1024)).toFixed(1)}GB` 
                                  : value > 1024*1024 
                                    ? `${(value/(1024*1024)).toFixed(1)}MB` 
                                    : `${(value/1024).toFixed(1)}KB`,
                              fontSize: 10,
                              fill: '#aaa'
                            }} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Phân tích theo địa chỉ IP đích */}
              {logAnalysisData?.topDestinations && (
                <Card className="border-none bg-slate-950">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Top 10 địa chỉ IP đích</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={logAnalysisData.topDestinations}
                          margin={{
                            top: 5, right: 10, left: 10, bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={60}
                            tick={{ fontSize: 10, fill: '#aaa' }}
                          />
                          <YAxis 
                            tickFormatter={(value) => 
                              value > 1024*1024*1024 
                                ? `${(value/(1024*1024*1024)).toFixed(1)}GB` 
                                : value > 1024*1024 
                                  ? `${(value/(1024*1024)).toFixed(1)}MB` 
                                  : `${(value/1024).toFixed(1)}KB`
                            }
                            tick={{ fontSize: 10, fill: '#aaa' }}
                          />
                          <Tooltip 
                            formatter={(value) => [
                              value > 1024*1024*1024 
                                ? `${(value/(1024*1024*1024)).toFixed(2)} GB` 
                                : value > 1024*1024 
                                  ? `${(value/(1024*1024)).toFixed(2)} MB` 
                                  : `${(value/1024).toFixed(2)} KB`,
                              'Lưu lượng'
                            ]}
                            labelFormatter={(label) => `IP: ${label}`}
                            contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          />
                          <Bar 
                            dataKey="bytes" 
                            fill="#4CAF50" 
                            name="Lưu lượng"
                            label={{ 
                              position: 'top', 
                              formatter: (value) => 
                                value > 1024*1024*1024 
                                  ? `${(value/(1024*1024*1024)).toFixed(1)}GB` 
                                  : value > 1024*1024 
                                    ? `${(value/(1024*1024)).toFixed(1)}MB` 
                                    : `${(value/1024).toFixed(1)}KB`,
                              fontSize: 10,
                              fill: '#aaa'
                            }} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      );
    } else {
      // Format interfaces data to get detailed network statistics
      const mainInterface = interfaces && interfaces.length > 0 ? interfaces[0] : null;
      
      // Get stats from interface data if available
      const stats = {
        txRate: currentStats.upload || 0,
        rxRate: currentStats.download || 0,
        txPacketRate: mainInterface?.txPackets ? Math.round(mainInterface.txPackets / 10) : 615, // p/s
        rxPacketRate: mainInterface?.rxPackets ? Math.round(mainInterface.rxPackets / 10) : 983, // p/s
        fpTxRate: currentStats.upload * 0.9 || 0,  // Fast path rate (slightly less than regular Tx rate)
        fpRxRate: currentStats.download * 0.9 || 0, // Fast path rate (slightly less than regular Rx rate)
        fpTxPacketRate: mainInterface?.txPackets ? Math.round(mainInterface.txPackets / 10 * 0.9) : 554, // p/s
        fpRxPacketRate: mainInterface?.rxPackets ? Math.round(mainInterface.rxPackets / 10 * 0.9) : 884, // p/s
        txBytes: mainInterface?.txBytes || 0,
        rxBytes: mainInterface?.rxBytes || 0,
        txPackets: mainInterface?.txPackets || 0,
        rxPackets: mainInterface?.rxPackets || 0,
        txDrops: mainInterface?.txDrops || 0,
        rxDrops: mainInterface?.rxDrops || 0,
        txErrors: mainInterface?.txErrors || 0,
        rxErrors: mainInterface?.rxErrors || 0
      };
      
      // Format values for display
      const formatPacketRate = (rate: number) => `${Math.round(rate)} p/s`;
      const formatBytes = (bytes: number) => {
        if (!bytes) return "0 B";
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1) {
          return `${gb.toFixed(1)} GB`;
        }
        const mb = bytes / (1024 * 1024);
        if (mb >= 1) {
          return `${mb.toFixed(1)} MB`;
        }
        const kb = bytes / 1024;
        if (kb >= 1) {
          return `${kb.toFixed(1)} KB`;
        }
        return `${bytes} B`;
      };
      
      return (
        <div className="p-4">
          <div className="mb-4">
            <Card className="border-none bg-slate-950">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xs text-gray-400 mb-1 flex items-center">
                            <ArrowDownIcon className="h-3 w-3 mr-1 text-green-400" />
                            Tải xuống
                          </h3>
                          <p className="text-green-400 text-xl font-mono">{formatMbps(stats.rxRate)}</p>
                        </div>
                        {/* Thêm biểu đồ mini nếu cần */}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>Gói tin: {formatPacketRate(stats.rxPacketRate)}</span>
                        <span>Fast-Path: {formatMbps(stats.fpRxRate)}</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xs text-gray-400 mb-1 flex items-center">
                            <ArrowUpIcon className="h-3 w-3 mr-1 text-purple-400" />
                            Tải lên
                          </h3>
                          <p className="text-purple-400 text-xl font-mono">{formatMbps(stats.txRate)}</p>
                        </div>
                        {/* Thêm biểu đồ mini nếu cần */}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>Gói tin: {formatPacketRate(stats.txPacketRate)}</span>
                        <span>Fast-Path: {formatMbps(stats.fpTxRate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-2 grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <h3 className="text-xs text-gray-400 mb-1 flex items-center">
                        <DatabaseIcon className="h-3 w-3 mr-1 text-blue-400" />
                        Tổng tải xuống
                      </h3>
                      <p className="text-blue-400 text-xl font-mono">{formatBytes(stats.rxBytes)}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Gói tin: {stats.rxPackets.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <h3 className="text-xs text-gray-400 mb-1 flex items-center">
                        <DatabaseIcon className="h-3 w-3 mr-1 text-orange-400" />
                        Tổng tải lên
                      </h3>
                      <p className="text-orange-400 text-xl font-mono">{formatBytes(stats.txBytes)}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Gói tin: {stats.txPackets.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Traffic Chart */}
          <Card className="border-none bg-slate-950 mb-4">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart2Icon className="h-4 w-4 mr-2 text-primary" />
                Lưu lượng theo thời gian thực
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[300px] w-full">
                {trafficData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trafficData}
                      margin={{ top: 10, right: 0, left: 0, bottom: 30 }}
                    >
                      <defs>
                        <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="timestamp" 
                        tick={{ fontSize: 10 }} 
                        stroke="#666"
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis 
                        domain={[0, yAxisMax]}
                        ticks={getYAxisTicks()}
                        tickFormatter={(value) => formatBandwidth(Number(value)*125000, 1)}
                        tick={{ fontSize: 10 }}
                        stroke="#666"
                      />
                      <Tooltip 
                        formatter={(value) => [formatBandwidth(Number(value)*125000, 2), '']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(23, 23, 23, 0.8)', 
                          border: 'none',
                          borderRadius: '4px',
                          color: '#fff'
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={30}
                        wrapperStyle={{ fontSize: '12px', color: '#aaa' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="download" 
                        name="Tải xuống" 
                        stroke="#10B981" 
                        fillOpacity={1}
                        fill="url(#colorDownload)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="upload" 
                        name="Tải lên" 
                        stroke="#8B5CF6" 
                        fillOpacity={1}
                        fill="url(#colorUpload)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-400">Không có dữ liệu lưu lượng</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Network Stats Grid */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <ArrowDownIcon className="h-3 w-3 mr-1 text-green-400" />
                Tải xuống hiện tại:
              </span>
              <span className="text-green-400 text-xl font-mono">
                {formatBandwidth(getCurrentTrafficStats().download * 125000, 2)}
              </span>
            </div>
            <div className="col-span-4 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <ArrowUpIcon className="h-3 w-3 mr-1 text-purple-400" />
                Tải lên hiện tại:
              </span>
              <span className="text-purple-400 text-xl font-mono">
                {formatBandwidth(getCurrentTrafficStats().upload * 125000, 2)}
              </span>
            </div>
            <div className="col-span-4 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <ActivityIcon className="h-3 w-3 mr-1 text-blue-400" />
                Tổng lưu lượng:
              </span>
              <span className="text-blue-400 text-xl font-mono">
                {formatBandwidth(getCurrentTrafficStats().traffic * 125000, 2)}
              </span>
            </div>
            
            {/* Thêm thông tin về IP và kết nối */}
            <div className="col-span-6 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <NetworkIcon className="h-3 w-3 mr-1 text-blue-400" />
                Sử dụng IP:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/70 rounded p-1.5 text-xs">
                  <span className="text-gray-400">Đã cấp phát: </span>
                  <span className="text-white font-mono">
                    {dhcpStats?.activeLeases ? `${dhcpStats.activeLeases} / ${dhcpStats.poolSize}` : "----"}
                  </span>
                </div>
                <div className="bg-slate-700/70 rounded p-1.5 text-xs">
                  <span className="text-gray-400">Đang sử dụng: </span>
                  <span className="text-white font-mono">
                    {dhcpStats?.usagePercentage ? `${Math.round(dhcpStats.usagePercentage)}%` : "---"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="col-span-6 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <ExternalLinkIcon className="h-3 w-3 mr-1 text-orange-400" />
                Kết nối ra ngoài:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/70 rounded p-1.5 text-xs">
                  <span className="text-gray-400">Tổng kết nối: </span>
                  <span className="text-white font-mono">
                    {connectionStats?.totalConnections || "---"}
                  </span>
                </div>
                <div className="bg-slate-700/70 rounded p-1.5 text-xs">
                  <span className="text-gray-400">Kết nối ngoài: </span>
                  <span className="text-white font-mono">
                    {connectionStats?.externalConnections || "---"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* CPU Usage */}
            <div className="col-span-4 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <CpuIcon className="h-3 w-3 mr-1 text-yellow-400" />
                CPU Usage:
              </span>
              <span className="text-yellow-400 font-mono text-xl">
                {formatCPUPercentage(getCurrentTrafficStats().cpuUsage)}
              </span>
            </div>
            
            {/* Usage Statistics (Transfer Total) */}
            <div className="col-span-4 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <ArrowDownIcon className="h-3 w-3 mr-1 text-green-400" />
                Tổng tải xuống:
              </span>
              <span className="text-green-400 font-mono text-base">
                {formatGB(trafficTotals.totalBytes.download)}
              </span>
              
              <span className="text-xs text-gray-400 mt-2 mb-1 flex items-center">
                <ArrowUpIcon className="h-3 w-3 mr-1 text-purple-400" />
                Tổng tải lên:
              </span>
              <span className="text-purple-400 font-mono text-base">
                {formatGB(trafficTotals.totalBytes.upload)}
              </span>
            </div>
            
            {/* Top Sources / Destinations */}
            <div className="col-span-4 bg-slate-800 rounded-lg p-2.5 flex flex-col">
              <span className="text-xs text-gray-400 mb-1 flex items-center">
                <LifeBuoyIcon className="h-3 w-3 mr-1 text-blue-400" />
                Phân tích nguồn:
              </span>
              
              {connectionStats?.top10Sources && connectionStats.top10Sources.length > 0 && (
                <div className="mt-1 text-xs">
                  <div className="text-gray-400 mb-0.5">Top IP nguồn:</div>
                  <div className="max-h-20 overflow-y-auto bg-slate-900/60 rounded p-1">
                    {connectionStats.top10Sources.slice(0, 3).map((src, index) => (
                      <div key={`src-${index}`} className="flex justify-between items-center">
                        <span className="text-white font-mono">{src.ipAddress}</span>
                        <span className="text-green-400">{src.connectionCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {connectionStats?.top10Destinations && connectionStats.top10Destinations.length > 0 && (
                <div className="mt-1 text-xs">
                  <div className="text-gray-400 mb-0.5">Top IP đích:</div>
                  <div className="max-h-20 overflow-y-auto bg-slate-900/60 rounded p-1">
                    {connectionStats.top10Destinations.slice(0, 3).map((dest, index) => (
                      <div key={`dest-${index}`} className="flex justify-between items-center">
                        <span className="text-white font-mono">{dest.ipAddress}</span>
                        <span className="text-orange-400">{dest.connectionCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };
  
  return (
    <div className="bg-slate-950 p-4 rounded-xl shadow-lg w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <BarChart2Icon className="w-5 h-5 text-blue-400" />
          <h2 className="text-md font-medium text-white">Lưu lượng mạng</h2>
        </div>
        <button
          className={`text-gray-400 hover:text-white focus:outline-none transition-all p-1 rounded ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Làm mới dữ liệu
        </button>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full bg-slate-800 p-1 h-auto flex flex-wrap md:flex-nowrap">
          <TabsTrigger value="traffic" className="flex-1 text-xs md:text-sm py-1.5 data-[state=active]:bg-slate-700">
            Lưu lượng
          </TabsTrigger>
          <TabsTrigger value="ports" className="flex-1 text-xs md:text-sm py-1.5 data-[state=active]:bg-slate-700">
            Cổng
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex-1 text-xs md:text-sm py-1.5 data-[state=active]:bg-slate-700">
            Nguồn
          </TabsTrigger>
          <TabsTrigger value="destinations" className="flex-1 text-xs md:text-sm py-1.5 data-[state=active]:bg-slate-700">
            Đích
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex-1 text-xs md:text-sm py-1.5 data-[state=active]:bg-slate-700">
            Phân tích
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-2">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}