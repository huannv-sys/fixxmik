import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart, 
  Pie,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import IDSAnalysisPanel from "./IDSAnalysisPanel";
import { formatBytes, formatBytesPerSecond, formatByteValue, formatUnit } from "@/lib/formatters";

// Sample data color array
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface TrafficVisualizationsProps {
  deviceId: number;
  startDate?: string;
  endDate?: string;
  refreshInterval?: number;
}

interface TrafficDataPoint {
  timestamp: string;
  download: string;
  upload: string;
  total: string;
  rawDownload: number;
  rawUpload: number;
  rawTotal: number;
}

interface Protocol {
  name: string;
  value: number;
  percent: number;
}

interface SourceIP {
  ip: string;
  count: number;
  bytes: number;
}

interface AnomalyData {
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  probability: number;
  anomaly_type: string;
}

interface InterfaceStats {
  name: string;
  txBytes: number;
  rxBytes: number;
  totalBytes: number;
  percentage: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
}

export default function TrafficVisualizations({
  deviceId,
  startDate,
  endDate,
  refreshInterval = 60000, // Default refresh interval: 1 minute
}: TrafficVisualizationsProps) {
  const [activeTab, setActiveTab] = useState("bandwidth");
  const [timeRange, setTimeRange] = useState<"hour" | "day" | "week" | "month">("hour");

  // Create API endpoint with query parameters
  const trafficEndpoint = `/api/devices/${deviceId}/traffic?timeRange=${timeRange}${
    startDate ? `&startDate=${startDate}` : ""
  }${endDate ? `&endDate=${endDate}` : ""}`;

  const protocolsEndpoint = `/api/devices/${deviceId}/protocols?timeRange=${timeRange}${
    startDate ? `&startDate=${startDate}` : ""
  }${endDate ? `&endDate=${endDate}` : ""}`;

  const sourcesEndpoint = `/api/devices/${deviceId}/sources?timeRange=${timeRange}${
    startDate ? `&startDate=${startDate}` : ""
  }${endDate ? `&endDate=${endDate}` : ""}`;

  const interfaceStatsEndpoint = `/api/devices/${deviceId}/interface-stats?timeRange=${timeRange}${
    startDate ? `&startDate=${startDate}` : ""
  }${endDate ? `&endDate=${endDate}` : ""}`;

  // Fetch traffic data
  const { data: trafficData, isLoading: trafficLoading } = useQuery<ApiResponse<any>>({
    queryKey: [trafficEndpoint],
    refetchInterval: refreshInterval,
  });

  // Fetch protocol data
  const { data: protocolData, isLoading: protocolLoading } = useQuery<ApiResponse<any>>({
    queryKey: [protocolsEndpoint],
    refetchInterval: refreshInterval,
  });

  // Fetch source IP data
  const { data: sourceData, isLoading: sourceLoading } = useQuery<ApiResponse<any>>({
    queryKey: [sourcesEndpoint],
    refetchInterval: refreshInterval,
  });

  // Fetch interface stats
  const { data: interfaceStatsData, isLoading: interfaceStatsLoading } = useQuery<ApiResponse<any>>({
    queryKey: [interfaceStatsEndpoint],
    refetchInterval: refreshInterval,
  });

  // Fetch anomaly data
  const { data: anomalyData, isLoading: anomalyLoading } = useQuery<ApiResponse<any>>({
    queryKey: ['/api/security/anomalies', {startTime: startDate, endTime: endDate}],
    refetchInterval: refreshInterval,
  });

  // Format the bandwidth data for visualization
  const formatBandwidthData = (): TrafficDataPoint[] => {
    if (!trafficData?.data) return [];
    
    return trafficData.data.map((item: any) => {
      const downloadBytes = item.download || 0;
      const uploadBytes = item.upload || 0;
      const totalBytes = downloadBytes + uploadBytes;
      
      // Sửa lỗi: Chuyển đổi đúng byte sang MB sử dụng hệ số 1024*1024 thay vì 1000000
      const downloadMB = parseFloat((downloadBytes / (1024 * 1024)).toFixed(2));
      const uploadMB = parseFloat((uploadBytes / (1024 * 1024)).toFixed(2));
      const totalMB = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
      
      return {
        timestamp: new Date(item.timestamp).toLocaleTimeString(),
        download: downloadMB.toString(),
        upload: uploadMB.toString(),
        total: totalMB.toString(),
        rawDownload: downloadBytes,
        rawUpload: uploadBytes,
        rawTotal: totalBytes
      };
    });
  };

  // Format protocol data for visualization
  const formatProtocolData = (): Protocol[] => {
    if (!protocolData?.data) return [];
    
    return protocolData.data.map((item: any) => ({
      name: item.protocol,
      value: item.count,
      percent: item.percentage,
    }));
  };

  // Format source IP data for visualization
  const formatSourceData = (): SourceIP[] => {
    if (!sourceData?.data) return [];
    
    return sourceData.data.map((item: any) => ({
      ip: item.ip,
      count: item.connections,
      bytes: item.bytes,
    }));
  };

  // Format anomaly data for visualization
  const formatAnomalyData = (): AnomalyData[] => {
    if (!anomalyData?.data) return [];
    
    return anomalyData.data.map((item: any) => ({
      timestamp: new Date(item.timestamp).toLocaleString(),
      source_ip: item.details?.sourceIp || "Unknown",
      destination_ip: item.details?.destinationIp || "Unknown",
      probability: item.probability,
      anomaly_type: item.details?.anomalyType || "Unknown",
    }));
  };
  
  // Format interface statistics data
  const formatInterfaceStats = (): InterfaceStats[] => {
    if (!interfaceStatsData?.data) return [];
    
    return interfaceStatsData.data.map((item: any) => ({
      name: item.name,
      txBytes: item.txBytes,
      rxBytes: item.rxBytes,
      totalBytes: item.totalBytes,
      percentage: item.percentage
    }));
  };

  // Handle time range change
  const handleTimeRangeChange = (range: "hour" | "day" | "week" | "month") => {
    setTimeRange(range);
  };

  // Calculate summary statistics
  const getStatistics = () => {
    if (!trafficData?.data) {
      return {
        totalDownload: '0.00',
        totalUpload: '0.00',
        totalDownloadFormatted: formatBytes(0),
        totalUploadFormatted: formatBytes(0),
        peakDownload: '0.00',
        peakUpload: '0.00',
        peakDownloadFormatted: formatBytesPerSecond(0),
        peakUploadFormatted: formatBytesPerSecond(0),
        avgDownload: '0.00',
        avgUpload: '0.00',
        avgDownloadFormatted: formatBytesPerSecond(0),
        avgUploadFormatted: formatBytesPerSecond(0),
      };
    }

    const data = trafficData.data;
    let totalDownload = 0;
    let totalUpload = 0;
    let peakDownload = 0;
    let peakUpload = 0;

    data.forEach((item: any) => {
      totalDownload += item.download || 0;
      totalUpload += item.upload || 0;
      
      // Giới hạn giá trị tối đa của peakDownload và peakUpload để tránh hiển thị giá trị không thực tế
      // 1073741824 bytes = 1 GB/s (~8 Gbps) là giới hạn hợp lý cho mạng gia đình/văn phòng nhỏ
      const reasonableMaxBytes = 1073741824; // 1 GB/s
      const downloadBytes = Math.min(reasonableMaxBytes, item.download || 0);
      const uploadBytes = Math.min(reasonableMaxBytes, item.upload || 0);
      
      peakDownload = Math.max(peakDownload, downloadBytes);
      peakUpload = Math.max(peakUpload, uploadBytes);
    });
    
    const avgDownload = totalDownload / data.length;
    const avgUpload = totalUpload / data.length;

    return {
      totalDownload,
      totalUpload,
      totalDownloadFormatted: formatBytes(totalDownload),
      totalUploadFormatted: formatBytes(totalUpload),
      peakDownload,
      peakUpload,
      peakDownloadFormatted: formatBytesPerSecond(peakDownload),
      peakUploadFormatted: formatBytesPerSecond(peakUpload),
      avgDownload,
      avgUpload,
      avgDownloadFormatted: formatBytesPerSecond(avgDownload),
      avgUploadFormatted: formatBytesPerSecond(avgUpload),
    };
  };

  const stats = getStatistics();

  // Get the anomaly detection count and latest anomalies
  const getAnomalyStats = () => {
    if (!anomalyData?.data) {
      return {
        count: 0,
        latestAnomalies: [],
      };
    }

    const sortedAnomalies = [...anomalyData.data].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      count: anomalyData.data.length,
      latestAnomalies: sortedAnomalies.slice(0, 5),
    };
  };

  const anomalyStats = getAnomalyStats();

  // Helper function for API requests
  const apiRequest = async (url: string, options = {}) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      
      return await response.json();
    } catch (error) {
      console.error("API request error:", error);
      return { success: false, message: 'API request failed' };
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="bandwidth">Băng Thông</TabsTrigger>
          <TabsTrigger value="protocols">Giao Thức</TabsTrigger>
          <TabsTrigger value="source">Nguồn & Đích</TabsTrigger>
          <TabsTrigger value="anomalies">Phát Hiện Xâm Nhập</TabsTrigger>
        </TabsList>

        {/* Time Range Selector */}
        <div className="flex justify-end mt-4 space-x-2">
          <Button 
            variant={timeRange === "hour" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => handleTimeRangeChange("hour")}
          >
            1 Giờ
          </Button>
          <Button 
            variant={timeRange === "day" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => handleTimeRangeChange("day")}
          >
            1 Ngày
          </Button>
          <Button 
            variant={timeRange === "week" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => handleTimeRangeChange("week")}
          >
            1 Tuần
          </Button>
          <Button 
            variant={timeRange === "month" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => handleTimeRangeChange("month")}
          >
            1 Tháng
          </Button>
        </div>

        {/* Bandwidth Tab */}
        <TabsContent value="bandwidth">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalDownloadFormatted}</div>
                <p className="text-sm text-gray-500">Tổng tải xuống</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalUploadFormatted}</div>
                <p className="text-sm text-gray-500">Tổng tải lên</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.peakDownloadFormatted}</div>
                <p className="text-sm text-gray-500">Tốc độ tải xuống cao nhất</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.peakUploadFormatted}</div>
                <p className="text-sm text-gray-500">Tốc độ tải lên cao nhất</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Băng Thông Theo Thời Gian</CardTitle>
                <CardDescription>Lưu lượng tải lên và tải xuống (MB/s)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={formatBandwidthData()}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        return [`${value} MB/s`, name === "download" ? "Tải xuống" : name === "upload" ? "Tải lên" : "Tổng"];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="download"
                      stackId="1"
                      stroke="#0088FE"
                      fill="#0088FE"
                      name="Tải xuống (MB/s)"
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      stackId="1"
                      stroke="#00C49F"
                      fill="#00C49F"
                      name="Tải lên (MB/s)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Thống Kê Giao Diện Mạng</CardTitle>
                <CardDescription>Lưu lượng theo giao diện (dữ liệu thực từ thiết bị)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={formatInterfaceStats()}
                      cx="50%"
                      cy="50%"
                      outerRadius={125}
                      fill="#8884d8"
                      dataKey="totalBytes"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {formatInterfaceStats().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatBytes(Number(value)), 'Lưu lượng']} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lưu Lượng Giao Diện</CardTitle>
                <CardDescription>Dữ liệu đã gửi và nhận theo giao diện</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={formatInterfaceStats().map(item => ({
                      ...item,
                      name: item.name,
                      rxFormatted: formatBytes(item.rxBytes),
                      txFormatted: formatBytes(item.txBytes),
                      rxBytes: item.rxBytes,
                      txBytes: item.txBytes
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => {
                      if (name === "rxBytes") return [formatBytes(Number(value)), 'Dữ liệu nhận'];
                      if (name === "txBytes") return [formatBytes(Number(value)), 'Dữ liệu gửi'];
                      return [value, name];
                    }} />
                    <Legend />
                    <Bar
                      dataKey="rxBytes"
                      name="Dữ liệu nhận"
                      fill="#0088FE"
                    />
                    <Bar
                      dataKey="txBytes"
                      name="Dữ liệu gửi"
                      fill="#00C49F"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân Bố Giao Thức</CardTitle>
                <CardDescription>Tỷ lệ sử dụng của các giao thức</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={formatProtocolData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={125}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {formatProtocolData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} kết nối`, props.payload.name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Số Kết Nối Theo Giao Thức</CardTitle>
                <CardDescription>Tổng số kết nối cho mỗi giao thức</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={formatProtocolData()}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} kết nối`, 'Số kết nối']} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name="Số kết nối"
                      fill="#8884d8"
                    >
                      {formatProtocolData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="source">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Địa Chỉ IP Nguồn</CardTitle>
                <CardDescription>Địa chỉ IP với số lượng kết nối cao nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={formatSourceData().slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 50, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="ip" />
                    <Tooltip formatter={(value, name) => [`${value}`, name === 'count' ? 'Kết nối' : 'Bytes']} />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Số kết nối"
                      fill="#0088FE"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lưu Lượng Theo IP</CardTitle>
                <CardDescription>Dung lượng dữ liệu theo IP</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={formatSourceData().slice(0, 10).map(item => ({
                      ...item,
                      ip: item.ip,
                      bytesFormatted: formatBytes(item.bytes),
                      bytes: item.bytes
                    }))}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 50, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="ip" />
                    <Tooltip formatter={(value) => [formatBytes(Number(value)), 'Dung lượng']} />
                    <Legend />
                    <Bar
                      dataKey="bytes"
                      name="Dung lượng"
                      fill="#00C49F"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies">
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* IDS Analysis Panel */}
            <IDSAnalysisPanel deviceId={deviceId} />
            
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{anomalyStats.count}</div>
                  <p className="text-sm text-gray-500">Tổng số xâm nhập phát hiện</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {anomalyStats.latestAnomalies[0]?.details?.sourceIp || "N/A"}
                  </div>
                  <p className="text-sm text-gray-500">Nguồn xâm nhập gần nhất</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-500">
                    {anomalyStats.latestAnomalies[0]?.probability ? 
                      `${(anomalyStats.latestAnomalies[0].probability * 100).toFixed(1)}%` : 
                      "N/A"}
                  </div>
                  <p className="text-sm text-gray-500">Độ tin cậy của phát hiện gần nhất</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Test buttons for IDS */}
            <Card>
              <CardHeader>
                <CardTitle>Mô Phỏng Kiểm Tra Xâm Nhập</CardTitle>
                <CardDescription>Tạo dữ liệu lưu lượng bất thường để kiểm tra hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Chú ý: Tính năng này sẽ gửi dữ liệu lưu lượng mạng giả định đến API để kiểm tra hệ thống phát hiện xâm nhập.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline-primary"
                      onClick={() => {
                        fetch("/api/security/test-scan-detection", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ deviceId, type: "port_scan" })
                        });
                      }}
                    >
                      Mô Phỏng Port Scan
                    </Button>
                    <Button 
                      variant="outline-primary"
                      onClick={() => {
                        fetch("/api/security/test-scan-detection", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ deviceId, type: "dos_attack" })
                        });
                      }}
                    >
                      Mô Phỏng DoS Attack
                    </Button>
                    <Button 
                      variant="outline-primary"
                      onClick={() => {
                        fetch("/api/security/test-scan-detection", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ deviceId, type: "bruteforce" })
                        });
                      }}
                    >
                      Mô Phỏng Brute Force
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Historical Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử phát hiện xâm nhập</CardTitle>
                <CardDescription>
                  Các hoạt động đáng ngờ và xâm nhập đã phát hiện trước đây
                </CardDescription>
              </CardHeader>
              <CardContent>
                {formatAnomalyData().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Thời gian</th>
                          <th className="text-left p-2">IP Nguồn</th>
                          <th className="text-left p-2">IP Đích</th>
                          <th className="text-left p-2">Loại</th>
                          <th className="text-left p-2">Độ tin cậy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formatAnomalyData().map((anomaly, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{anomaly.timestamp}</td>
                            <td className="p-2">{anomaly.source_ip}</td>
                            <td className="p-2">{anomaly.destination_ip}</td>
                            <td className="p-2">{anomaly.anomaly_type}</td>
                            <td className="p-2">
                              <span 
                                className={`px-2 py-1 rounded text-white text-sm ${
                                  anomaly.probability > 0.7 ? 'bg-red-500' : 
                                  anomaly.probability > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                              >
                                {(anomaly.probability * 100).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Chưa phát hiện hoạt động bất thường
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}