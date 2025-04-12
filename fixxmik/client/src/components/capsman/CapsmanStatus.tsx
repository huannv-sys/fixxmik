import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Radio, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

interface CapsmanStatusProps {
  deviceId: number | null;
}

export default function CapsmanStatus({ deviceId }: CapsmanStatusProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: capsmanAPs,
    isLoading,
    error,
  } = useQuery({
    queryKey: deviceId ? [`/api/devices/${deviceId}/capsman`] : [],
    enabled: !!deviceId,
  });

  // Truy vấn thông tin thiết bị để kiểm tra xem có hỗ trợ CAPsMAN không
  const { data: device } = useQuery<any>({
    queryKey: deviceId ? [`/api/devices/${deviceId}`] : [],
    enabled: !!deviceId,
  });

  // Hàm làm mới dữ liệu CAPsMan
  const refreshCapsmanData = async () => {
    if (!deviceId) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/devices/${deviceId}/refresh-capsman`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể làm mới dữ liệu CAPsMAN");
      }

      const data = await response.json();

      // Hiển thị thông báo thành công
      toast({
        title: "Làm mới thành công",
        description: `Đã tìm thấy ${data.apsCount} thiết bị Access Point`,
      });

      // Làm mới data trong react-query cache
      queryClient.invalidateQueries({
        queryKey: [`/api/devices/${deviceId}/capsman`],
      });
    } catch (error) {
      console.error("Lỗi khi làm mới dữ liệu CAPsMAN:", error);
      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể làm mới dữ liệu CAPsMAN",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!deviceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CAPsMAN Controller</CardTitle>
          <CardDescription>
            Vui lòng chọn thiết bị để xem thông tin CAPsMAN
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CAPsMAN Controller</CardTitle>
          <CardDescription>Đang tải thông tin CAPsMAN...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CAPsMAN Controller</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              Không thể tải thông tin CAPsMAN. Vui lòng thử lại sau.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Kiểm tra xem thiết bị có hỗ trợ CAPsMAN không
  if (device && (device.hasCAPsMAN === false || !device.hasCAPsMAN)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CAPsMAN Controller</CardTitle>
          <CardDescription>Thiết bị không hỗ trợ CAPsMAN</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Radio className="h-10 w-10 mr-2" />
            <p>Thiết bị này không có chức năng CAPsMAN controller</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!capsmanAPs || !Array.isArray(capsmanAPs) || capsmanAPs.length === 0) {
    return (
      <Card>
        <CardHeader className="flex justify-between items-start">
          <div>
            <CardTitle>CAPsMAN Controller</CardTitle>
            <CardDescription>Không có Access Point kết nối</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshCapsmanData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang làm mới...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới dữ liệu
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <WifiOff className="h-10 w-10 mr-2" />
            <p>Không có thiết bị AP nào được quản lý bởi CAPsMAN</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-start">
        <div>
          <CardTitle>CAPsMAN Controller</CardTitle>
          <CardDescription>
            Quản lý Access Points thông qua CAPsMAN
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refreshCapsmanData}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Đang làm mới...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới dữ liệu
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên AP</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Uptime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(capsmanAPs) &&
              capsmanAPs.map((ap: any) => (
                <TableRow key={ap.id}>
                  <TableCell className="font-medium">
                    {ap.identity || ap.name}
                  </TableCell>
                  <TableCell>{ap.ipAddress || "N/A"}</TableCell>
                  <TableCell>
                    {ap.state === "running" ? (
                      <Badge className="bg-green-500">
                        <Wifi className="h-3 w-3 mr-1" /> Hoạt động
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500">
                        <WifiOff className="h-3 w-3 mr-1" />{" "}
                        {ap.state || "Ngừng hoạt động"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{ap.clients || 0}</TableCell>
                  <TableCell>{ap.uptime || "N/A"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
