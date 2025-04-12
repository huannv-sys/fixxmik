import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CapsmanClient } from "@shared/schema";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  InfoIcon,
  SignalIcon,
  WifiIcon,
  UserIcon,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientsListProps {
  apId: number | null;
  apName?: string;
}

export default function ClientsList({ apId, apName }: ClientsListProps) {
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [signalFilter, setSignalFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: clients, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capsman", apId, "clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/capsman/${apId}/clients`);
      return res.json();
    },
    enabled: !!apId,
  });

  const getSignalIndicator = (signalStrength: number | null) => {
    if (signalStrength === null) return 0;

    if (signalStrength > -50) return 4;
    if (signalStrength > -60) return 3;
    if (signalStrength > -70) return 2;
    if (signalStrength > -80) return 1;
    return 0;
  };

  const getSignalColor = (signalStrength: number | null) => {
    if (signalStrength === null) return "text-gray-400";

    if (signalStrength > -50) return "text-green-500";
    if (signalStrength > -60) return "text-green-400";
    if (signalStrength > -70) return "text-yellow-400";
    if (signalStrength > -80) return "text-orange-400";
    return "text-red-500";
  };

  const renderSignalIcons = (signalStrength: number | null) => {
    const bars = getSignalIndicator(signalStrength);
    const color = getSignalColor(signalStrength);

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-${level + 1} w-1 rounded-sm ${level <= bars ? color : "bg-gray-200 dark:bg-gray-700"}`}
          />
        ))}
      </div>
    );
  };

  const toggleClientExpanded = (clientId: number) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiIcon className="h-4 w-4" />
            Đang tải danh sách người dùng...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiIcon className="h-4 w-4" />
            {apName ? `Người dùng kết nối - ${apName}` : "Người dùng kết nối"}
          </CardTitle>
          <CardDescription>
            Không có người dùng nào kết nối với điểm truy cập này
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Add filter and search helper functions
  const getSignalQuality = (signalStrength: number | null) => {
    if (signalStrength === null) return "unknown";
    if (signalStrength > -50) return "excellent";
    if (signalStrength > -60) return "good";
    if (signalStrength > -70) return "fair";
    if (signalStrength > -80) return "poor";
    return "bad";
  };

  // Filter clients based on search query, signal strength, and interface
  const filteredClients = useMemo(() => {
    return (
      clients?.filter((client) => {
        // Text search filter for hostname/IP
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          query === "" ||
          (client.hostname && client.hostname.toLowerCase().includes(query)) ||
          (client.ipAddress &&
            client.ipAddress.toLowerCase().includes(query)) ||
          (client.macAddress &&
            client.macAddress.toLowerCase().includes(query));

        // Signal quality filter
        const signalQuality = getSignalQuality(client.signalStrength);
        const matchesSignal =
          signalFilter === "all" || signalFilter === signalQuality;

        return matchesSearch && matchesSignal;
      }) || []
    );
  }, [clients, searchQuery, signalFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setSignalFilter("all");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WifiIcon className="h-4 w-4" />
          {apName ? `Người dùng kết nối - ${apName}` : "Người dùng kết nối"}
        </CardTitle>
        <CardDescription>
          {clients.length} người dùng đang kết nối
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`${showFilters ? "text-primary" : ""}`}
          >
            <Filter className="h-4 w-4 mr-1" />
            Lọc
          </Button>

          {(searchQuery || signalFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1" />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Tên, IP, MAC..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Chất lượng tín hiệu
              </label>
              <Select value={signalFilter} onValueChange={setSignalFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Tất cả tín hiệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tín hiệu</SelectItem>
                  <SelectItem value="excellent">
                    Xuất sắc (&gt; -50 dBm)
                  </SelectItem>
                  <SelectItem value="good">Tốt (-50 đến -60 dBm)</SelectItem>
                  <SelectItem value="fair">
                    Trung bình (-60 đến -70 dBm)
                  </SelectItem>
                  <SelectItem value="poor">Kém (-70 đến -80 dBm)</SelectItem>
                  <SelectItem value="bad">Yếu (&lt; -80 dBm)</SelectItem>
                  <SelectItem value="unknown">Không xác định</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên/IP</TableHead>
              <TableHead>Kết nối</TableHead>
              <TableHead>Tín hiệu</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <WifiIcon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                    {searchQuery ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Không tìm thấy kết quả nào cho "{searchQuery}"
                      </p>
                    ) : signalFilter !== "all" ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Không có thiết bị nào với mức tín hiệu đã chọn
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Không có thiết bị nào đang kết nối
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-blue-500" />
                    <div>
                      <div>{client.hostname || "Không xác định"}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.ipAddress || "Không xác định"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-500"
                      >
                        {client.interface || "wlan0"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <SignalIcon
                        className={`h-4 w-4 ${getSignalColor(client.signalStrength)}`}
                      />
                      <span>{client.signalStrength || "N/A"} dBm</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.connectedTime || "Không xác định"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <InfoIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">
                              Chi tiết kết nối
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Thông tin chi tiết về thiết bị đang kết nối
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-sm">MAC Address:</span>
                              <span className="col-span-2 text-sm font-medium">
                                {client.macAddress}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-sm">Tốc độ TX:</span>
                              <span className="col-span-2 text-sm font-medium">
                                {client.txRate || "Không xác định"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-sm">Tốc độ RX:</span>
                              <span className="col-span-2 text-sm font-medium">
                                {client.rxRate || "Không xác định"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-sm">Người dùng:</span>
                              <span className="col-span-2 text-sm font-medium">
                                {client.username || "Không xác định"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
