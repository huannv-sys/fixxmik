import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import TrafficVisualizations from "@/components/visualizations/TrafficVisualizations";

// Define firewall rule types
interface FirewallRule {
  id: number;
  name: string;
  chain: string;
  action: "accept" | "drop" | "reject";
  protocol: string;
  dstPort: string;
  srcAddress?: string;
  dstAddress?: string;
  state: "enabled" | "disabled";
  comment?: string;
}

// Initial form state for new firewall rules
const initialFirewallForm: Omit<FirewallRule, "id"> = {
  name: "",
  chain: "forward",
  action: "accept",
  protocol: "tcp",
  dstPort: "",
  state: "enabled",
  comment: ""
};

const SecurityPage = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [firewallForm, setFirewallForm] = useState<Omit<FirewallRule, "id">>(initialFirewallForm);
  
  const { data: devices } = useQuery<Device[]>({ 
    queryKey: ['/api/devices'],
  });
  
  // Set selected device to the first device if none is selected
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // Fetch firewall rules data from API
  const { data: firewallRulesData } = useQuery<FirewallRule[]>({
    queryKey: ['/api/devices', selectedDeviceId, 'firewall'],
    enabled: !!selectedDeviceId,
  });
  
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  
  // Update firewall rules when data is fetched
  useEffect(() => {
    if (firewallRulesData) {
      setFirewallRules(firewallRulesData);
    } else {
      setFirewallRules([]);
    }
  }, [firewallRulesData]);
  
  // Fetch security threats data from API
  const { data: securityThreatsData } = useQuery<any[]>({
    queryKey: ['/api/devices', selectedDeviceId, 'security-threats'],
    enabled: !!selectedDeviceId,
  });
  
  const [securityThreats, setSecurityThreats] = useState<any[]>([]);
  
  // Update security threats when data is fetched
  useEffect(() => {
    if (securityThreatsData) {
      setSecurityThreats(securityThreatsData);
    } else {
      setSecurityThreats([]);
    }
  }, [securityThreatsData]);

  // Fetch VPN users data from API
  const { data: vpnUsersData } = useQuery<any[]>({
    queryKey: ['/api/devices', selectedDeviceId, 'vpn-users'],
    enabled: !!selectedDeviceId,
  });
  
  const [vpnUsers, setVpnUsers] = useState<any[]>([]);
  
  // Update VPN users when data is fetched
  useEffect(() => {
    if (vpnUsersData) {
      setVpnUsers(vpnUsersData);
    } else {
      setVpnUsers([]);
    }
  }, [vpnUsersData]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDeviceById = (id: number | null) => {
    if (!id || !devices) return null;
    return devices.find(device => device.id === id) || null;
  };

  const selectedDevice = getDeviceById(selectedDeviceId);

  const getSeverityBadge = (severity: string) => {
    if (!severity) return <Badge>Unknown</Badge>;
    
    switch (severity.toLowerCase()) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-red-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500">Low</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Firewall management functions
  const handleAddRule = () => {
    setFirewallForm(initialFirewallForm);
    setIsAddRuleDialogOpen(true);
  };

  const handleEditRule = (id: number) => {
    const rule = firewallRules.find(r => r.id === id);
    if (rule) {
      setSelectedRuleId(id);
      setFirewallForm({
        name: rule.name,
        chain: rule.chain,
        action: rule.action,
        protocol: rule.protocol,
        dstPort: rule.dstPort,
        srcAddress: rule.srcAddress || "",
        dstAddress: rule.dstAddress || "",
        state: rule.state,
        comment: rule.comment || ""
      });
      setIsEditRuleDialogOpen(true);
    }
  };

  const handleDeleteRule = (id: number) => {
    setSelectedRuleId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleFirewallFormChange = (field: keyof Omit<FirewallRule, "id">, value: string) => {
    setFirewallForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStateChange = (checked: boolean) => {
    setFirewallForm(prev => ({
      ...prev,
      state: checked ? "enabled" : "disabled"
    }));
  };

  const saveFirewallRule = () => {
    if (!firewallForm.name || !firewallForm.dstPort) {
      toast({
        title: "Validation Error",
        description: "Rule name and destination port are required.",
        variant: "destructive"
      });
      return;
    }

    if (isEditRuleDialogOpen && selectedRuleId) {
      // Update existing rule
      setFirewallRules(prev => 
        prev.map(rule => 
          rule.id === selectedRuleId ? { ...firewallForm, id: selectedRuleId } : rule
        )
      );
      setIsEditRuleDialogOpen(false);
      toast({
        title: "Success",
        description: "Firewall rule updated successfully.",
      });
    } else {
      // Add new rule
      const newId = Math.max(0, ...firewallRules.map(r => r.id)) + 1;
      setFirewallRules(prev => [...prev, { ...firewallForm, id: newId }]);
      setIsAddRuleDialogOpen(false);
      toast({
        title: "Success",
        description: "New firewall rule added successfully.",
      });
    }
  };

  const confirmDeleteRule = () => {
    if (selectedRuleId) {
      setFirewallRules(prev => prev.filter(rule => rule.id !== selectedRuleId));
      setIsDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Firewall rule deleted successfully.",
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Security Monitoring</h1>
        
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

      <Tabs defaultValue="threats" className="space-y-4" autoCollapse>
        <TabsList>
          <TabsTrigger value="threats">Security Threats</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          <TabsTrigger value="firewall">Firewall Rules</TabsTrigger>
          <TabsTrigger value="vpn">VPN Status</TabsTrigger>
        </TabsList>
        
        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Security Threats</CardTitle>
            </CardHeader>
            <CardContent>
              {securityThreats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Last Attempt</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityThreats.map((threat) => (
                      <TableRow key={threat.id}>
                        <TableCell className="font-medium">{threat.type}</TableCell>
                        <TableCell>{threat.source}</TableCell>
                        <TableCell>{threat.target}</TableCell>
                        <TableCell>{threat.count}</TableCell>
                        <TableCell>{formatDateTime(threat.lastAttempt)}</TableCell>
                        <TableCell>{getSeverityBadge(threat.severity)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">Block</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Threats Detected</h3>
                  <p className="text-sm text-gray-500 text-center">
                    No current security threats have been detected for this device.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phân tích lưu lượng và phát hiện xâm nhập</CardTitle>
              <CardDescription>
                Biểu đồ và trực quan hóa dữ liệu lưu lượng mạng kết hợp với hệ thống phát hiện xâm nhập dựa trên AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDeviceId ? (
                <TrafficVisualizations 
                  deviceId={selectedDeviceId} 
                  refreshInterval={30000}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn thiết bị</h3>
                  <p className="text-sm text-gray-500 text-center">
                    Vui lòng chọn một thiết bị để xem biểu đồ phân tích lưu lượng.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="firewall" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Firewall Rules</CardTitle>
              <Button onClick={handleAddRule}>Add Rule</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Dst. Port</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {firewallRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{rule.chain}</TableCell>
                      <TableCell>
                        <Badge variant={rule.action === "accept" ? "outline" : "destructive"}>
                          {rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.protocol}</TableCell>
                      <TableCell>{rule.dstPort}</TableCell>
                      <TableCell>
                        <Badge variant={rule.state === "enabled" ? "default" : "secondary"}>
                          {rule.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditRule(rule.id)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRule(rule.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            {/* Dialog for adding a new firewall rule */}
            <Dialog open={isAddRuleDialogOpen} onOpenChange={setIsAddRuleDialogOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Firewall Rule</DialogTitle>
                  <DialogDescription>
                    Create a new firewall rule for your device. Fill in the details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="name">Rule Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g., Allow HTTP Traffic" 
                        value={firewallForm.name}
                        onChange={(e) => handleFirewallFormChange("name", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="chain">Chain</Label>
                      <Select 
                        value={firewallForm.chain}
                        onValueChange={(value) => handleFirewallFormChange("chain", value)}
                      >
                        <SelectTrigger id="chain">
                          <SelectValue placeholder="Select Chain" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="forward">Forward</SelectItem>
                          <SelectItem value="input">Input</SelectItem>
                          <SelectItem value="output">Output</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="action">Action</Label>
                      <Select 
                        value={firewallForm.action}
                        onValueChange={(value) => handleFirewallFormChange("action", value as "accept" | "drop" | "reject")}
                      >
                        <SelectTrigger id="action">
                          <SelectValue placeholder="Select Action" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="accept">Accept</SelectItem>
                          <SelectItem value="drop">Drop</SelectItem>
                          <SelectItem value="reject">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="protocol">Protocol</Label>
                      <Select 
                        value={firewallForm.protocol}
                        onValueChange={(value) => handleFirewallFormChange("protocol", value)}
                      >
                        <SelectTrigger id="protocol">
                          <SelectValue placeholder="Select Protocol" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="tcp">TCP</SelectItem>
                          <SelectItem value="udp">UDP</SelectItem>
                          <SelectItem value="icmp">ICMP</SelectItem>
                          <SelectItem value="any">Any</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="dstPort">Destination Port</Label>
                      <Input 
                        id="dstPort" 
                        placeholder="e.g., 80 or 443" 
                        value={firewallForm.dstPort}
                        onChange={(e) => handleFirewallFormChange("dstPort", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="state" className="mb-2">Rule Status</Label>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="state" 
                          checked={firewallForm.state === "enabled"}
                          onCheckedChange={handleStateChange}
                        />
                        <Label htmlFor="state" className="ml-2">
                          {firewallForm.state === "enabled" ? "Enabled" : "Disabled"}
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <h4 className="text-sm font-medium">Advanced Settings</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="srcAddress">Source Address</Label>
                      <Input 
                        id="srcAddress" 
                        placeholder="e.g., 192.168.1.0/24" 
                        value={firewallForm.srcAddress}
                        onChange={(e) => handleFirewallFormChange("srcAddress", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="dstAddress">Destination Address</Label>
                      <Input 
                        id="dstAddress" 
                        placeholder="e.g., 8.8.8.8" 
                        value={firewallForm.dstAddress}
                        onChange={(e) => handleFirewallFormChange("dstAddress", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="comment">Comment</Label>
                    <Input 
                      id="comment" 
                      placeholder="Optional description for this rule" 
                      value={firewallForm.comment}
                      onChange={(e) => handleFirewallFormChange("comment", e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddRuleDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveFirewallRule}>Add Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog for editing an existing firewall rule */}
            <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Edit Firewall Rule</DialogTitle>
                  <DialogDescription>
                    Update the details of this firewall rule.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-name">Rule Name</Label>
                      <Input 
                        id="edit-name" 
                        value={firewallForm.name}
                        onChange={(e) => handleFirewallFormChange("name", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-chain">Chain</Label>
                      <Select 
                        value={firewallForm.chain}
                        onValueChange={(value) => handleFirewallFormChange("chain", value)}
                      >
                        <SelectTrigger id="edit-chain">
                          <SelectValue placeholder="Select Chain" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="forward">Forward</SelectItem>
                          <SelectItem value="input">Input</SelectItem>
                          <SelectItem value="output">Output</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-action">Action</Label>
                      <Select 
                        value={firewallForm.action}
                        onValueChange={(value) => handleFirewallFormChange("action", value as "accept" | "drop" | "reject")}
                      >
                        <SelectTrigger id="edit-action">
                          <SelectValue placeholder="Select Action" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="accept">Accept</SelectItem>
                          <SelectItem value="drop">Drop</SelectItem>
                          <SelectItem value="reject">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-protocol">Protocol</Label>
                      <Select 
                        value={firewallForm.protocol}
                        onValueChange={(value) => handleFirewallFormChange("protocol", value)}
                      >
                        <SelectTrigger id="edit-protocol">
                          <SelectValue placeholder="Select Protocol" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="tcp">TCP</SelectItem>
                          <SelectItem value="udp">UDP</SelectItem>
                          <SelectItem value="icmp">ICMP</SelectItem>
                          <SelectItem value="any">Any</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-dstPort">Destination Port</Label>
                      <Input 
                        id="edit-dstPort" 
                        value={firewallForm.dstPort}
                        onChange={(e) => handleFirewallFormChange("dstPort", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-state" className="mb-2">Rule Status</Label>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="edit-state" 
                          checked={firewallForm.state === "enabled"}
                          onCheckedChange={handleStateChange}
                        />
                        <Label htmlFor="edit-state" className="ml-2">
                          {firewallForm.state === "enabled" ? "Enabled" : "Disabled"}
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <h4 className="text-sm font-medium">Advanced Settings</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-srcAddress">Source Address</Label>
                      <Input 
                        id="edit-srcAddress" 
                        value={firewallForm.srcAddress}
                        onChange={(e) => handleFirewallFormChange("srcAddress", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="edit-dstAddress">Destination Address</Label>
                      <Input 
                        id="edit-dstAddress" 
                        value={firewallForm.dstAddress}
                        onChange={(e) => handleFirewallFormChange("dstAddress", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="edit-comment">Comment</Label>
                    <Input 
                      id="edit-comment" 
                      value={firewallForm.comment}
                      onChange={(e) => handleFirewallFormChange("comment", e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditRuleDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveFirewallRule}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog for confirming rule deletion */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Confirm Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this firewall rule? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={confirmDeleteRule}>Delete Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </TabsContent>
        
        <TabsContent value="vpn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>VPN Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Connected Since</TableHead>
                    <TableHead>Data Received</TableHead>
                    <TableHead>Data Sent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vpnUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "success" : "secondary"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.ipAddress}</TableCell>
                      <TableCell>{user.status === "active" ? formatDateTime(user.connectedSince) : "—"}</TableCell>
                      <TableCell>{formatBytes(user.bytesReceived)}</TableCell>
                      <TableCell>{formatBytes(user.bytesSent)}</TableCell>
                      <TableCell>
                        {user.status === "active" && (
                          <Button variant="destructive" size="sm">Disconnect</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityPage;