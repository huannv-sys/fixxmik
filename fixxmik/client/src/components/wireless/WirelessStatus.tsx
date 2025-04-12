import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WirelessStatusProps {
  deviceId: number | null;
}

export default function WirelessStatus({ deviceId }: WirelessStatusProps) {
  const { data: wirelessInterfaces, isLoading, error } = useQuery({
    queryKey: deviceId ? [`/api/devices/${deviceId}/wireless`] : [],
    enabled: Boolean(deviceId),
  });

  if (!deviceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tình trạng Wireless</CardTitle>
          <CardDescription>Vui lòng chọn thiết bị để xem thông tin Wireless</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tình trạng Wireless</CardTitle>
          <CardDescription>Đang tải thông tin wireless...</CardDescription>
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
          <CardTitle>Tình trạng Wireless</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              Không thể tải thông tin wireless. Vui lòng thử lại sau.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!wirelessInterfaces || !Array.isArray(wirelessInterfaces) || wirelessInterfaces.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tình trạng Wireless</CardTitle>
          <CardDescription>Thiết bị không có wireless interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <WifiOff className="h-10 w-10 mr-2" />
            <p>Không tìm thấy wireless interfaces</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tình trạng Wireless</CardTitle>
        <CardDescription>Thông tin về các wireless interfaces</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>SSID</TableHead>
              <TableHead>Băng tần</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Clients</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(wirelessInterfaces) && wirelessInterfaces.map((wInterface: any) => (
              <TableRow key={wInterface.id}>
                <TableCell className="font-medium">{wInterface.name}</TableCell>
                <TableCell>{wInterface.ssid || 'Chưa có thông tin'}</TableCell>
                <TableCell>{formatBand(wInterface.band)}</TableCell>
                <TableCell>
                  {wInterface.isActive ? 
                    <Badge variant="success" className="bg-green-500">
                      <Wifi className="h-3 w-3 mr-1" /> Hoạt động
                    </Badge> : 
                    <Badge variant="destructive">
                      <WifiOff className="h-3 w-3 mr-1" /> Ngừng hoạt động
                    </Badge>
                  }
                </TableCell>
                <TableCell>{wInterface.clients || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatBand(band: string | null) {
  if (!band) return 'Chưa có thông tin';
  
  switch (band) {
    case '2ghz-b/g/n':
      return '2.4 GHz (b/g/n)';
    case '5ghz-a/n/ac':
      return '5 GHz (a/n/ac)';
    default:
      return band;
  }
}