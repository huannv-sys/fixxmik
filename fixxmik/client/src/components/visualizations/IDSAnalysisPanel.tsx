import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "@/hooks/use-toast";

interface IDSAnalysisProps {
  deviceId: number;
}

interface AnomalyData {
  id: number;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  probability: number;
  anomalyType: string;
  description: string;
  timestamp: string;
}

interface AnalysisResult {
  connectionCount: number;
  analyzedCount: number;
  anomalyCount: number;
  anomalyPercentage: number;
  anomalies: AnomalyData[];
}

export default function IDSAnalysisPanel({ deviceId }: IDSAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyzeTraffic = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/security/analyze-real-traffic', { deviceId });
      
      if (response.data.success) {
        setResult(response.data.data);
        toast({
          title: "Phân tích thành công",
          description: response.data.message,
          variant: "default"
        });
      } else {
        setError(response.data.message || "Có lỗi xảy ra khi phân tích lưu lượng");
        toast({
          title: "Phân tích thất bại",
          description: response.data.message || "Có lỗi xảy ra khi phân tích lưu lượng",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error analyzing traffic:", err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi phân tích lưu lượng");
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra khi phân tích lưu lượng",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeVariant = (probability: number) => {
    if (probability >= 0.8) return "destructive";
    if (probability >= 0.6) return "default";
    return "secondary";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Phân tích lưu lượng thực</CardTitle>
        <CardDescription>
          Phân tích lưu lượng mạng thực tế từ thiết bị và phát hiện hành vi đáng ngờ hoặc tấn công mạng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-card rounded-md p-4 shadow">
                <p className="text-sm text-muted-foreground mb-1">Tổng kết nối</p>
                <p className="text-2xl font-bold">{result.connectionCount}</p>
              </div>
              <div className="bg-card rounded-md p-4 shadow">
                <p className="text-sm text-muted-foreground mb-1">Đã phân tích</p>
                <p className="text-2xl font-bold">{result.analyzedCount}</p>
              </div>
              <div className="bg-card rounded-md p-4 shadow">
                <p className="text-sm text-muted-foreground mb-1">Bất thường</p>
                <p className="text-2xl font-bold">{result.anomalyCount}</p>
              </div>
              <div className="bg-card rounded-md p-4 shadow">
                <p className="text-sm text-muted-foreground mb-1">Tỷ lệ dị thường</p>
                <p className="text-2xl font-bold">{result.anomalyPercentage.toFixed(2)}%</p>
              </div>
            </div>

            {result.anomalies.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-2">Danh sách dị thường</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Nguồn</TableHead>
                      <TableHead>IP Đích</TableHead>
                      <TableHead>Cổng Nguồn</TableHead>
                      <TableHead>Cổng Đích</TableHead>
                      <TableHead>Giao thức</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Loại dị thường</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.anomalies.map((anomaly) => (
                      <TableRow key={anomaly.id}>
                        <TableCell>{anomaly.sourceIp}</TableCell>
                        <TableCell>{anomaly.destinationIp}</TableCell>
                        <TableCell>{anomaly.sourcePort}</TableCell>
                        <TableCell>{anomaly.destinationPort}</TableCell>
                        <TableCell>{anomaly.protocol}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(anomaly.probability)}>
                            {(anomaly.probability * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{anomaly.anomalyType}</TableCell>
                        <TableCell>{formatDate(anomaly.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertTitle>Không phát hiện bất thường</AlertTitle>
                <AlertDescription>
                  Không có hành vi đáng ngờ nào được phát hiện trong lưu lượng mạng hiện tại.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAnalyzeTraffic} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Đang phân tích..." : "Phân tích lưu lượng thực"}
        </Button>
      </CardFooter>
    </Card>
  );
}