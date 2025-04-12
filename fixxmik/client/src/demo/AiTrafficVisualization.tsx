import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Loader } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface TrafficData {
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  bytes: number;
  packetCount: number;
  flowDuration: number;
  timestamp?: string;
  features?: Record<string, number>;
}

interface AiAnalysisResult {
  anomalyDetected: boolean;
  confidence: number;
  anomalyType?: string;
  description?: string;
  severity?: "low" | "medium" | "high";
  sourceIps?: string[];
  targetIps?: string[];
  recommendedAction?: string;
  timestamp: Date;
  originalTraffic: TrafficData;
  aiModel: string;
  error?: string;
}

const DEMO_TRAFFIC: TrafficData[] = [
  {
    sourceIp: "192.168.1.100",
    destinationIp: "192.168.1.1",
    sourcePort: 49521,
    destinationPort: 80,
    protocol: "tcp",
    bytes: 1540,
    packetCount: 8,
    flowDuration: 1200,
    features: {
      "Flow Packets/s": 6.67,
      "Flow Bytes/s": 1283.33,
    },
  },
  {
    sourceIp: "192.168.1.105",
    destinationIp: "8.8.8.8",
    sourcePort: 53012,
    destinationPort: 443,
    protocol: "tcp",
    bytes: 8450,
    packetCount: 12,
    flowDuration: 1500,
    features: {
      "Flow Packets/s": 8.0,
      "Flow Bytes/s": 5633.33,
    },
  },
  {
    sourceIp: "192.168.1.50",
    destinationIp: "192.168.1.105",
    sourcePort: 22,
    destinationPort: 58972,
    protocol: "tcp",
    bytes: 34560,
    packetCount: 76,
    flowDuration: 4500,
    features: {
      "Flow Packets/s": 16.89,
      "Flow Bytes/s": 7680.0,
    },
  },
  {
    sourceIp: "192.168.1.201",
    destinationIp: "192.168.1.1",
    sourcePort: 5060,
    destinationPort: 5060,
    protocol: "udp",
    bytes: 980,
    packetCount: 3,
    flowDuration: 500,
    features: {
      "Flow Packets/s": 6.0,
      "Flow Bytes/s": 1960.0,
    },
  },
  {
    sourceIp: "45.33.32.156", // IP bên ngoài đáng ngờ
    destinationIp: "192.168.1.1",
    sourcePort: 56234,
    destinationPort: 22,
    protocol: "tcp",
    bytes: 12450,
    packetCount: 156,
    flowDuration: 2800,
    features: {
      "Flow Packets/s": 55.71,
      "Flow Bytes/s": 4446.43,
    },
  },
];

interface AiTrafficVisualizationProps {
  deviceId?: number;
}

const AiTrafficVisualization: React.FC<AiTrafficVisualizationProps> = ({
  deviceId = 1,
}) => {
  const [selectedTraffic, setSelectedTraffic] = useState<TrafficData | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(
    null,
  );
  const [demoTraffic] = useState<TrafficData[]>(DEMO_TRAFFIC);
  const [error, setError] = useState<string | null>(null);

  const analyzeTraffic = async (traffic: TrafficData) => {
    setIsAnalyzing(true);
    setSelectedTraffic(traffic);
    setError(null);

    try {
      // Thêm timestamp nếu không có
      if (!traffic.timestamp) {
        traffic.timestamp = new Date().toISOString();
      }

      // Gọi API phân tích bằng OpenAI
      const response = await fetch("/api/security/ai-traffic-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trafficData: traffic }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Lỗi phân tích lưu lượng");
      }

      setAnalysisResult(data.data);
    } catch (err) {
      console.error("Error analyzing traffic:", err);
      setError(`Lỗi phân tích: ${err.message || "Không xác định"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrafficChartData = () => {
    return demoTraffic.map((traffic) => ({
      name: `${traffic.sourceIp.split(".").pop()}-${traffic.destinationIp.split(".").pop()}`,
      bytes: traffic.bytes,
      packets: traffic.packetCount,
      duration: traffic.flowDuration,
      fullSource: traffic.sourceIp,
      fullDest: traffic.destinationIp,
      port: traffic.destinationPort,
    }));
  };

  const renderSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "bg-danger text-white";
      case "medium":
        return "bg-warning";
      case "low":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="container my-4">
      <h2 className="text-2xl font-bold mb-4">
        Phân tích lưu lượng mạng bằng AI
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Bên trái - Dữ liệu lưu lượng & biểu đồ */}
        <div className="md:col-span-7">
          <Card className="shadow h-full">
            <CardHeader>
              <CardTitle>Dữ liệu lưu lượng mạng</CardTitle>
              <CardDescription>
                Chọn mẫu lưu lượng để phân tích bằng AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getTrafficChartData()}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} ${name === "bytes" ? "bytes" : name === "packets" ? "gói tin" : "ms"}`,
                        name === "bytes"
                          ? "Kích thước"
                          : name === "packets"
                            ? "Số gói tin"
                            : "Thời gian",
                      ]}
                      labelFormatter={(label, items) => {
                        const item = items[0]?.payload;
                        return item
                          ? `${item.fullSource} → ${item.fullDest} (cổng ${item.port})`
                          : label;
                      }}
                    />
                    <Bar dataKey="bytes" fill="#8884d8" name="bytes" />
                    <Bar dataKey="packets" fill="#82ca9d" name="packets" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-auto">
                <table className="table-auto w-full">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="px-2 py-2 text-left">Nguồn</th>
                      <th className="px-2 py-2 text-left">Đích</th>
                      <th className="px-2 py-2 text-left">Giao thức</th>
                      <th className="px-2 py-2 text-right">Kích thước</th>
                      <th className="px-2 py-2 text-right">Số gói</th>
                      <th className="px-2 py-2 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoTraffic.map((traffic, index) => (
                      <tr
                        key={index}
                        className={`${selectedTraffic === traffic ? "bg-secondary bg-opacity-20" : ""} border-b`}
                      >
                        <td className="px-2 py-2 text-left">
                          {traffic.sourceIp}:{traffic.sourcePort}
                        </td>
                        <td className="px-2 py-2 text-left">
                          {traffic.destinationIp}:{traffic.destinationPort}
                        </td>
                        <td className="px-2 py-2 text-left">
                          {traffic.protocol.toUpperCase()}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {traffic.bytes} bytes
                        </td>
                        <td className="px-2 py-2 text-right">
                          {traffic.packetCount}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            size="sm"
                            variant={
                              selectedTraffic === traffic
                                ? "primary"
                                : "secondary"
                            }
                            onClick={() => analyzeTraffic(traffic)}
                            disabled={isAnalyzing}
                          >
                            {selectedTraffic === traffic && isAnalyzing ? (
                              <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Đang phân tích...
                              </>
                            ) : (
                              "Phân tích"
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bên phải - Kết quả phân tích AI */}
        <div className="md:col-span-5">
          <Card className="shadow h-full">
            <CardHeader>
              <CardTitle>Kết quả phân tích AI</CardTitle>
              <CardDescription>
                Phân tích lưu lượng mạng bằng OpenAI API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="danger" className="mb-4">
                  <AlertTitle>Lỗi phân tích</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-4">
                  <Loader className="h-12 w-12 animate-spin mb-4" />
                  <p>Đang phân tích lưu lượng mạng bằng AI...</p>
                </div>
              )}

              {!isAnalyzing && !analysisResult && !error && (
                <div className="text-center p-4 text-gray-500">
                  <p>Chọn một mẫu lưu lượng từ bảng bên trái để phân tích</p>
                </div>
              )}

              {!isAnalyzing && analysisResult && (
                <div>
                  <Alert
                    variant={
                      analysisResult.anomalyDetected ? "danger" : "success"
                    }
                    className="mb-4"
                  >
                    <AlertTitle>
                      {analysisResult.anomalyDetected
                        ? `Phát hiện bất thường: ${analysisResult.anomalyType || "Không xác định"}`
                        : "Lưu lượng bình thường"}
                    </AlertTitle>
                    <AlertDescription>
                      Độ tin cậy: {(analysisResult.confidence * 100).toFixed(1)}
                      %
                    </AlertDescription>
                  </Alert>

                  {analysisResult.description && (
                    <div className="mb-4">
                      <h4 className="font-bold mb-2">Mô tả chi tiết:</h4>
                      <p>{analysisResult.description}</p>
                    </div>
                  )}

                  {analysisResult.severity && (
                    <div className="mb-4 flex items-center">
                      <div className="font-bold mr-2">Mức độ nghiêm trọng:</div>
                      <span
                        className={`px-2 py-1 rounded text-sm ${renderSeverityColor(analysisResult.severity)}`}
                      >
                        {analysisResult.severity === "high"
                          ? "Cao"
                          : analysisResult.severity === "medium"
                            ? "Trung bình"
                            : "Thấp"}
                      </span>
                    </div>
                  )}

                  {analysisResult.recommendedAction && (
                    <div className="mb-4">
                      <h4 className="font-bold mb-2">Đề xuất hành động:</h4>
                      <p>{analysisResult.recommendedAction}</p>
                    </div>
                  )}

                  {analysisResult.sourceIps &&
                    analysisResult.sourceIps.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold mb-2">Địa chỉ IP nguồn:</h4>
                        <ul className="list-disc pl-5">
                          {analysisResult.sourceIps.map((ip, idx) => (
                            <li key={idx}>{ip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {analysisResult.targetIps &&
                    analysisResult.targetIps.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold mb-2">Địa chỉ IP đích:</h4>
                        <ul className="list-disc pl-5">
                          {analysisResult.targetIps.map((ip, idx) => (
                            <li key={idx}>{ip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  <div className="mt-4 text-sm text-gray-600">
                    Phân tích bằng mô hình: {analysisResult.aiModel}
                    <br />
                    Thời gian:{" "}
                    {new Date(analysisResult.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                variant="secondary"
                disabled={!selectedTraffic || isAnalyzing}
                onClick={() => setSelectedTraffic(null)}
              >
                Xóa kết quả
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AiTrafficVisualization;
