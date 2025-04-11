import { useDevices, useSyncFirewallRules } from '@/hooks/use-mikrotik';
import { RefreshCw, Plus } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface DeviceSelectorProps {
  selectedDeviceId: number | null;
  onSelectDevice: (deviceId: number) => void;
  selectedChain: string;
  onSelectChain: (chain: string) => void;
}

export default function DeviceSelector({ 
  selectedDeviceId, 
  onSelectDevice,
  selectedChain,
  onSelectChain
}: DeviceSelectorProps) {
  const { data: devices, isLoading } = useDevices();
  const syncMutation = useSyncFirewallRules(selectedDeviceId || 0);
  
  const chains = [
    'All Chains',
    'forward',
    'input',
    'output'
  ];

  const handleSyncRules = () => {
    if (selectedDeviceId) {
      syncMutation.mutate();
    }
  };

  return (
    <div className="px-6 py-3 bg-card border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="device" className="block text-xs text-muted-foreground mb-1">
              Selected Device:
            </label>
            <Select
              value={selectedDeviceId?.toString() || ""}
              onValueChange={(value) => onSelectDevice(parseInt(value))}
              disabled={isLoading || !devices?.length}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select device..." />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.name} ({device.address})
                    {!device.isConnected && " (Disconnected)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="chain" className="block text-xs text-muted-foreground mb-1">
              Firewall Chain:
            </label>
            <Select
              value={selectedChain}
              onValueChange={onSelectChain}
              disabled={!selectedDeviceId}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select chain..." />
              </SelectTrigger>
              <SelectContent>
                {chains.map((chain) => (
                  <SelectItem key={chain} value={chain}>
                    {chain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncRules}
            disabled={!selectedDeviceId || syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Refresh Rules</span>
          </Button>
          <Button 
            size="sm"
            disabled={!selectedDeviceId}
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>Add Rule</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
