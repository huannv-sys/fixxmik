import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  DownloadIcon,
  UploadIcon,
  NetworkIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimatedMetricCard } from "@/components/dashboard/AnimatedMetricCard";
import { useWebSocketContext } from "@/lib/websocket-context";
import { useMicroAnimationObject } from "@/hooks/useMicroAnimation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Define interface for traffic data point
interface TrafficDataPoint {
  timestamp: string;
  download: number;
  upload: number;
  total: number;
  time: string;
}

// Define props
interface AnimatedNetworkTrafficChartProps {
  deviceId: number;
  className?: string;
  initialData?: TrafficDataPoint[];
  maxDataPoints?: number;
}

// Utility function to format bandwidth as Mbps
const formatMbps = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} Gbps`;
  }
  return `${value.toFixed(2)} Mbps`;
};

// Utility function to format bytes with appropriate units
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Main component
export const AnimatedNetworkTrafficChart: React.FC<
  AnimatedNetworkTrafficChartProps
> = ({ deviceId, className = "", initialData = [], maxDataPoints = 30 }) => {
  // State for traffic data
  const [trafficData, setTrafficData] =
    useState<TrafficDataPoint[]>(initialData);
  const [activeTab, setActiveTab] = useState("realtime");

  // Get WebSocket context
  const { connected, lastMessage, subscribeToTopic, unsubscribeFromTopic } =
    useWebSocketContext();

  // Query client for interacting with React Query cache
  const queryClient = useQueryClient();

  // Query for initial traffic data
  const {
    data: metricsData,
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: [`/api/devices/${deviceId}/metrics`],
    enabled: Boolean(deviceId),
    refetchInterval: connected ? false : 5000, // Only poll if websocket is not connected
  });

  // Calculate current stats based on the most recent data point
  const currentStats = useMemo(() => {
    if (trafficData.length === 0) {
      return { download: 0, upload: 0, total: 0 };
    }

    const latest = trafficData[trafficData.length - 1];
    return {
      download: latest.download,
      upload: latest.upload,
      total: latest.download + latest.upload,
    };
  }, [trafficData]);

  // Calculate previous stats for trend comparison
  const previousStats = useMemo(() => {
    if (trafficData.length <= 1) {
      return currentStats;
    }

    const previous = trafficData[trafficData.length - 2];
    return {
      download: previous.download,
      upload: previous.upload,
      total: previous.download + previous.upload,
    };
  }, [trafficData, currentStats]);

  // Animated values for the metrics
  const animatedStats = useMicroAnimationObject(currentStats, {
    duration: 800,
    initialValue: previousStats.total,
  });

  // Initialize data from query results
  useEffect(() => {
    if (metricsData && Array.isArray(metricsData) && metricsData.length > 0) {
      // Process and sort metric data
      const processedData = metricsData
        .filter(
          (metric) =>
            metric &&
            (typeof metric.downloadBandwidth === "number" ||
              typeof metric.uploadBandwidth === "number"),
        )
        .map((metric) => ({
          timestamp: metric.timestamp,
          download: ((metric.downloadBandwidth || 0) / (1024 * 1024)) * 8, // Convert to Mbps
          upload: ((metric.uploadBandwidth || 0) / (1024 * 1024)) * 8, // Convert to Mbps
          total:
            (((metric.downloadBandwidth || 0) + (metric.uploadBandwidth || 0)) /
              (1024 * 1024)) *
            8,
          time: new Date(metric.timestamp).toLocaleTimeString(),
        }))
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

      // Limit data points
      const limitedData = processedData.slice(-maxDataPoints);

      setTrafficData(limitedData);
    }
  }, [metricsData, maxDataPoints]);

  // Subscribe to WebSocket traffic updates
  useEffect(() => {
    if (connected && deviceId) {
      // Subscribe to device specific traffic updates
      const topic = `device_traffic_${deviceId}`;
      subscribeToTopic(topic);

      return () => {
        unsubscribeFromTopic(topic);
      };
    }
  }, [connected, deviceId, subscribeToTopic, unsubscribeFromTopic]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (
      lastMessage &&
      lastMessage.type === "traffic_update" &&
      lastMessage.deviceId === deviceId
    ) {
      const newDataPoint: TrafficDataPoint = {
        timestamp: lastMessage.timestamp,
        download: ((lastMessage.downloadBandwidth || 0) / (1024 * 1024)) * 8, // Convert to Mbps
        upload: ((lastMessage.uploadBandwidth || 0) / (1024 * 1024)) * 8, // Convert to Mbps
        total:
          (((lastMessage.downloadBandwidth || 0) +
            (lastMessage.uploadBandwidth || 0)) /
            (1024 * 1024)) *
          8,
        time: new Date(lastMessage.timestamp).toLocaleTimeString(),
      };

      setTrafficData((prevData) => {
        const newData = [...prevData, newDataPoint];
        // Keep only the most recent data points
        return newData.slice(-maxDataPoints);
      });

      // Also update the query cache
      queryClient.setQueryData(
        [`/api/devices/${deviceId}/metrics`],
        (oldData: any[] = []) => {
          return [...oldData, lastMessage].slice(-100); // Keep last 100 metrics
        },
      );
    }
  }, [lastMessage, deviceId, maxDataPoints, queryClient]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Calculate the y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    if (trafficData.length === 0) return [0, 10];

    const maxValue = Math.max(
      ...trafficData.map((d) => Math.max(d.download, d.upload, d.total)),
    );

    // Add some padding (20%) to the top
    return [0, maxValue * 1.2];
  }, [trafficData]);

  // Calculate average, max, and total traffic
  const trafficStats = useMemo(() => {
    if (trafficData.length === 0) {
      return { avgDownload: 0, avgUpload: 0, maxDownload: 0, maxUpload: 0 };
    }

    const sumDownload = trafficData.reduce(
      (sum, point) => sum + point.download,
      0,
    );
    const sumUpload = trafficData.reduce((sum, point) => sum + point.upload, 0);
    const maxDownload = Math.max(...trafficData.map((point) => point.download));
    const maxUpload = Math.max(...trafficData.map((point) => point.upload));

    return {
      avgDownload: sumDownload / trafficData.length,
      avgUpload: sumUpload / trafficData.length,
      maxDownload,
      maxUpload,
    };
  }, [trafficData]);

  return (
    <Card className={`bg-slate-900 shadow-md overflow-hidden ${className}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-slate-950">
        <CardTitle className="text-sm font-medium text-gray-100 flex items-center">
          <NetworkIcon className="h-4 w-4 mr-2 text-blue-400" />
          Network Traffic
        </CardTitle>

        <div className="flex items-center space-x-2">
          <Tabs
            defaultValue="realtime"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="h-7 bg-slate-800">
              <TabsTrigger value="realtime" className="text-xs px-2 h-5">
                Realtime
              </TabsTrigger>
              <TabsTrigger value="statistics" className="text-xs px-2 h-5">
                Statistics
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-slate-800 border-slate-700 hover:bg-slate-700"
            onClick={handleRefresh}
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <TabsContent value="realtime" className="m-0">
        <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-slate-800">
          <AnimatedMetricCard
            title="Download"
            value={animatedStats.download}
            previousValue={previousStats.download}
            formatter={formatMbps}
            pulseColor="rgba(74, 222, 128, 0.15)"
            icon={<DownloadIcon className="h-4 w-4" />}
            iconClassName="text-green-500"
            valueClassName="text-green-400"
            trend={
              currentStats.download > previousStats.download
                ? "up"
                : currentStats.download < previousStats.download
                  ? "down"
                  : "neutral"
            }
          />

          <AnimatedMetricCard
            title="Upload"
            value={animatedStats.upload}
            previousValue={previousStats.upload}
            formatter={formatMbps}
            pulseColor="rgba(251, 146, 60, 0.15)"
            icon={<UploadIcon className="h-4 w-4" />}
            iconClassName="text-orange-500"
            valueClassName="text-orange-400"
            trend={
              currentStats.upload > previousStats.upload
                ? "up"
                : currentStats.upload < previousStats.upload
                  ? "down"
                  : "neutral"
            }
          />

          <AnimatedMetricCard
            title="Total"
            value={animatedStats.total}
            previousValue={previousStats.total}
            formatter={formatMbps}
            pulseColor="rgba(59, 130, 246, 0.15)"
            icon={<NetworkIcon className="h-4 w-4" />}
            iconClassName="text-blue-500"
            valueClassName="text-blue-400"
            trend={
              currentStats.total > previousStats.total
                ? "up"
                : currentStats.total < previousStats.total
                  ? "down"
                  : "neutral"
            }
          />
        </div>

        <CardContent className="px-2 pb-2 pt-0">
          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : trafficData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                No traffic data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trafficData}
                  margin={{ top: 20, right: 5, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorDownload"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorUpload"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#FB923C" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#94A3B8", fontSize: 10 }}
                    tickLine={{ stroke: "#334155" }}
                    axisLine={{ stroke: "#334155" }}
                    minTickGap={15}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tick={{ fill: "#94A3B8", fontSize: 10 }}
                    tickLine={{ stroke: "#334155" }}
                    axisLine={{ stroke: "#334155" }}
                    tickFormatter={(value) => `${value} Mbps`}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatMbps(value), ""]}
                    labelFormatter={(label) => `Time: ${label}`}
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      borderColor: "#334155",
                      borderRadius: "6px",
                    }}
                    itemStyle={{ padding: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="download"
                    stroke="#4ADE80"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDownload)"
                    name="Download"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="upload"
                    stroke="#FB923C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUpload)"
                    name="Upload"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  {/* Reference line for average download */}
                  <ReferenceLine
                    y={trafficStats.avgDownload}
                    stroke="#4ADE80"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  {/* Reference line for average upload */}
                  <ReferenceLine
                    y={trafficStats.avgUpload}
                    stroke="#FB923C"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Connection status indicator */}
          <div className="flex justify-between items-center text-xs text-gray-400 mt-1 px-2">
            <div className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full mr-1 ${connected ? "bg-green-500" : "bg-red-500"}`}
              />
              {connected ? "Realtime updates active" : "Polling every 5s"}
            </div>
            <div>
              {trafficData.length > 0
                ? `${trafficData.length} data points`
                : "No data"}
            </div>
          </div>
        </CardContent>
      </TabsContent>

      <TabsContent value="statistics" className="m-0 p-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-md p-3">
              <h4 className="text-xs text-gray-400 mb-2">Max Bandwidth</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-green-400 flex items-center">
                    <DownloadIcon className="h-3 w-3 mr-1" />
                    Download
                  </div>
                  <div className="text-sm font-mono mt-1 font-semibold">
                    {formatMbps(trafficStats.maxDownload)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-orange-400 flex items-center">
                    <UploadIcon className="h-3 w-3 mr-1" />
                    Upload
                  </div>
                  <div className="text-sm font-mono mt-1 font-semibold">
                    {formatMbps(trafficStats.maxUpload)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-md p-3">
              <h4 className="text-xs text-gray-400 mb-2">Average Bandwidth</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-green-400 flex items-center">
                    <DownloadIcon className="h-3 w-3 mr-1" />
                    Download
                  </div>
                  <div className="text-sm font-mono mt-1 font-semibold">
                    {formatMbps(trafficStats.avgDownload)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-orange-400 flex items-center">
                    <UploadIcon className="h-3 w-3 mr-1" />
                    Upload
                  </div>
                  <div className="text-sm font-mono mt-1 font-semibold">
                    {formatMbps(trafficStats.avgUpload)}
                  </div>
                </div>
              </div>
            </div>

            {/* Add more statistics cards here */}
            <div className="col-span-2">
              <h4 className="text-xs text-gray-400 mb-2">Current Status</h4>
              <div className="bg-slate-800 rounded-md p-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Traffic Type</span>
                    <span className="text-sm font-medium mt-1">
                      {currentStats.download > currentStats.upload * 2
                        ? "Download Heavy"
                        : currentStats.upload > currentStats.download * 2
                          ? "Upload Heavy"
                          : "Balanced"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">
                      Total Session Data
                    </span>
                    <span className="text-sm font-medium mt-1">
                      {formatBytes(
                        trafficData.reduce(
                          (sum, point) =>
                            sum + (point.download + point.upload) * 125000, // Convert Mbps to bytes (Mbps * 125000 = bytes/s)
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">
                      Session Duration
                    </span>
                    <span className="text-sm font-medium mt-1">
                      {trafficData.length > 0
                        ? (() => {
                            const first = new Date(trafficData[0].timestamp);
                            const last = new Date(
                              trafficData[trafficData.length - 1].timestamp,
                            );
                            const diffMs = last.getTime() - first.getTime();
                            const minutes = Math.floor(diffMs / 60000);
                            const seconds = Math.floor((diffMs % 60000) / 1000);
                            return `${minutes}m ${seconds}s`;
                          })()
                        : "0m 0s"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </TabsContent>
    </Card>
  );
};
