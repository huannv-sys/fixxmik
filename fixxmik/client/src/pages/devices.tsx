import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle, RefreshCw, Search, Server, Trash2, Wifi } from "lucide-react";

const DevicesPage = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDiscoverDialogOpen, setIsDiscoverDialogOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [formData, setFormData] = useState({
    name: "",
    ipAddress: "",
    username: "",
    password: "",
  });
  
  // Lấy danh sách thiết bị và kiểm tra trạng thái kết nối
  const { data: devices, isLoading, error, refetch: refetchDevices } = useQuery<Device[]>({ 
    queryKey: ['/api/devices?check=true'],
    staleTime: 15000, // 15 giây
    refetchInterval: 30000, // Tự động làm mới sau 30 giây
  });
  
  // Log lỗi và dữ liệu để debug
  console.log("Devices data:", devices);
  if (error) console.error("Error fetching devices:", error);
  
  // Lấy trạng thái các thiết bị từ scheduler
  const { data: deviceStatus, isLoading: isStatusLoading } = useQuery({ 
    queryKey: ['/api/scheduler/device-status'],
    refetchInterval: 5000, // Cập nhật mỗi 5 giây
  });
  
  // Mutation cho chức năng tìm kiếm thiết bị tự động
  const discoverMutation = useMutation({
    mutationFn: async (subnet: string) => {
      const response = await apiRequest('POST', '/api/devices/discover', { subnet });
      return await response.json();
    },
    onSuccess: async (response: any) => {
      toast({
        title: "Quét mạng hoàn tất",
        description: `Tìm thấy ${response.discoveredCount || 0} thiết bị mới.`,
      });
      
      // Cập nhật cache và tải lại danh sách thiết bị
      await queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      await refetchDevices();
      
      setIsDiscovering(false);
      setIsDiscoverDialogOpen(false);
    },
    onError: (error) => {
      console.error('Lỗi khi tìm kiếm thiết bị:', error);
      toast({
        title: "Lỗi tìm kiếm",
        description: "Không thể tìm kiếm thiết bị trên mạng. Vui lòng thử lại.",
        variant: "destructive",
      });
      setIsDiscovering(false);
    }
  });
  
  // Xử lý thay đổi input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Xử lý thêm thiết bị mới
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await apiRequest('POST', '/api/devices', formData);
      const newDevice = await response.json();
      console.log("Thiết bị mới được thêm:", newDevice);
      
      // Cập nhật cache và tải lại danh sách thiết bị
      await queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      await refetchDevices();
      
      setIsAddDialogOpen(false);
      setFormData({
        name: "",
        ipAddress: "",
        username: "",
        password: "",
      });
      toast({
        title: "Đã thêm thiết bị",
        description: "Thiết bị đã được thêm thành công.",
      });
    } catch (error) {
      console.error('Lỗi khi thêm thiết bị:', error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm thiết bị. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };
  
  // Xử lý tìm kiếm thiết bị tự động
  const handleDiscoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDiscovering(true);
    discoverMutation.mutate(subnet);
  };
  
  // Xử lý refresh thiết bị
  const handleRefreshDevice = async (deviceId: number) => {
    try {
      await apiRequest('POST', `/api/devices/${deviceId}/refresh`, {});
      
      // Cập nhật cache và tải lại danh sách thiết bị
      await queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      await refetchDevices();
      
      toast({
        title: "Đã cập nhật thiết bị",
        description: "Dữ liệu thiết bị đã được cập nhật thành công.",
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật thiết bị:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thiết bị. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };
  
  // Xử lý xóa thiết bị
  const handleDeleteDevice = async (deviceId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thiết bị này không?")) {
      return;
    }
    
    try {
      await apiRequest('DELETE', `/api/devices/${deviceId}`, {});
      
      // Cập nhật cache và tải lại danh sách thiết bị
      await queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      await refetchDevices();
      
      toast({
        title: "Đã xóa thiết bị",
        description: "Thiết bị đã được xóa thành công.",
      });
    } catch (error) {
      console.error('Lỗi khi xóa thiết bị:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa thiết bị. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };
  
  // Định dạng thời gian last seen
  const formatLastSeen = (date: string | Date | null | undefined) => {
    if (!date) return 'Chưa từng';
    
    const lastSeen = new Date(date);
    return lastSeen.toLocaleString();
  };
  
  // Tính toán uptime dựa trên chuỗi uptime từ RouterOS
  const formatUptime = (uptime: string | null | undefined) => {
    if (!uptime) return 'N/A';
    return uptime;
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý thiết bị</h1>
        <div className="flex space-x-2">
          {/* Discover dialog - Auto scan thiết bị */}
          <Dialog open={isDiscoverDialogOpen} onOpenChange={setIsDiscoverDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Tìm kiếm thiết bị
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tìm kiếm thiết bị tự động</DialogTitle>
                <DialogDescription>
                  Quét mạng để tìm thiết bị MikroTik. Nhập subnet để bắt đầu quét.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDiscoverSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="subnet">Subnet (CIDR)</Label>
                    <Input
                      id="subnet"
                      placeholder="192.168.1.0/24"
                      value={subnet}
                      onChange={(e) => setSubnet(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Ví dụ: 192.168.1.0/24 sẽ quét từ 192.168.1.1 đến 192.168.1.254
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isDiscovering}>
                    {isDiscovering ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Đang quét...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Bắt đầu quét
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add device dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Thêm thiết bị
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm thiết bị mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin thiết bị MikroTik bạn muốn giám sát.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFormSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Tên thiết bị</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Router văn phòng"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ipAddress">Địa chỉ IP</Label>
                    <Input
                      id="ipAddress"
                      name="ipAddress"
                      placeholder="192.168.1.1"
                      value={formData.ipAddress}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Tên đăng nhập</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="admin"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Thêm thiết bị</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View mode selector */}
      <div className="mb-6">
        <Tabs defaultValue="grid" value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'table')}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="grid">Chế độ lưới</TabsTrigger>
              <TabsTrigger value="table">Chế độ bảng</TabsTrigger>
            </TabsList>
            
            <div className="text-sm text-gray-500">
              {devices?.length || 0} thiết bị được tìm thấy
            </div>
          </div>
        </Tabs>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : devices && devices.length > 0 ? (
        viewMode === 'grid' ? (
          // Grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <Card key={device.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      <a href={`/dashboard?device=${device.id}`} className="hover:text-blue-500 hover:underline">
                        {device.name}
                      </a>
                    </CardTitle>
                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${device.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {device.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Server className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">{device.model || 'Unknown model'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Wifi className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">{device.ipAddress}</span>
                    </div>
                    {device.uptime && (
                      <div className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                          <polyline points="17 2 12 7 7 2"></polyline>
                        </svg>
                        <span className="text-gray-700">Uptime: {formatUptime(device.uptime)}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span className="text-gray-700">Cập nhật cuối: {formatLastSeen(device.lastSeen)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleRefreshDevice(device.id)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cập nhật
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteDevice(device.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          // Table view
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/5 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium">Thiết bị</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Địa chỉ IP</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Trạng thái</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Model</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Uptime</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Cập nhật cuối</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {devices.map((device) => (
                    <tr key={device.id} className="border-b transition-colors hover:bg-muted/5 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">
                        <a href={`/dashboard?device=${device.id}`} className="hover:text-blue-500 hover:underline">
                          {device.name}
                        </a>
                      </td>
                      <td className="p-4 align-middle">{device.ipAddress}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={device.isOnline ? "success" : "destructive"}>
                          {device.isOnline ? 'Online' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">{device.model || 'N/A'}</td>
                      <td className="p-4 align-middle">{formatUptime(device.uptime)}</td>
                      <td className="p-4 align-middle">{formatLastSeen(device.lastSeen)}</td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleRefreshDevice(device.id)}>
                            <RefreshCw className="h-4 w-4" />
                            <span className="sr-only">Cập nhật</span>
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteDevice(device.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa tìm thấy thiết bị nào</h3>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
              Thêm thiết bị MikroTik đầu tiên của bạn để bắt đầu giám sát, hoặc sử dụng tính năng tìm kiếm tự động để tìm thiết bị trên mạng.
            </p>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => setIsDiscoverDialogOpen(true)}>
                <Search className="h-5 w-5 mr-2" />
                Tìm kiếm thiết bị
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Thêm thiết bị
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DevicesPage;
