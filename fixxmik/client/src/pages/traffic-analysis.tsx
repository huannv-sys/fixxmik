import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#8DD1E1",
  "#A4DE6C",
  "#D0ED57",
];

interface TrafficData {
  timestamp: string;
  src_ip?: string;
  dst_ip?: string;
  protocol?: string;
  src_port?: number;
  dst_port?: number;
  bytes?: number;
}

const TrafficAnalysisPage = () => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [filteredData, setFilteredData] = useState<TrafficData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [ipFilter, setIpFilter] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("All");
  const [timeInterval, setTimeInterval] = useState("hourly");
  const [ipDirection, setIpDirection] = useState("src_ip");
  const [topN, setTopN] = useState(10);
  const [exportFormat, setExportFormat] = useState("csv");
  const [bandwidthData, setBandwidthData] = useState<any[]>([]);
  const [connectionData, setConnectionData] = useState<any[]>([]);
  const [protocolData, setProtocolData] = useState<any[]>([]);
  const [topIpsData, setTopIpsData] = useState<any[]>([]);
  const [topPortsData, setTopPortsData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [anomalyData, setAnomalyData] = useState<any>({ data: [] });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);

      try {
        // Call API to analyze log content
        const response = await axios.post("/api/traffic-analysis/analyze", {
          content,
        });

        if (response.data.success) {
          setTrafficData(response.data.data.trafficData);
          setFilteredData(response.data.data.trafficData);
          setStats(response.data.data.stats);
          setFileUploaded(true);
          setErrorMessage(null);

          // Set date range based on data
          if (response.data.data.trafficData.length > 0) {
            const timestamps = response.data.data.trafficData.map(
              (item: any) => new Date(item.timestamp),
            );
            setStartDate(new Date(Math.min(...timestamps)));
            setEndDate(new Date(Math.max(...timestamps)));
          }

          // Load initial visualizations
          loadVisualizations(response.data.data.trafficData);
        } else {
          setErrorMessage(response.data.message);
        }
      } catch (error) {
        console.error("Error analyzing log:", error);
        setErrorMessage("Có lỗi xảy ra khi phân tích log. Vui lòng thử lại.");
      }
    };
    reader.readAsText(file);
  };

  const loadVisualizations = async (data: TrafficData[]) => {
    try {
      // Load bandwidth chart data
      const bandwidthResponse = await axios.post(
        "/api/traffic-analysis/bandwidth",
        {
          data,
          resampleRule: timeInterval,
        },
      );
      setBandwidthData(bandwidthResponse.data);

      // Load connection chart data
      const connectionResponse = await axios.post(
        "/api/traffic-analysis/connections",
        {
          data,
          resampleRule: timeInterval,
        },
      );
      setConnectionData(connectionResponse.data);

      // Load protocol distribution data
      const protocolResponse = await axios.post(
        "/api/traffic-analysis/protocols",
        {
          data,
        },
      );
      setProtocolData(protocolResponse.data);

      // Load top IPs data
      const topIpsResponse = await axios.post("/api/traffic-analysis/top-ips", {
        data,
        ipColumn: ipDirection,
        topN,
      });
      setTopIpsData(topIpsResponse.data);

      // Load top ports data
      const topPortsResponse = await axios.post(
        "/api/traffic-analysis/top-ports",
        {
          data,
          metric: "connections",
          topN,
        },
      );
      setTopPortsData(topPortsResponse.data);

      // Load anomaly data
      try {
        const anomalyResponse = await axios.get("/api/security/anomalies");
        if (anomalyResponse.data?.success) {
          setAnomalyData(anomalyResponse.data);
        }
      } catch (anomalyError) {
        console.error("Error loading anomaly data:", anomalyError);
      }
    } catch (error) {
      console.error("Error loading visualizations:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...trafficData];

    // Apply date filters
    if (startDate && endDate) {
      filtered = filtered.filter((item) => {
        const timestamp = new Date(item.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      });
    }

    // Apply IP filter
    if (ipFilter) {
      filtered = filtered.filter((item) => {
        return (
          (item.src_ip && item.src_ip.includes(ipFilter)) ||
          (item.dst_ip && item.dst_ip.includes(ipFilter))
        );
      });
    }

    // Apply protocol filter
    if (protocolFilter !== "All") {
      filtered = filtered.filter((item) => item.protocol === protocolFilter);
    }

    setFilteredData(filtered);
    loadVisualizations(filtered);
  };

  const resetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setIpFilter("");
    setProtocolFilter("All");
    setFilteredData(trafficData);
    loadVisualizations(trafficData);
  };

  const updateTimeInterval = (interval: string) => {
    setTimeInterval(interval);

    // Reload bandwidth and connection charts with new interval
    axios
      .post("/api/traffic-analysis/bandwidth", {
        data: filteredData,
        resampleRule: interval,
      })
      .then((response) => setBandwidthData(response.data));

    axios
      .post("/api/traffic-analysis/connections", {
        data: filteredData,
        resampleRule: interval,
      })
      .then((response) => setConnectionData(response.data));
  };

  const updateIpDirection = (direction: string) => {
    setIpDirection(direction);

    // Reload top IPs with new direction
    axios
      .post("/api/traffic-analysis/top-ips", {
        data: filteredData,
        ipColumn: direction,
        topN,
      })
      .then((response) => setTopIpsData(response.data));
  };

  const updateTopN = (n: number) => {
    setTopN(n);

    // Reload top IPs and ports with new count
    axios
      .post("/api/traffic-analysis/top-ips", {
        data: filteredData,
        ipColumn: ipDirection,
        topN: n,
      })
      .then((response) => setTopIpsData(response.data));

    axios
      .post("/api/traffic-analysis/top-ports", {
        data: filteredData,
        metric: "connections",
        topN: n,
      })
      .then((response) => setTopPortsData(response.data));
  };

  const exportData = () => {
    let exportData: string;
    let mimeType: string;
    let fileName: string;

    if (exportFormat === "csv") {
      // Generate CSV
      const headers = Object.keys(filteredData[0] || {}).join(",");
      const rows = filteredData
        .map((item) =>
          Object.values(item)
            .map((val) =>
              typeof val === "string" && val.includes(",") ? `"${val}"` : val,
            )
            .join(","),
        )
        .join("\n");
      exportData = `${headers}\n${rows}`;
      mimeType = "text/csv";
      fileName = "mikrotik_traffic_analysis.csv";
    } else if (exportFormat === "json") {
      // Generate JSON
      exportData = JSON.stringify(filteredData, null, 2);
      mimeType = "application/json";
      fileName = "mikrotik_traffic_analysis.json";
    } else {
      return; // Unsupported format
    }

    // Create download link
    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Phân tích Traffic Mikrotik</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar for file upload and filters */}
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Dữ liệu đầu vào</CardTitle>
              <CardDescription>Tải lên file log để phân tích</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="log-file">File Log Mikrotik</Label>
                  <Input
                    id="log-file"
                    type="file"
                    accept=".txt,.log,.csv"
                    onChange={handleFileUpload}
                  />
                </div>

                {errorMessage && (
                  <div className="text-red-500 text-sm mt-2">
                    {errorMessage}
                  </div>
                )}

                {fileUploaded && (
                  <div className="space-y-4">
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium">Bộ lọc</h3>

                      <div className="mt-3">
                        <Label>Khoảng thời gian</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <DatePicker
                            selected={startDate}
                            onSelect={setStartDate}
                            placeholder="Ngày bắt đầu"
                          />
                          <DatePicker
                            selected={endDate}
                            onSelect={setEndDate}
                            placeholder="Ngày kết thúc"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label htmlFor="ip-filter">Lọc theo IP</Label>
                        <Input
                          id="ip-filter"
                          placeholder="Ví dụ: 192.168.1"
                          value={ipFilter}
                          onChange={(e) => setIpFilter(e.target.value)}
                        />
                      </div>

                      {stats && (
                        <div className="mt-3">
                          <Label htmlFor="protocol-filter">Giao thức</Label>
                          <Select
                            value={protocolFilter}
                            onValueChange={setProtocolFilter}
                          >
                            <SelectTrigger id="protocol-filter">
                              <SelectValue placeholder="Chọn giao thức" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">Tất cả</SelectItem>
                              {stats.protocol_distribution?.map(
                                ([protocol]: [string, number]) => (
                                  <SelectItem key={protocol} value={protocol}>
                                    {protocol}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex space-x-2 mt-4">
                        <Button onClick={applyFilters}>Áp dụng</Button>
                        <Button variant="outline" onClick={resetFilters}>
                          Đặt lại
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {!fileUploaded ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium mb-2">
                    Tải lên file log để bắt đầu phân tích
                  </h3>
                  <p className="text-gray-500">
                    Hỗ trợ các định dạng: TXT, LOG, CSV
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-6 mb-4">
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="bandwidth">Băng thông</TabsTrigger>
                <TabsTrigger value="connections">Kết nối</TabsTrigger>
                <TabsTrigger value="top-users">Top người dùng</TabsTrigger>
                <TabsTrigger value="anomalies">Phát Hiện Xâm Nhập</TabsTrigger>
                <TabsTrigger value="export">Xuất dữ liệu</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {filteredData.length.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-500">Tổng số bản ghi</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {stats?.total_gb
                          ? `${stats.total_gb.toFixed(2)} GB`
                          : "N/A"}
                      </div>
                      <p className="text-sm text-gray-500">Tổng lưu lượng</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {stats?.unique_sources?.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-500">Nguồn duy nhất</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {stats?.unique_destinations?.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-500">Đích duy nhất</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lưu lượng theo thời gian</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={bandwidthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={(timestamp) => {
                                const date = new Date(timestamp);
                                return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`;
                              }}
                            />
                            <YAxis name="Lưu lượng (MB)" />
                            <Tooltip
                              formatter={(value) => [
                                `${value} MB`,
                                "Lưu lượng",
                              ]}
                              labelFormatter={(timestamp) => {
                                const date = new Date(timestamp);
                                return date.toLocaleString();
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="megabytes"
                              name="Lưu lượng (MB)"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Phân phối giao thức</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={protocolData}
                              dataKey="count"
                              nameKey="protocol"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              label={(entry) => entry.protocol}
                            >
                              {protocolData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name, props) => [
                                value,
                                `Kết nối ${props.payload.protocol}`,
                              ]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Bandwidth Analysis Tab */}
              <TabsContent value="bandwidth">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Phân tích băng thông</CardTitle>
                    <CardDescription>
                      Theo dõi lưu lượng mạng theo thời gian
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Label>Khoảng thời gian</Label>
                      <Select
                        value={timeInterval}
                        onValueChange={updateTimeInterval}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Khoảng thời gian" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Theo giờ</SelectItem>
                          <SelectItem value="daily">Theo ngày</SelectItem>
                          <SelectItem value="weekly">Theo tuần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bandwidthData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(timestamp) => {
                              const date = new Date(timestamp);
                              if (timeInterval === "hourly") {
                                return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`;
                              } else if (timeInterval === "daily") {
                                return `${date.getDate()}/${date.getMonth() + 1}`;
                              } else {
                                return `W${Math.ceil(
                                  (date.getDate() + 6 - date.getDay()) / 7,
                                )}`;
                              }
                            }}
                          />
                          <YAxis name="Lưu lượng (MB)" />
                          <Tooltip
                            formatter={(value) => [`${value} MB`, "Lưu lượng"]}
                            labelFormatter={(timestamp) => {
                              const date = new Date(timestamp);
                              return date.toLocaleString();
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="megabytes"
                            name="Lưu lượng (MB)"
                            stroke="#82ca9d"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lưu lượng theo IP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Label>Hướng traffic</Label>
                      <RadioGroup
                        value={ipDirection}
                        onValueChange={updateIpDirection}
                        className="flex space-x-4 mt-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="src_ip" id="source" />
                          <Label htmlFor="source">Nguồn</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dst_ip" id="destination" />
                          <Label htmlFor="destination">Đích</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="top-n">Số lượng hiển thị</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="top-n"
                          type="number"
                          min={5}
                          max={20}
                          value={topN}
                          onChange={(e) => updateTopN(parseInt(e.target.value))}
                          className="w-24"
                        />
                        <span>IP</span>
                      </div>
                    </div>

                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topIpsData}
                          layout="vertical"
                          margin={{ left: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="ip"
                            width={150}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} MB`, "Lưu lượng"]}
                          />
                          <Legend />
                          <Bar
                            dataKey="megabytes"
                            name="Lưu lượng (MB)"
                            fill="#8884d8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Connections Tab */}
              <TabsContent value="connections">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Phân tích kết nối</CardTitle>
                    <CardDescription>
                      Theo dõi số lượng kết nối theo thời gian
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Label>Khoảng thời gian</Label>
                      <Select
                        value={timeInterval}
                        onValueChange={updateTimeInterval}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Khoảng thời gian" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Theo giờ</SelectItem>
                          <SelectItem value="daily">Theo ngày</SelectItem>
                          <SelectItem value="weekly">Theo tuần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={connectionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(timestamp) => {
                              const date = new Date(timestamp);
                              if (timeInterval === "hourly") {
                                return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`;
                              } else if (timeInterval === "daily") {
                                return `${date.getDate()}/${date.getMonth() + 1}`;
                              } else {
                                return `W${Math.ceil(
                                  (date.getDate() + 6 - date.getDay()) / 7,
                                )}`;
                              }
                            }}
                          />
                          <YAxis name="Số kết nối" />
                          <Tooltip
                            formatter={(value) => [value, "Kết nối"]}
                            labelFormatter={(timestamp) => {
                              return new Date(timestamp).toLocaleString();
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="count"
                            name="Số kết nối"
                            fill="#FF8042"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top dịch vụ/cổng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Label htmlFor="top-ports">Số lượng hiển thị</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="top-ports"
                          type="number"
                          min={5}
                          max={20}
                          value={topN}
                          onChange={(e) => updateTopN(parseInt(e.target.value))}
                          className="w-24"
                        />
                        <span>cổng</span>
                      </div>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topPortsData}
                          layout="vertical"
                          margin={{ left: 50 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="port"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip formatter={(value) => [value, "Kết nối"]} />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name="Số kết nối"
                            fill="#0088FE"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Top Users/Services Tab */}
              <TabsContent value="top-users">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Top IP theo lưu lượng
                        {ipDirection === "src_ip" ? " (Nguồn)" : " (Đích)"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <Label>Hướng traffic</Label>
                        <RadioGroup
                          value={ipDirection}
                          onValueChange={updateIpDirection}
                          className="flex space-x-4 mt-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="src_ip" id="source-top" />
                            <Label htmlFor="source-top">Nguồn</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="dst_ip"
                              id="destination-top"
                            />
                            <Label htmlFor="destination-top">Đích</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topIpsData}
                            layout="vertical"
                            margin={{ left: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                              type="category"
                              dataKey="ip"
                              width={150}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${value} MB`,
                                "Lưu lượng",
                              ]}
                            />
                            <Legend />
                            <Bar
                              dataKey="megabytes"
                              name="Lưu lượng (MB)"
                              fill="#00C49F"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top giao thức</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={protocolData.slice(0, topN)}
                              dataKey="count"
                              nameKey="protocol"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              fill="#8884d8"
                              label={(entry) =>
                                `${entry.protocol}: ${entry.count}`
                              }
                            >
                              {protocolData
                                .slice(0, topN)
                                .map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name, props) => [
                                value,
                                `Kết nối ${props.payload.protocol}`,
                              ]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Export Tab */}
              {/* Anomalies Detection Tab */}
              <TabsContent value="anomalies">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Phát Hiện Xâm Nhập (IDS)</CardTitle>
                      <CardDescription>
                        Biểu đồ và phát hiện các cuộc tấn công tiềm năng được
                        phát hiện bởi AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-center">
                              {anomalyData?.data?.length || 0}
                            </div>
                            <p className="text-sm text-gray-500 text-center">
                              Tổng số xâm nhập phát hiện
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-center">
                              {anomalyData?.data?.length > 0
                                ? anomalyData.data[0]?.sourceIp || "N/A"
                                : "N/A"}
                            </div>
                            <p className="text-sm text-gray-500 text-center">
                              Nguồn xâm nhập gần nhất
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-center text-red-500">
                              {anomalyData?.data?.length > 0
                                ? anomalyData.data[0]?.confidenceScore || "N/A"
                                : "N/A"}
                            </div>
                            <p className="text-sm text-gray-500 text-center">
                              Độ tin cậy của phát hiện gần nhất
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        {anomalyData?.data?.length > 0 ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Thống kê giao diện</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="h-60">
                                    <ResponsiveContainer
                                      width="100%"
                                      height="100%"
                                    >
                                      <PieChart>
                                        <Pie
                                          data={[
                                            { name: "Eth1", value: 30 },
                                            { name: "Eth2", value: 45 },
                                            { name: "Eth3", value: 25 },
                                          ]}
                                          dataKey="value"
                                          nameKey="name"
                                          cx="50%"
                                          cy="50%"
                                          outerRadius={80}
                                          fill="#8884d8"
                                          label
                                        >
                                          {[
                                            { name: "Eth1", value: 30 },
                                            { name: "Eth2", value: 45 },
                                            { name: "Eth3", value: 25 },
                                          ].map((entry, index) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                COLORS[index % COLORS.length]
                                              }
                                            />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle>Quy tắc Firewall</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="h-60">
                                    <ResponsiveContainer
                                      width="100%"
                                      height="100%"
                                    >
                                      <PieChart>
                                        <Pie
                                          data={[
                                            { name: "Allow", value: 60 },
                                            { name: "Drop", value: 35 },
                                            { name: "Reject", value: 5 },
                                          ]}
                                          dataKey="value"
                                          nameKey="name"
                                          cx="50%"
                                          cy="50%"
                                          outerRadius={80}
                                          fill="#8884d8"
                                          label
                                        >
                                          {[
                                            { name: "Allow", value: 60 },
                                            { name: "Drop", value: 35 },
                                            { name: "Reject", value: 5 },
                                          ].map((entry, index) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                COLORS[index % COLORS.length]
                                              }
                                            />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Danh sách dịch vụ</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span>HTTP (80)</span>
                                      <div className="h-2 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 rounded-full"
                                          style={{ width: "65%" }}
                                        />
                                      </div>
                                      <span>65%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>HTTPS (443)</span>
                                      <div className="h-2 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-green-500 rounded-full"
                                          style={{ width: "20%" }}
                                        />
                                      </div>
                                      <span>20%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>SSH (22)</span>
                                      <div className="h-2 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-yellow-500 rounded-full"
                                          style={{ width: "10%" }}
                                        />
                                      </div>
                                      <span>10%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>DNS (53)</span>
                                      <div className="h-2 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-purple-500 rounded-full"
                                          style={{ width: "5%" }}
                                        />
                                      </div>
                                      <span>5%</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle>
                                    Biểu đồ traffic thời gian thực
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="h-60">
                                    <ResponsiveContainer
                                      width="100%"
                                      height="100%"
                                    >
                                      <LineChart
                                        data={[
                                          { time: "00:00", traffic: 20 },
                                          { time: "03:00", traffic: 18 },
                                          { time: "06:00", traffic: 25 },
                                          { time: "09:00", traffic: 40 },
                                          { time: "12:00", traffic: 50 },
                                          { time: "15:00", traffic: 45 },
                                          { time: "18:00", traffic: 60 },
                                          { time: "21:00", traffic: 32 },
                                        ]}
                                      >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                          type="monotone"
                                          dataKey="traffic"
                                          stroke="#8884d8"
                                          activeDot={{ r: 8 }}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            <Card>
                              <CardHeader>
                                <CardTitle>
                                  Danh sách phát hiện xâm nhập gần đây
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="relative overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                                      <tr>
                                        <th scope="col" className="px-6 py-3">
                                          Thời gian
                                        </th>
                                        <th scope="col" className="px-6 py-3">
                                          Nguồn IP
                                        </th>
                                        <th scope="col" className="px-6 py-3">
                                          Đích IP
                                        </th>
                                        <th scope="col" className="px-6 py-3">
                                          Loại tấn công
                                        </th>
                                        <th scope="col" className="px-6 py-3">
                                          Độ tin cậy
                                        </th>
                                        <th scope="col" className="px-6 py-3">
                                          Hành động
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {anomalyData.data.map(
                                        (item: any, index: number) => (
                                          <tr
                                            key={index}
                                            className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                          >
                                            <td className="px-6 py-4">
                                              {new Date(
                                                item.timestamp,
                                              ).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                              {item.sourceIp}
                                            </td>
                                            <td className="px-6 py-4">
                                              {item.destinationIp}
                                            </td>
                                            <td className="px-6 py-4">
                                              {item.attackType}
                                            </td>
                                            <td className="px-6 py-4">
                                              {item.confidenceScore}
                                            </td>
                                            <td className="px-6 py-4">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                              >
                                                Chi tiết
                                              </Button>
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <h3 className="text-lg font-medium mb-4">
                              Không có dữ liệu xâm nhập nào được phát hiện trong
                              khoảng thời gian này.
                            </h3>
                            <p className="text-gray-500 mb-6">
                              Mô hình AI đang theo dõi các mẫu lưu lượng bất
                              thường.
                            </p>
                            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                              <CardContent className="pt-6">
                                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                                  Mô Phỏng Kiểm Tra Xâm Nhập
                                </h4>
                                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                                  Tạo dữ liệu lưu lượng bất thường để kiểm tra
                                  hệ thống.
                                </p>
                                <div className="flex space-x-2">
                                  <Button variant="outline">Port Scan</Button>
                                  <Button variant="outline">
                                    DoS Simulation
                                  </Button>
                                  <Button variant="outline">
                                    SQL Injection
                                  </Button>
                                  <Button variant="outline">Brute Force</Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="export">
                <Card>
                  <CardHeader>
                    <CardTitle>Xuất dữ liệu phân tích</CardTitle>
                    <CardDescription>
                      Tải xuống dữ liệu để phân tích thêm
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Định dạng xuất</Label>
                        <Select
                          value={exportFormat}
                          onValueChange={setExportFormat}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn định dạng" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={exportData}>Tạo file xuất</Button>

                      <div className="pt-4">
                        <h3 className="text-lg font-medium mb-2">
                          Xuất biểu đồ
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Chọn biểu đồ để xuất
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Button variant="outline">
                            Lưu lượng theo thời gian
                          </Button>
                          <Button variant="outline">Phân phối giao thức</Button>
                          <Button variant="outline">
                            Top IP theo lưu lượng
                          </Button>
                          <Button variant="outline">
                            Kết nối theo thời gian
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrafficAnalysisPage;
