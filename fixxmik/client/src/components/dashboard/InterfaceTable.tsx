import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Interface } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InterfaceTableProps {
  deviceId: number | null;
}

interface InterfaceData {
  id: number;
  name: string;
  type: string | null;
  status: "up" | "down";
  macAddress: string | null;
  speed: string | null;
  rxBytes: number | null;
  txBytes: number | null;
  comment: string | null;
  disabled: boolean;
  user?: string;
  uptime?: string;
  activeAddress?: string;
}

interface PPPConnectionData {
  ".id": string;
  name: string;
  type: string;
  user?: string;
  uptime?: string;
  activeAddress?: string;
  service?: string;
  status?: string;
  running?: boolean;
  disabled?: boolean;
  comment?: string;
  macAddress?: string;
  txByte?: number;
  rxByte?: number;
  mtu?: number;
}

const InterfaceTable: React.FC<InterfaceTableProps> = ({ deviceId }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "up" | "down">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: interfaceData, isLoading } = useQuery({
    queryKey: deviceId ? ["/api/devices", deviceId, "interfaces"] : ["empty"],
    queryFn: async () => {
      if (!deviceId) return { interfaces: [], pppConnections: [] };

      // Thêm param để yêu cầu lấy thông tin PPP/L2TP
      const response = await fetch(
        `/api/devices/${deviceId}/interfaces?includePPPConnections=true`,
      );
      const data = await response.json();

      // Kiểm tra xem response có phải là object với interfaces và pppConnections không
      if (
        data &&
        typeof data === "object" &&
        "interfaces" in data &&
        "pppConnections" in data
      ) {
        return data;
      }

      // Nếu không có cấu trúc mới, trả về dữ liệu theo định dạng cũ
      return {
        interfaces: Array.isArray(data) ? data : [],
        pppConnections: [],
      };
    },
    enabled: !!deviceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation để bật/tắt interface
  const toggleInterfaceMutation = useMutation({
    mutationFn: async ({
      interfaceId,
      enable,
    }: {
      interfaceId: number;
      enable: boolean;
    }) => {
      const response = await fetch(`/api/interfaces/${interfaceId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, enable }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Lỗi khi thay đổi trạng thái interface",
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Hiển thị thông báo thành công
      toast({
        title: "Thành công",
        description: data.message,
        variant: "default",
      });

      // Làm mới dữ liệu interface
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["/api/devices", deviceId, "interfaces"],
        });
      }, 500);
    },
    onError: (error: Error) => {
      // Hiển thị thông báo lỗi
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 shadow-md flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Format and prepare interface data
  const formatInterfaceData = (
    ifaces: Interface[] | undefined,
  ): InterfaceData[] => {
    if (!ifaces || !Array.isArray(ifaces) || ifaces.length === 0) {
      return [];
    }

    // Xử lý ưu tiên hiển thị giao diện PPPoE
    const pppoePriority = ifaces.filter(
      (iface) =>
        iface.name &&
        (iface.name.toLowerCase().includes("pppoe") ||
          iface.name.toLowerCase().includes("ppp-") ||
          iface.name.toLowerCase().includes("l2tp")),
    );

    // Nếu có kết nối PPPoE, chỉ hiển thị chúng
    if (pppoePriority.length > 0) {
      console.log(
        "Đã tìm thấy kết nối PPPoE/L2TP: ",
        pppoePriority.map((i) => i.name).join(", "),
      );
      return pppoePriority.map((iface) => {
        return {
          id: iface.id,
          name: iface.name || `Kết nối #${iface.id}`,
          type: iface.name?.toLowerCase().includes("l2tp")
            ? "L2TP VPN"
            : "PPPoE",
          status: iface.isUp ? "up" : "down",
          macAddress: iface.macAddress || "dynamic",
          speed: iface.speed || (iface.isUp ? "100Mbps" : null),
          rxBytes: iface.rxBytes,
          txBytes: iface.txBytes,
          comment:
            iface.comment ||
            (iface.name?.toLowerCase().includes("l2tp")
              ? "Kết nối VPN"
              : "Kết nối Internet"),
          disabled: iface.disabled || false,
        };
      });
    }

    // Nếu không có kết nối PPPoE, quay về hiển thị mặc định
    return ifaces.map((iface) => {
      // Kiểm tra đặc biệt cho CAP interfaces
      const isCAPInterface =
        iface.type === "cap" ||
        iface.type === "CAP" ||
        (iface.name &&
          (iface.name.toLowerCase().includes("cap") ||
            iface.name.toLowerCase().includes("wlan")));

      // Một interface CHỈ được coi là UP khi:
      // 1. Nó có trạng thái isUp = true từ server, VÀ
      // 2. Nó không bị disabled
      const isUp = iface.isUp && !iface.disabled;

      return {
        id: iface.id,
        name: iface.name,
        type: iface.type || "Physical",
        status: isUp ? "up" : "down",
        macAddress: iface.macAddress,
        speed: iface.speed || (isUp ? "1Gbps" : null),
        rxBytes: iface.rxBytes,
        txBytes: iface.txBytes,
        comment: iface.comment,
        disabled: iface.disabled || false,
      };
    });
  };

  // Phân tích dữ liệu PPP connections nếu có
  const formatPPPConnectionData = (
    pppConns: PPPConnectionData[] | undefined,
  ): InterfaceData[] => {
    if (!pppConns || !Array.isArray(pppConns) || pppConns.length === 0) {
      return [];
    }

    return pppConns.map((conn, index) => {
      const isL2tp = conn.type === "l2tp";
      return {
        id: index + 1000, // ID cho các kết nối PPP - đặt giá trị lớn để tránh xung đột với interfaces thường
        name: conn.name || `${conn.type}-${index}`,
        type: isL2tp ? "L2TP VPN" : "PPPoE",
        status: conn.running ? "up" : "down",
        macAddress: conn.macAddress || "dynamic",
        speed: "100Mbps", // Giá trị mặc định cho kết nối PPP
        rxBytes: conn.rxByte || 0,
        txBytes: conn.txByte || 0,
        comment:
          conn.comment ||
          `Kết nối ${isL2tp ? "VPN" : "Internet"}: ${conn.user || "Unknown"}`,
        disabled: conn.disabled || false,
        user: conn.user,
        uptime: conn.uptime,
        activeAddress: conn.activeAddress,
      };
    });
  };

  // Get real interface data
  const interfaces = interfaceData?.interfaces || [];
  const pppConnections = interfaceData?.pppConnections || [];

  // Ưu tiên dữ liệu PPP connections nếu có
  let displayInterfaces: InterfaceData[] = [];

  if (pppConnections.length > 0) {
    console.log(
      "Đã tìm thấy kết nối PPPoE/L2TP từ API:",
      pppConnections.length,
    );
    displayInterfaces = formatPPPConnectionData(pppConnections);
  } else {
    // Nếu không có PPP connections từ API, sử dụng cách phát hiện cũ
    displayInterfaces = formatInterfaceData(interfaces);
  }

  // Format bytes to readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Filter interfaces based on search term, status and type
  const filteredInterfaces = displayInterfaces.filter((iface) => {
    // Filter by search term
    const matchesSearch =
      searchTerm === "" ||
      iface.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iface.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iface.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (iface.user &&
        iface.user.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter by status
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "up" && iface.status === "up") ||
      (statusFilter === "down" && iface.status === "down");

    // Filter by type
    const matchesType =
      typeFilter === "all" ||
      (iface.type &&
        iface.type.toLowerCase().includes(typeFilter.toLowerCase()));

    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique interface types for the filter dropdown
  const interfaceTypes = [
    "all",
    ...new Set(
      displayInterfaces.map((iface) =>
        iface.type ? iface.type.toLowerCase() : "unknown",
      ),
    ),
  ];

  return (
    <div className="bg-slate-900 rounded-lg shadow-md border border-slate-700 w-full">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
        <h3 className="font-medium text-white text-lg">Network Interfaces</h3>
        <div className="flex items-center">
          <span className="text-xs text-slate-400">
            {displayInterfaces.length} interfaces
          </span>
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 ml-2"></span>
        </div>
      </div>

      {/* Filter controls */}
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">Tìm kiếm</label>
          <Input
            placeholder="Tìm theo tên, nhận xét, loại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-300"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">
            Lọc theo trạng thái
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "all" | "up" | "down")
            }
          >
            <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-300">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-300">
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="up">Đang hoạt động (UP)</SelectItem>
              <SelectItem value="down">Không hoạt động (DOWN)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">Lọc theo loại</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-300">
              <SelectValue placeholder="Chọn loại interface" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-300">
              {interfaceTypes.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type === "all" ? "Tất cả loại" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="text-xs text-slate-400 font-semibold p-2">Type</th>
              <th className="text-xs text-slate-400 font-semibold p-2">Name</th>
              <th className="text-xs text-slate-400 font-semibold p-2">
                Status
              </th>
              <th className="text-xs text-slate-400 font-semibold p-2">MAC</th>
              <th className="text-xs text-slate-400 font-semibold p-2">
                Speed
              </th>
              <th className="text-xs text-slate-400 font-semibold p-2">MTU</th>
              <th className="text-xs text-slate-400 font-semibold p-2">RX</th>
              <th className="text-xs text-slate-400 font-semibold p-2">TX</th>
              <th className="text-xs text-slate-400 font-semibold p-2">
                Comment
              </th>
              <th className="text-xs text-slate-400 font-semibold p-2">
                Enable/Disable
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredInterfaces.length > 0 ? (
              filteredInterfaces.map((iface) => (
                <tr
                  key={iface.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <td className="text-slate-300 text-xs p-2 whitespace-nowrap">
                    {iface.type}
                  </td>
                  <td className="text-slate-300 text-xs p-2 font-medium whitespace-nowrap">
                    {iface.name}
                  </td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${iface.status === "up" ? "bg-green-500/30 text-green-400 border border-green-400" : "bg-red-500/30 text-red-400 border border-red-400"}`}
                    >
                      {iface.status === "up" ? "🟢 UP" : "🔴 DOWN"}
                    </span>
                  </td>
                  <td className="text-slate-300 text-xs p-2 font-mono">
                    {iface.macAddress || "-"}
                  </td>
                  <td className="text-slate-300 text-xs p-2">
                    {iface.speed || "-"}
                  </td>
                  <td className="text-slate-300 text-xs p-2">1500</td>
                  <td className="text-slate-300 text-xs p-2">
                    {formatBytes(iface.rxBytes || 0)}
                  </td>
                  <td className="text-slate-300 text-xs p-2">
                    {formatBytes(iface.txBytes || 0)}
                  </td>
                  <td className="text-slate-300 text-xs p-2 max-w-[200px] truncate">
                    {iface.comment || "-"}
                  </td>
                  <td className="text-slate-300 text-xs p-2">
                    <div className="flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Switch
                          checked={!iface.disabled}
                          onCheckedChange={(checked) => {
                            toggleInterfaceMutation.mutate({
                              interfaceId: iface.id,
                              enable: checked,
                            });
                          }}
                          disabled={toggleInterfaceMutation.isPending}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <span className="text-[10px] mt-1 font-medium">
                          {!iface.disabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="text-center p-4 text-slate-400">
                  {displayInterfaces.length > 0
                    ? "Không tìm thấy interface nào phù hợp với bộ lọc"
                    : "Không tìm thấy interface nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Filter information */}
      <div className="p-2 bg-slate-800/30 border-t border-slate-700 flex justify-between items-center text-xs text-slate-400">
        <div>
          Hiển thị {filteredInterfaces.length} / {displayInterfaces.length}{" "}
          interfaces
        </div>
        {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs hover:bg-slate-700 hover:text-slate-300"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
};

export default InterfaceTable;
