import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Device, Interface } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const NetworkPage = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  
  const { data: devices } = useQuery<Device[]>({ 
    queryKey: ['/api/devices'],
  });
  
  // Set selected device to the first device if none is selected
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);
  
  const { data: interfaces, isLoading } = useQuery<Interface[]>({ 
    queryKey: selectedDeviceId ? [`/api/devices/${selectedDeviceId}/interfaces`] : ['empty-interfaces'],
    enabled: Boolean(selectedDeviceId),
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const calculateUtilization = (rx: number, tx: number, maxSpeed: string) => {
    // Parse speed like "1 Gbps" to bits per second
    const speedMatch = maxSpeed.match(/(\d+)\s*(\w+)/);
    if (!speedMatch) return 0;
    
    const speedValue = parseInt(speedMatch[1]);
    const speedUnit = speedMatch[2].toLowerCase();
    
    let speedBps = speedValue;
    if (speedUnit.includes('gbps')) {
      speedBps = speedValue * 1000 * 1000 * 1000;
    } else if (speedUnit.includes('mbps')) {
      speedBps = speedValue * 1000 * 1000;
    } else if (speedUnit.includes('kbps')) {
      speedBps = speedValue * 1000;
    }
    
    // Assuming rx and tx are in bytes, convert to bits
    const totalBitRate = (rx + tx) * 8;
    
    // Calculate utilization percentage
    return Math.min(100, Math.round((totalBitRate / speedBps) * 100));
  };

  const getDeviceById = (id: number | null) => {
    if (!id || !devices) return null;
    return devices.find(device => device.id === id) || null;
  };

  const selectedDevice = getDeviceById(selectedDeviceId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Network Monitoring</h1>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Device:</span>
          <select 
            className="p-2 border border-gray-300 rounded-md bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedDeviceId || ""}
            onChange={(e) => setSelectedDeviceId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={!devices?.length}
          >
            {!devices?.length ? (
              <option>No devices available</option>
            ) : (
              devices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <Tabs defaultValue="interfaces" className="space-y-4" autoCollapse>
        <TabsList>
          <TabsTrigger value="interfaces">Network Interfaces</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          <TabsTrigger value="topology">Network Topology</TabsTrigger>
        </TabsList>
        
        <TabsContent value="interfaces" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : interfaces && interfaces.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Interface Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>MAC Address</TableHead>
                      <TableHead>Transmitted</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interfaces.map((iface: Interface) => {
                      const utilization = iface.speed ? calculateUtilization(iface.rxBytes || 0, iface.txBytes || 0, iface.speed) : 0;
                      
                      return (
                        <TableRow key={iface.id}>
                          <TableCell className="font-medium">{iface.name}</TableCell>
                          <TableCell>
                            <Badge variant={iface.running ? "success" : "destructive"}>
                              {iface.running ? "Up" : "Down"}
                            </Badge>
                          </TableCell>
                          <TableCell>{iface.type || "Unknown"}</TableCell>
                          <TableCell>{iface.speed || "Unknown"}</TableCell>
                          <TableCell>{iface.macAddress || "00:00:00:00:00:00"}</TableCell>
                          <TableCell>{formatBytes(iface.txBytes || 0)}</TableCell>
                          <TableCell>{formatBytes(iface.rxBytes || 0)}</TableCell>
                          <TableCell>
                            <div className="w-full flex items-center gap-2">
                              <Progress value={utilization} className="h-2" />
                              <span className="text-xs">{utilization}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No network interfaces found</h3>
                <p className="text-sm text-gray-500 text-center">
                  {selectedDevice ? `No network interfaces available for ${selectedDevice.name}.` : 'Please select a device to view network interfaces.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="traffic" className="space-y-4">
          <div className="bg-[#0f172a] rounded-lg p-4">
            <div className="flex space-x-2 mb-4">
              <button className="bg-[#1e293b] text-white px-4 py-2 rounded-md focus:outline-none font-medium text-sm">Network Interfaces</button>
              <button className="bg-[#0c4a6e] text-white px-4 py-2 rounded-md focus:outline-none font-medium text-sm">Traffic Analysis</button>
              <button className="bg-[#1e293b] text-white px-4 py-2 rounded-md focus:outline-none font-medium text-sm">Network Topology</button>
            </div>

            <div className="bg-[#0c1e36] rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <circle cx="12" cy="20" r="1" />
              </svg>
              <h3 className="text-2xl font-medium text-gray-100 mb-3">Traffic Analysis Coming Soon</h3>
              <p className="text-base text-gray-400 text-center max-w-md">
                Detailed traffic analysis features will be available in a future update.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="topology" className="space-y-4">
          <div className="bg-[#0f172a] rounded-lg p-4">
            <div className="flex space-x-2 mb-4">
              <button className="bg-[#1e293b] text-white px-4 py-2 rounded-md focus:outline-none font-medium text-sm">Network Interfaces</button>
              <button className="bg-[#1e293b] text-white px-4 py-2 rounded-md focus:outline-none font-medium text-sm">Traffic Analysis</button>
              <button className="bg-[#0c4a6e] text-white px-4 py-2 rounded-md focus:outline-none font-medium text-sm">Network Topology</button>
            </div>

            <div className="bg-[#0c1e36] rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <path d="M10 7h4"></path>
                <path d="M7 10v4"></path>
                <path d="M17 10v4"></path>
                <path d="M10 17h4"></path>
              </svg>
              <h3 className="text-2xl font-medium text-gray-100 mb-3">Network Topology Coming Soon</h3>
              <p className="text-base text-gray-400 text-center max-w-md">
                Visual network topology mapping will be available in a future update.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkPage;