import React, { useState, useEffect } from 'react';
import { useMicroAnimation, useMicroAnimationObject } from '@/hooks/useMicroAnimation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Cpu, 
  HardDrive as Memory, 
  Clock, 
  Server, 
  Activity, 
  Thermometer as ThermometerIcon, 
  Signal as SignalIcon,
  Wifi as WifiIcon,
  Plug as PlugIcon,
  CheckCircle2 as CheckCircle2Icon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  Router as RouterIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocketContext } from '@/lib/websocket-context';

interface DeviceStats {
  cpu: number;
  memory: number;
  uptime: string;
  temperature: number;
  interfaces: number;
  interfacesUp: number;
  signalStrength?: number;
  connectedClients?: number;
}

interface AnimatedDeviceStatusCardProps {
  deviceId: number;
  deviceName: string;
  deviceType: string;
  deviceStats: DeviceStats;
  deviceModel?: string;
  isOnline?: boolean;
  firmwareVersion?: string;
  lastUpdated?: string;
  className?: string;
}

const secondsToHumanReadable = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const AnimatedDeviceStatusCard: React.FC<AnimatedDeviceStatusCardProps> = ({
  deviceId,
  deviceName,
  deviceType,
  deviceStats,
  deviceModel = '',
  isOnline = true,
  firmwareVersion = '',
  lastUpdated = '',
  className = '',
}) => {
  // States for previous stats to animate from
  const [prevStats, setPrevStats] = useState<DeviceStats>(deviceStats);
  const [showPulse, setShowPulse] = useState(false);

  // Connect to WebSocket
  const { connected, lastMessage, subscribeToTopic, unsubscribeFromTopic } = useWebSocketContext();

  // Subscribe to device status updates
  useEffect(() => {
    if (connected && deviceId) {
      const topic = `device_status_${deviceId}`;
      subscribeToTopic(topic);
      
      return () => {
        unsubscribeFromTopic(topic);
      };
    }
  }, [connected, deviceId, subscribeToTopic, unsubscribeFromTopic]);

  // Process WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'device_status' && lastMessage.deviceId === deviceId) {
      // Store previous stats for animation
      setPrevStats(deviceStats);
      
      // Trigger pulse animation
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 1500);
      
      return () => clearTimeout(timer);
    }
  }, [lastMessage, deviceId, deviceStats]);

  // Animate CPU usage
  const animatedCpu = useMicroAnimation(deviceStats.cpu, {
    duration: 1000,
    initialValue: prevStats.cpu
  });

  // Animate Memory usage
  const animatedMemory = useMicroAnimation(deviceStats.memory, {
    duration: 1000,
    initialValue: prevStats.memory
  });

  // Animate other numeric values
  const animatedExtras = useMicroAnimationObject({
    temperature: deviceStats.temperature,
    interfacesUp: deviceStats.interfacesUp,
    signalStrength: deviceStats.signalStrength || 0,
    connectedClients: deviceStats.connectedClients || 0
  }, {
    duration: 1000
  });

  // CPU color based on usage
  const getCpuColor = (usage: number): string => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-orange-500';
    if (usage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Memory color based on usage
  const getMemoryColor = (usage: number): string => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-orange-500';
    if (usage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Temperature color based on value
  const getTemperatureColor = (temp: number): string => {
    if (temp >= 80) return 'text-red-500';
    if (temp >= 70) return 'text-orange-500';
    if (temp >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Signal strength indicator
  const getSignalStrength = (signal?: number): React.ReactNode => {
    if (signal === undefined) return null;
    
    let signalClass = '';
    let bars = 0;
    
    if (signal > -50) {
      signalClass = 'text-green-500';
      bars = 4;
    } else if (signal > -65) {
      signalClass = 'text-green-400';
      bars = 3;
    } else if (signal > -75) {
      signalClass = 'text-yellow-500';
      bars = 2;
    } else {
      signalClass = 'text-red-500';
      bars = 1;
    }
    
    return (
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 mb-1">Signal</span>
        <div className="flex items-center">
          <SignalIcon className={cn("h-4 w-4 mr-1", signalClass)} />
          <span className="text-sm">{signal} dBm</span>
        </div>
      </div>
    );
  };

  // Interface status
  const getInterfaceStatus = (): React.ReactNode => {
    const percentage = deviceStats.interfaces 
      ? (deviceStats.interfacesUp / deviceStats.interfaces) * 100 
      : 0;
    
    let statusColor = '';
    if (percentage === 100) {
      statusColor = 'text-green-500';
    } else if (percentage >= 80) {
      statusColor = 'text-yellow-500';
    } else {
      statusColor = 'text-red-500';
    }
    
    return (
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 mb-1">Interfaces</span>
        <div className={cn("flex items-center font-medium", statusColor)}>
          {Math.round(animatedExtras.interfacesUp)} / {deviceStats.interfaces}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "overflow-hidden relative bg-slate-950 border-slate-800 transition-all duration-300",
      className,
      showPulse ? "shadow-lg" : "shadow"
    )}>
      {/* Pulse animation overlay */}
      {showPulse && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            animation: "pulse-fade 1.5s ease-in-out" 
          }}
        />
      )}
      
      <CardHeader className="pb-2 pt-4 px-4 bg-slate-950 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium text-gray-200 flex items-center">
            <RouterIcon className="h-4 w-4 mr-2 text-blue-400" />
            {deviceName}
            
            <Badge variant={isOnline ? "success" : "destructive"} className="ml-2 px-1">
              {isOnline ? "ONLINE" : "OFFLINE"}
            </Badge>
          </CardTitle>
          
          <Badge variant="outline" className="text-xs font-normal">
            {deviceType}
          </Badge>
        </div>
        {deviceModel && (
          <div className="mt-1 text-xs text-gray-400">{deviceModel}</div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 bg-slate-900">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* CPU Usage */}
          <div className="bg-slate-800 p-3 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center text-sm font-medium text-gray-300">
                <Cpu className="h-3.5 w-3.5 mr-1.5" />
                CPU
              </div>
              <span className="text-sm font-semibold">{Math.round(animatedCpu)}%</span>
            </div>
            <Progress 
              value={animatedCpu} 
              className={cn("h-2 mt-1 transition-all", getCpuColor(animatedCpu))} 
            />
          </div>
          
          {/* Memory Usage */}
          <div className="bg-slate-800 p-3 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center text-sm font-medium text-gray-300">
                <Memory className="h-3.5 w-3.5 mr-1.5" />
                Memory
              </div>
              <span className="text-sm font-semibold">{Math.round(animatedMemory)}%</span>
            </div>
            <Progress 
              value={animatedMemory} 
              className={cn("h-2 mt-1 transition-all", getMemoryColor(animatedMemory))} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 xs:grid-cols-2 gap-x-4 gap-y-4">
          {/* Uptime */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Uptime</span>
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 text-blue-400 mr-1.5" />
              <span className="text-sm">{deviceStats.uptime}</span>
            </div>
          </div>
          
          {/* Temperature */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Temperature</span>
            <div className="flex items-center">
              <ThermometerIcon className={cn(
                "h-3.5 w-3.5 mr-1.5", 
                getTemperatureColor(animatedExtras.temperature)
              )} />
              <span className="text-sm">{Math.round(animatedExtras.temperature)}°C</span>
            </div>
          </div>
          
          {/* Interface Status */}
          {getInterfaceStatus()}
          
          {/* Signal Strength (if applicable) */}
          {deviceStats.signalStrength !== undefined && getSignalStrength(animatedExtras.signalStrength)}
          
          {/* Connected Clients (if applicable) */}
          {deviceStats.connectedClients !== undefined && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 mb-1">Clients</span>
              <div className="flex items-center">
                <WifiIcon className="h-3.5 w-3.5 text-indigo-400 mr-1.5" />
                <span className="text-sm">{Math.round(animatedExtras.connectedClients)}</span>
              </div>
            </div>
          )}
          
          {/* Firmware Version */}
          {firmwareVersion && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 mb-1">Firmware</span>
              <span className="text-sm truncate" style={{ maxWidth: '100px' }}>{firmwareVersion}</span>
            </div>
          )}
        </div>
        
        {/* Status and real-time update indicator */}
        {connected && (
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
              <span>Real-time updates active</span>
            </div>
            {lastUpdated && <span>Updated: {lastUpdated}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};