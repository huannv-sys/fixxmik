import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Device } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import NetworkScanner from "@/components/dashboard/NetworkScanner";

const SettingsPage = () => {
  const { toast } = useToast();
  const [pollingInterval, setPollingInterval] = useState<number>(60); // seconds
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState<boolean>(false);
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [alertThreshold, setAlertThreshold] = useState<number>(80); // percentage
  
  const { data: devices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });
  
  const handleUpdatePollingInterval = async () => {
    try {
      await apiRequest('POST', '/api/scheduler/polling-interval', {
        interval: pollingInterval * 1000 // Convert to milliseconds
      });
      
      toast({
        title: "Settings Updated",
        description: `Polling interval set to ${pollingInterval} seconds`,
      });
    } catch (error) {
      console.error('Failed to update polling interval:', error);
      toast({
        title: "Error",
        description: "Failed to update polling interval",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveNotificationSettings = async () => {
    try {
      // Make a real API call to save notification settings
      await apiRequest('POST', '/api/notification-settings', {
        emailEnabled: emailNotificationsEnabled,
        emailAddress: emailAddress,
        smsEnabled: smsNotificationsEnabled,
        phoneNumber: phoneNumber
      });
      
      toast({
        title: "Settings Updated",
        description: "Notification settings have been saved",
      });
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveAlertSettings = async () => {
    try {
      // Make a real API call to save alert settings
      await apiRequest('POST', '/api/alert-settings', {
        threshold: alertThreshold
      });
      
      toast({
        title: "Settings Updated",
        description: "Alert settings have been saved",
      });
    } catch (error) {
      console.error('Failed to save alert settings:', error);
      toast({
        title: "Error",
        description: "Failed to save alert settings",
        variant: "destructive",
      });
    }
  };
  
  const handleTestConnection = async (deviceId: number) => {
    try {
      await apiRequest('POST', `/api/devices/${deviceId}/refresh`, {});
      
      toast({
        title: "Connection Successful",
        description: "Test connection to the device was successful",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the device",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="general" className="space-y-4" autoCollapse>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
          <TabsTrigger value="devices">Device Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <div className="bg-[#0f172a] rounded-lg p-6">
            <div className="space-y-6">
              <h2 className="text-xl font-medium text-white">Polling Interval (seconds)</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Slider
                      id="polling-interval"
                      min={5}
                      max={300}
                      step={5}
                      value={[pollingInterval]}
                      onValueChange={(value) => setPollingInterval(value[0])}
                      className="bg-blue-500"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={pollingInterval}
                      onChange={(e) => setPollingInterval(parseInt(e.target.value) || 5)}
                      min={5}
                      max={300}
                      step={5}
                      className="bg-[#1e293b] border-0 text-white text-center"
                    />
                  </div>
                </div>
                
                <p className="text-sm text-gray-400">
                  Current setting: {pollingInterval} seconds
                </p>
                
                <div>
                  <Button 
                    onClick={handleUpdatePollingInterval} 
                    className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#0f172a] rounded-lg p-6">
            <h2 className="text-xl font-medium text-white mb-4">User Interface Settings</h2>
            <p className="text-gray-400 text-sm mb-6">Customize the appearance and behavior of the dashboard</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Theme</Label>
                <Select defaultValue="system">
                  <SelectTrigger className="bg-[#1e293b] border-0 text-white">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155] text-white">
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Time Format</Label>
                <Select defaultValue="24h">
                  <SelectTrigger className="bg-[#1e293b] border-0 text-white">
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155] text-white">
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh" className="text-gray-300">Auto-refresh Dashboard</Label>
                <Switch id="auto-refresh" defaultChecked className="bg-[#0EA5E9] data-[state=checked]:bg-[#0EA5E9]" />
              </div>
              
              <div>
                <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch 
                  id="email-notifications" 
                  checked={emailNotificationsEnabled}
                  onCheckedChange={setEmailNotificationsEnabled}
                />
              </div>
              
              {emailNotificationsEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input 
                    id="email-address" 
                    type="email" 
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <Switch 
                  id="sms-notifications" 
                  checked={smsNotificationsEnabled}
                  onCheckedChange={setSmsNotificationsEnabled}
                />
              </div>
              
              {smsNotificationsEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input 
                    id="phone-number" 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Notification Types</Label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="alert-notifications" defaultChecked />
                    <Label htmlFor="alert-notifications">Alerts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="status-notifications" defaultChecked />
                    <Label htmlFor="status-notifications">Status Changes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="performance-notifications" />
                    <Label htmlFor="performance-notifications">Performance Warnings</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotificationSettings}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
              <CardDescription>
                Configure threshold and behavior for system alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-threshold">CPU/Memory Alert Threshold (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    id="alert-threshold"
                    min={50}
                    max={95}
                    step={5}
                    value={[alertThreshold]}
                    onValueChange={(value) => setAlertThreshold(value[0])}
                    className="flex-1"
                  />
                  <div className="w-16">
                    <Input
                      type="number"
                      value={alertThreshold}
                      onChange={(e) => setAlertThreshold(parseInt(e.target.value) || 50)}
                      min={50}
                      max={95}
                      step={5}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Alerts will be triggered when CPU or memory usage exceeds {alertThreshold}%
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Alert Severity Levels</Label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="critical-alerts">Critical Alerts</Label>
                    <Switch id="critical-alerts" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="warning-alerts">Warning Alerts</Label>
                    <Switch id="warning-alerts" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="info-alerts">Info Alerts</Label>
                    <Switch id="info-alerts" defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Auto-Acknowledge Alerts</Label>
                <Select defaultValue="never">
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="24h">After 24 hours</SelectItem>
                    <SelectItem value="7d">After 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAlertSettings}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Connection Settings</CardTitle>
              <CardDescription>
                Configure connection settings for monitored devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices && devices.length > 0 ? (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.id} className="border rounded-md p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                          <h3 className="font-medium text-lg">{device.name}</h3>
                          <p className="text-sm text-gray-500">IP: {device.ipAddress}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-2 md:mt-0">
                          <Button 
                            variant="outline" 
                            onClick={() => handleTestConnection(device.id)}
                          >
                            Test Connection
                          </Button>
                          <Button variant="destructive" size="sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18" />
                              <path d="M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`username-${device.id}`}>Username</Label>
                          <Input id={`username-${device.id}`} defaultValue={device.username} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`password-${device.id}`}>Password</Label>
                          <Input id={`password-${device.id}`} type="password" defaultValue="••••••••" />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button>Update Credentials</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Add your first Mikrotik device to start monitoring.
                  </p>
                  <Button>Add Device</Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Network Scanner</CardTitle>
              <CardDescription>
                Scan your network to automatically discover MikroTik devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="card shadow-sm">
                <div className="card-header bg-secondary text-white d-flex align-items-center">
                  <i className="me-2 fas fa-network-wired" />
                  <h5 className="mb-0">Quét mạng tìm thiết bị MikroTik</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="autoDetect"
                      />
                      <label className="form-check-label" htmlFor="autoDetect">
                        Tự động phát hiện mạng
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Dải mạng cần quét (định dạng CIDR)</label>
                    <div className="mb-2">
                      <span className="badge bg-info me-2 mb-2 p-2">
                        192.168.1.0/24
                        <button
                          className="ms-2 btn-close btn-close-white"
                          style={{ fontSize: '0.5rem' }}
                          aria-label="Xóa"
                         />
                      </span>
                    </div>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: 192.168.1.0/24"
                      />
                      <button className="btn btn-outline-secondary">
                        <i className="fas fa-plus" /> Thêm
                      </button>
                    </div>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button className="btn btn-primary d-flex align-items-center justify-content-center">
                      <i className="fas fa-search me-2" /> Bắt đầu quét
                    </button>
                  </div>
                </div>
              </div>
              
              <NetworkScanner 
                onDeviceFound={(device) => {
                  console.log('Device found:', device);
                  // Handle the discovered device
                  // You could open a modal to add it or add it automatically
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;