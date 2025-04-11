import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wifi, Radio } from "lucide-react";
import WirelessStatus from "@/components/wireless/WirelessStatus";
import WirelessDetail from "@/components/wireless/WirelessDetail";

export default function WirelessPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedWirelessId, setSelectedWirelessId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data: devices, isLoading: isLoadingDevices, error: devicesError } = useQuery({
    queryKey: ["/api/devices"],
  });

  // Lọc ra các thiết bị có wireless
  const wirelessDevices = Array.isArray(devices) ? devices.filter((device: any) => device.hasWireless) : [];

  // Lấy thông tin wireless interfaces của thiết bị đã chọn
  const { data: wirelessInterfaces, isLoading: isLoadingInterfaces } = useQuery({
    queryKey: selectedDeviceId ? [`/api/devices/${selectedDeviceId}/wireless`] : [],
    enabled: !!selectedDeviceId,
  });

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(parseInt(deviceId));
    setSelectedWirelessId(null); // Reset wireless interface selection
  };

  const handleWirelessChange = (wirelessId: string) => {
    setSelectedWirelessId(parseInt(wirelessId));
  };

  if (isLoadingDevices) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-6 w-1/4" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (devicesError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            Không thể tải danh sách thiết bị. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Wireless</h1>
        <p className="text-muted-foreground">Giám sát và quản lý các wireless interfaces</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Chọn thiết bị</CardTitle>
            <CardDescription>
              Thiết bị có wireless interfaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleDeviceChange} value={selectedDeviceId?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn thiết bị" />
              </SelectTrigger>
              <SelectContent>
                {wirelessDevices.length === 0 ? (
                  <SelectItem value="none" disabled>Không có thiết bị nào hỗ trợ wireless</SelectItem>
                ) : (
                  wirelessDevices.map((device: any) => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedDeviceId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Chọn interface</CardTitle>
              <CardDescription>
                Wireless interfaces trên thiết bị
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                onValueChange={handleWirelessChange} 
                value={selectedWirelessId?.toString()}
                disabled={isLoadingInterfaces || !wirelessInterfaces || !Array.isArray(wirelessInterfaces) || wirelessInterfaces.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingInterfaces ? "Đang tải..." : "Chọn interface"} />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(wirelessInterfaces) && wirelessInterfaces.map((iface: any) => (
                    <SelectItem key={iface.id} value={iface.id.toString()}>
                      {iface.name} ({iface.ssid || 'No SSID'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">
              <Wifi className="h-4 w-4 mr-2" /> Tổng quan
            </TabsTrigger>
            <TabsTrigger value="detail" disabled={!selectedDeviceId}>
              <Radio className="h-4 w-4 mr-2" /> Chi tiết
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-6">
            <WirelessStatus deviceId={selectedDeviceId} />
          </TabsContent>
          
          <TabsContent value="detail" className="space-y-4 mt-6">
            <WirelessDetail 
              deviceId={selectedDeviceId} 
              wirelessId={selectedWirelessId} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}