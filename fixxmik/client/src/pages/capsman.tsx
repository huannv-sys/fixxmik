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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Radio, SignalHigh } from "lucide-react";
import CapsmanStatus from "@/components/capsman/CapsmanStatus";
import CapsmanDetail from "@/components/capsman/CapsmanDetail";

export default function CapsmanPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedAPId, setSelectedAPId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const {
    data: devices,
    isLoading: isLoadingDevices,
    error: devicesError,
  } = useQuery({
    queryKey: ["/api/devices"],
  });

  // Lọc ra các thiết bị có CAPsMAN
  const capsmanDevices = Array.isArray(devices)
    ? devices.filter((device: any) => device.hasCAPsMAN)
    : [];

  // Lấy thông tin CAPsMAN APs của thiết bị đã chọn
  const { data: capsmanAPs, isLoading: isLoadingAPs } = useQuery({
    queryKey: selectedDeviceId
      ? [`/api/devices/${selectedDeviceId}/capsman`]
      : [],
    enabled: !!selectedDeviceId,
  });

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(parseInt(deviceId));
    setSelectedAPId(null); // Reset AP selection
  };

  const handleAPChange = (apId: string) => {
    setSelectedAPId(parseInt(apId));
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
        <h1 className="text-3xl font-bold tracking-tight">Quản lý CAPsMAN</h1>
        <p className="text-muted-foreground">
          Giám sát và quản lý CAPsMAN Access Points
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Chọn thiết bị</CardTitle>
            <CardDescription>Thiết bị có CAPsMAN Controller</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              onValueChange={handleDeviceChange}
              value={selectedDeviceId?.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn thiết bị" />
              </SelectTrigger>
              <SelectContent>
                {capsmanDevices.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Không có thiết bị nào hỗ trợ CAPsMAN
                  </SelectItem>
                ) : (
                  capsmanDevices.map((device: any) => (
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
              <CardTitle>Chọn Access Point</CardTitle>
              <CardDescription>APs được quản lý bởi CAPsMAN</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                onValueChange={handleAPChange}
                value={selectedAPId?.toString()}
                disabled={
                  isLoadingAPs ||
                  !capsmanAPs ||
                  !Array.isArray(capsmanAPs) ||
                  capsmanAPs.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingAPs ? "Đang tải..." : "Chọn AP"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(capsmanAPs) &&
                    capsmanAPs.map((ap: any) => (
                      <SelectItem key={ap.id} value={ap.id.toString()}>
                        {ap.identity || ap.name}
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
              <Radio className="h-4 w-4 mr-2" /> Tổng quan
            </TabsTrigger>
            <TabsTrigger value="detail" disabled={!selectedDeviceId}>
              <SignalHigh className="h-4 w-4 mr-2" /> Chi tiết
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <CapsmanStatus deviceId={selectedDeviceId} />
          </TabsContent>

          <TabsContent value="detail" className="space-y-4 mt-6">
            <CapsmanDetail deviceId={selectedDeviceId} apId={selectedAPId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
