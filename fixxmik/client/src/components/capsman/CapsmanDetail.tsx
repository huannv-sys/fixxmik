import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CapsmanAP } from "@shared/schema";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WifiIcon,
  SignalIcon,
  InfoIcon,
  ServerIcon,
  BarChart4Icon,
  UsersIcon,
  RouterIcon,
} from "lucide-react";
import ClientsList from "./ClientsList";

interface CapsmanDetailProps {
  deviceId: number | null;
  apId: number | null;
}

export default function CapsmanDetail({ deviceId, apId }: CapsmanDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: capsmanAP, isLoading } = useQuery<any>({
    queryKey: ["/api/capsman", apId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/capsman/${apId}`);
      return res.json();
    },
    enabled: !!apId,
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!capsmanAP) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Không tìm thấy thông tin Access Point</CardTitle>
          <CardDescription>
            Không thể tải thông tin chi tiết của Access Point.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RouterIcon className="h-5 w-5 text-blue-500" />
              {capsmanAP.name || "Access Point không xác định"}
            </CardTitle>
            <CardDescription>
              {capsmanAP.identity || "ID không xác định"} | MAC:{" "}
              {capsmanAP.macAddress}
            </CardDescription>
          </div>
          <Badge
            variant={capsmanAP.state === "running" ? "success" : "destructive"}
            className="capitalize"
          >
            {capsmanAP.state || "Không xác định"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger className="flex items-center gap-2" value="overview">
              <InfoIcon className="h-4 w-4" />
              <span>Tổng quan</span>
            </TabsTrigger>
            <TabsTrigger
              className="flex items-center gap-2"
              value="performance"
            >
              <BarChart4Icon className="h-4 w-4" />
              <span>Hiệu suất</span>
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="clients">
              <UsersIcon className="h-4 w-4" />
              <span>Người dùng ({capsmanAP.clients || 0})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Trạng thái</h4>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          capsmanAP.state === "running"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span>{capsmanAP.state || "Không xác định"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Địa chỉ IP</h4>
                    <p>{capsmanAP.ipAddress || "Không xác định"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Thông tin thiết bị</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <p>{capsmanAP.model || "Không xác định"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phiên bản:</span>
                      <p>{capsmanAP.version || "Không xác định"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Serial Number:
                      </span>
                      <p>{capsmanAP.serialNumber || "Không xác định"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>
                      <p>{capsmanAP.uptime || "Không xác định"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Radio</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Radio Name:</span>
                      <p>{capsmanAP.radioName || "Không xác định"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Radio MAC:</span>
                      <p>{capsmanAP.radioMac || "Không xác định"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Thông tin kết nối</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Lần kết nối cuối:
                      </span>
                      <p>
                        {capsmanAP.lastSeen
                          ? format(
                              new Date(capsmanAP.lastSeen),
                              "dd/MM/yyyy HH:mm:ss",
                            )
                          : "Không xác định"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Số người dùng:
                      </span>
                      <p>{capsmanAP.clients || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Tín hiệu</h4>
                        <p className="text-sm text-muted-foreground">
                          Cường độ tín hiệu
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SignalIcon className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">
                          {capsmanAP.signalStrength !== undefined
                            ? `${capsmanAP.signalStrength} dBm`
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Kênh/Tần số</h4>
                        <p className="text-sm text-muted-foreground">
                          Kênh và tần số hoạt động
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <WifiIcon className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">
                          {capsmanAP.channel || "N/A"}
                          {capsmanAP.frequency
                            ? ` (${capsmanAP.frequency} MHz)`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Tốc độ</h4>
                        <p className="text-sm text-muted-foreground">
                          Tốc độ truyền/nhận dữ liệu
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-5 w-5 text-blue-500" />
                        <div className="text-right">
                          <div className="font-medium">
                            TX: {capsmanAP.txRate || "N/A"}
                          </div>
                          <div className="font-medium">
                            RX: {capsmanAP.rxRate || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Thông số vô tuyến</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tín hiệu:</span>
                        <p>
                          {capsmanAP.signalStrength !== undefined
                            ? `${capsmanAP.signalStrength} dBm`
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nhiễu:</span>
                        <p>
                          {capsmanAP.noiseFloor !== undefined
                            ? `${capsmanAP.noiseFloor} dBm`
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Khoảng cách:
                        </span>
                        <p>{capsmanAP.distance || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CCQ:</span>
                        <p>
                          {capsmanAP.ccq !== undefined
                            ? `${capsmanAP.ccq}%`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Hiệu suất truyền dữ liệu
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Tốc độ TX:
                        </span>
                        <p>{capsmanAP.txRate || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Tốc độ RX:
                        </span>
                        <p>{capsmanAP.rxRate || "N/A"}</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">
                        Chưa có dữ liệu thống kê hiệu suất theo thời gian cho
                        Access Point này.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <ClientsList apId={apId} apName={capsmanAP.name} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
