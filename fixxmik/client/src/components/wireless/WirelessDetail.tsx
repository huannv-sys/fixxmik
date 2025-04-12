import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Signal,
  Radio,
  Wifi,
  WifiOff,
  Info,
  Settings,
} from "lucide-react";

interface WirelessDetailProps {
  deviceId: number | null;
  wirelessId?: number | null;
}

export default function WirelessDetail({
  deviceId,
  wirelessId,
}: WirelessDetailProps) {
  const [activeTab, setActiveTab] = useState("clients");

  const {
    data: wirelessInterfaces,
    isLoading: isLoadingInterfaces,
    error: interfacesError,
  } = useQuery({
    queryKey: deviceId ? [`/api/devices/${deviceId}/wireless`] : [],
    enabled: Boolean(deviceId),
  });

  // Lấy thông tin chi tiết về một wireless interface cụ thể nếu có wirelessId
  const {
    data: wirelessDetail,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useQuery({
    queryKey: wirelessId ? [`/api/wireless/${wirelessId}`] : [],
    enabled: Boolean(wirelessId),
  });

  if (!deviceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết Wireless</CardTitle>
          <CardDescription>
            Vui lòng chọn thiết bị để xem chi tiết
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoadingInterfaces || isLoadingDetail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết Wireless</CardTitle>
          <CardDescription>Đang tải thông tin chi tiết...</CardDescription>
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

  if (interfacesError || detailError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết Wireless</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              Không thể tải thông tin chi tiết. Vui lòng thử lại sau.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (
    !wirelessInterfaces ||
    !Array.isArray(wirelessInterfaces) ||
    wirelessInterfaces.length === 0
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết Wireless</CardTitle>
          <CardDescription>
            Thiết bị không có wireless interface
          </CardDescription>
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

  // Sử dụng wireless interface đầu tiên nếu không có wirelessId
  const selectedWireless =
    wirelessDetail ||
    (wirelessId && Array.isArray(wirelessInterfaces)
      ? wirelessInterfaces.find((w: any) => w.id === wirelessId)
      : Array.isArray(wirelessInterfaces) && wirelessInterfaces.length > 0
        ? wirelessInterfaces[0]
        : null);

  if (!selectedWireless) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết Wireless</CardTitle>
          <CardDescription>
            Không tìm thấy thông tin wireless interface
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>
              {selectedWireless.name} ({selectedWireless.ssid || "N/A"})
            </CardTitle>
            <CardDescription>
              {selectedWireless.isActive ? (
                <span className="flex items-center text-green-500">
                  <Wifi className="h-4 w-4 mr-1" /> Đang hoạt động
                </span>
              ) : (
                <span className="flex items-center text-red-500">
                  <WifiOff className="h-4 w-4 mr-1" /> Ngừng hoạt động
                </span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <CardTitle>{formatBand(selectedWireless.band)}</CardTitle>
            <CardDescription>
              Kênh: {selectedWireless.channel || "N/A"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clients">
              <Users className="h-4 w-4 mr-2" /> Clients
            </TabsTrigger>
            <TabsTrigger value="signal">
              <Signal className="h-4 w-4 mr-2" /> Tín hiệu
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="h-4 w-4 mr-2" /> Thông tin
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" /> Cấu hình
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-10 w-10 mr-3 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Clients kết nối</h3>
                    <p className="text-sm text-muted-foreground">
                      Số lượng thiết bị
                    </p>
                  </div>
                </div>
                <div className="text-3xl font-bold">
                  {selectedWireless.clients || 0}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="signal" className="pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium">Công suất phát (dBm)</h3>
                  <p className="text-2xl font-semibold">
                    {selectedWireless.txPower || "N/A"}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium">Noise Floor (dBm)</h3>
                  <p className="text-2xl font-semibold">
                    {selectedWireless.noiseFloor || "N/A"}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg col-span-2">
                  <h3 className="text-sm font-medium">
                    Tần số hoạt động (MHz)
                  </h3>
                  <p className="text-2xl font-semibold">
                    {selectedWireless.frequency || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="pt-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-y-2">
                <div className="text-sm font-medium">Chế độ:</div>
                <div>{formatMode(selectedWireless.mode)}</div>

                <div className="text-sm font-medium">MAC Address:</div>
                <div>{selectedWireless.macAddress || "N/A"}</div>

                <div className="text-sm font-medium">Băng tần:</div>
                <div>{formatBand(selectedWireless.band)}</div>

                <div className="text-sm font-medium">Kênh:</div>
                <div>{selectedWireless.channel || "N/A"}</div>

                <div className="text-sm font-medium">Cập nhật cuối:</div>
                <div>{formatDate(selectedWireless.lastUpdated)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="pt-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Cấu hình mạng</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-y-2">
                  <div className="text-sm font-medium">SSID:</div>
                  <div>{selectedWireless.ssid || "N/A"}</div>

                  <div className="text-sm font-medium">Mode:</div>
                  <div>{formatMode(selectedWireless.mode)}</div>

                  <div className="text-sm font-medium">Băng tần:</div>
                  <div>{formatBand(selectedWireless.band)}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function formatBand(band: string | null) {
  if (!band) return "N/A";

  switch (band) {
    case "2ghz-b/g/n":
      return "2.4 GHz (b/g/n)";
    case "5ghz-a/n/ac":
      return "5 GHz (a/n/ac)";
    default:
      return band;
  }
}

function formatMode(mode: string | null) {
  if (!mode) return "N/A";

  switch (mode) {
    case "ap-bridge":
      return "Access Point Bridge";
    case "station":
      return "Client";
    case "station-bridge":
      return "Client Bridge";
    default:
      return mode;
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch (error) {
    return dateString;
  }
}
