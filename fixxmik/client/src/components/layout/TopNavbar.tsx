import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Device } from "@shared/schema";

interface TopNavbarProps {
  toggleSidebar: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ toggleSidebar }) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  
  const { data: devices, isLoading } = useQuery<Device[]>({ 
    queryKey: ['/api/devices'],
  });

  // Set the first device as selected by default when data loads
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  const selectedDevice = devices?.find(device => device.id === selectedDeviceId);

  const handleRefreshData = async () => {
    if (selectedDeviceId) {
      try {
        await apiRequest('POST', `/api/devices/${selectedDeviceId}/refresh`, {});
        // Invalidate queries to refresh the data
        window.location.reload();
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="text-slate-300 hover:text-blue-400 focus:outline-none mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-xl font-semibold text-white">Dashboard</div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-64 pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <button 
            className="relative p-1 text-slate-300 hover:text-blue-400 focus:outline-none"
            onClick={() => alert('Thông báo: Bạn không có cảnh báo mới nào')}
            title="Thông báo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
          </button>
          
          <button 
            className="p-1 text-slate-300 hover:text-blue-400 focus:outline-none"
            onClick={() => alert('Cài đặt: Chức năng đang được phát triển')}
            title="Cài đặt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Device Selector */}
      <div className="px-6 py-2 bg-slate-700 border-t border-slate-600 flex items-center flex-wrap gap-2">
        <span className="text-sm text-slate-300">Selected Device:</span>
        <select 
          className="p-1.5 text-sm border border-slate-500 rounded-md bg-slate-800 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={selectedDeviceId || ""}
          onChange={(e) => setSelectedDeviceId(parseInt(e.target.value))}
          disabled={isLoading}
        >
          {isLoading ? (
            <option>Loading devices...</option>
          ) : devices && devices.length > 0 ? (
            devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.ipAddress})
              </option>
            ))
          ) : (
            <option>No devices available</option>
          )}
        </select>
        {selectedDevice && (
          <div className="flex items-center space-x-1 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedDevice.isOnline ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${selectedDevice.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              {selectedDevice.isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="text-xs text-slate-300">Uptime: {selectedDevice.uptime || 'N/A'}</span>
          </div>
        )}
        <button 
          className="ml-auto text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
          onClick={handleRefreshData}
          disabled={!selectedDeviceId}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
