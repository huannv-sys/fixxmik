import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Interface } from "@shared/schema";

interface InterfaceStatusProps {
  deviceId: number | null;
}

// Format bytes to human-readable format
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format bits per second (bps) to human-readable format
const formatBitsPerSecond = (bps: number) => {
  if (bps === 0) return '0 bps';
  
  const k = 1000;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  const i = Math.floor(Math.log(bps) / Math.log(k));
  
  return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Interface for tracking detailed traffic stats
interface TrafficStats {
  txRate: number;           // Bits per second (Tx)
  rxRate: number;           // Bits per second (Rx)
  txPacketRate: number;     // Packets per second (Tx)
  rxPacketRate: number;     // Packets per second (Rx)
  totalTxBytes: number;     // Total bytes sent
  totalRxBytes: number;     // Total bytes received
  totalTxPackets: number;   // Total packets sent
  totalRxPackets: number;   // Total packets received
  txDrops: number;          // Tx dropped packets
  rxDrops: number;          // Rx dropped packets
  txErrors: number;         // Tx errors
  rxErrors: number;         // Rx errors
  txQueueDrops: number;     // Tx queue drops
  history: {
    timestamp: number;
    txRate: number;
    rxRate: number;
  }[];                      // History data for charts
}

// Create a new component for detailed interface view
const DetailedInterfaceCard = ({ iface }: { iface: Interface }) => {
  // State for traffic statistics with history
  const [trafficStats, setTrafficStats] = useState<TrafficStats>({
    txRate: 0,
    rxRate: 0,
    txPacketRate: 0,
    rxPacketRate: 0,
    totalTxBytes: iface.txBytes || 0,
    totalRxBytes: iface.rxBytes || 0,
    totalTxPackets: iface.txPackets || 0,
    totalRxPackets: iface.rxPackets || 0,
    txDrops: iface.txDrops || 0,
    rxDrops: iface.rxDrops || 0,
    txErrors: iface.txErrors || 0,
    rxErrors: iface.rxErrors || 0,
    txQueueDrops: 0,
    history: []
  });
  
  // Refs for previous values to calculate rates
  const prevValues = useRef({
    timestamp: Date.now(),
    txBytes: iface.txBytes || 0,
    rxBytes: iface.rxBytes || 0,
    txPackets: iface.txPackets || 0,
    rxPackets: iface.rxPackets || 0
  });
  
  // Generate random variations for simulating real-time changes (in production, this would be real data)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Simulate the passage of time and traffic
      const now = Date.now();
      const elapsed = (now - prevValues.current.timestamp) / 1000; // seconds
      
      // Generate random variations for demo
      const txBytesIncrement = Math.floor(Math.random() * 100000);
      const rxBytesIncrement = Math.floor(Math.random() * 80000);
      const txPacketsIncrement = Math.floor(Math.random() * 20);
      const rxPacketsIncrement = Math.floor(Math.random() * 15);
      
      // Calculate new totals
      const newTotalTxBytes = trafficStats.totalTxBytes + txBytesIncrement;
      const newTotalRxBytes = trafficStats.totalRxBytes + rxBytesIncrement;
      const newTotalTxPackets = trafficStats.totalTxPackets + txPacketsIncrement;
      const newTotalRxPackets = trafficStats.totalRxPackets + rxPacketsIncrement;
      
      // Calculate rates
      const txRate = txBytesIncrement * 8 / elapsed; // bits per second
      const rxRate = rxBytesIncrement * 8 / elapsed; // bits per second
      const txPacketRate = txPacketsIncrement / elapsed; // packets per second
      const rxPacketRate = rxPacketsIncrement / elapsed; // packets per second
      
      // Update history - keep last 30 points
      const newHistory = [...trafficStats.history, { timestamp: now, txRate, rxRate }];
      if (newHistory.length > 30) {
        newHistory.shift(); // Remove oldest entry
      }
      
      // Update traffic stats state
      setTrafficStats({
        ...trafficStats,
        txRate,
        rxRate,
        txPacketRate,
        rxPacketRate,
        totalTxBytes: newTotalTxBytes,
        totalRxBytes: newTotalRxBytes,
        totalTxPackets: newTotalTxPackets,
        totalRxPackets: newTotalRxPackets,
        txQueueDrops: Math.floor(Math.random() * 5), // Random for demo
        history: newHistory
      });
      
      // Update previous values for next calculation
      prevValues.current = {
        timestamp: now,
        txBytes: newTotalTxBytes,
        rxBytes: newTotalRxBytes,
        txPackets: newTotalTxPackets,
        rxPackets: newTotalRxPackets
      };
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(updateInterval);
  }, [trafficStats, iface]);
  
  // Render the interface card
  return (
    <div className={`mb-4 border rounded-lg p-3 ${iface.isUp ? 'border-blue-500 bg-slate-900' : (iface.disabled ? 'border-gray-500 bg-slate-900' : 'border-red-500 bg-slate-900')}`}>
      {/* Interface header with name and status */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${iface.isUp ? 'bg-green-500' : (iface.disabled ? 'bg-gray-500' : 'bg-red-500')} mr-2 animate-pulse`}></div>
          <span className="font-bold text-sm text-white">
            {iface.name || 'Unknown Interface'} {iface.type && <span className="text-xs font-semibold text-slate-400">({iface.type})</span>}
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${iface.isUp ? 'bg-blue-600' : (iface.disabled ? 'bg-gray-600' : 'bg-red-600')} text-white`}>
          {iface.isUp ? iface.speed || '1Gbps' : (iface.disabled ? 'Disabled' : 'Down')}
        </span>
      </div>
      
      {/* Traffic rates display */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx/Rx Rate:</span>
            <span className="text-xs text-white font-medium">
              {iface.isUp 
                ? `${formatBitsPerSecond(trafficStats.txRate)} / ${formatBitsPerSecond(trafficStats.rxRate)}`
                : '0 bps / 0 bps'}
            </span>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx/Rx Packet Rate:</span>
            <span className="text-xs text-white font-medium">
              {iface.isUp 
                ? `${trafficStats.txPacketRate.toFixed(0)} p/s / ${trafficStats.rxPacketRate.toFixed(0)} p/s`
                : '0 p/s / 0 p/s'}
            </span>
          </div>
        </div>
      </div>
      
      {/* FP rates (Firewall Processing) */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">FP Tx/Rx Rate:</span>
            <span className="text-xs text-white font-medium">0 bps / 0 bps</span>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">FP Tx/Rx Packet Rate:</span>
            <span className="text-xs text-white font-medium">0 p/s / 0 p/s</span>
          </div>
        </div>
      </div>
      
      {/* Total bytes and packets */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx/Rx Bytes:</span>
            <span className="text-xs text-white font-medium">
              {`${formatBytes(trafficStats.totalTxBytes)} / ${formatBytes(trafficStats.totalRxBytes)}`}
            </span>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx/Rx Packets:</span>
            <span className="text-xs text-white font-medium">
              {`${trafficStats.totalTxPackets.toLocaleString()} / ${trafficStats.totalRxPackets.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>
      
      {/* Drops and errors */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx/Rx Drops:</span>
            <span className="text-xs text-white font-medium">
              {iface.isUp 
                ? `${trafficStats.txDrops} / ${trafficStats.rxDrops}`
                : '0 / 0'}
            </span>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx Queue Drops:</span>
            <span className="text-xs text-white font-medium">
              {iface.isUp ? trafficStats.txQueueDrops : '0'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 mb-3">
        <div className="bg-slate-800 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Tx/Rx Errors:</span>
            <span className="text-xs text-white font-medium">
              {iface.isUp 
                ? `${trafficStats.txErrors} / ${trafficStats.rxErrors}`
                : '0 / 0'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Mini traffic charts */}
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-slate-800 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-xs text-slate-300">
                Tx: {iface.isUp ? formatBitsPerSecond(trafficStats.txRate) : '0 bps'}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs text-slate-300">
                Rx: {iface.isUp ? formatBitsPerSecond(trafficStats.rxRate) : '0 bps'}
              </span>
            </div>
          </div>
          
          {/* Simple chart using div bars */}
          <div className="h-12 border border-slate-700 rounded grid" style={{ gridTemplateColumns: 'repeat(30, 1fr)' }}>
            {trafficStats.history.map((point, index) => {
              // Find the max value for scaling
              const maxRate = Math.max(
                ...trafficStats.history.map(p => Math.max(p.txRate, p.rxRate)), 
                1000 // Minimum scale
              );
              
              // Calculate heights as percentages of the max
              const txHeight = (point.txRate / maxRate * 100);
              const rxHeight = (point.rxRate / maxRate * 100);
              
              return (
                <div key={index} className="flex flex-col-reverse justify-start h-full">
                  {/* Tx bar (blue) */}
                  <div 
                    className="w-full bg-blue-500 opacity-70 border-t border-blue-400" 
                    style={{ height: `${txHeight}%` }}
                  ></div>
                  
                  {/* Rx bar (red, rendered on top of Tx) */}
                  <div 
                    className="w-full bg-red-500 opacity-70 border-t border-red-400" 
                    style={{ height: `${rxHeight}%` }}
                  ></div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-xs text-slate-300">
                Packet: {iface.isUp ? `${trafficStats.txPacketRate.toFixed(0)} p/s` : '0 p/s'}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs text-slate-300">
                Packet: {iface.isUp ? `${trafficStats.rxPacketRate.toFixed(0)} p/s` : '0 p/s'}
              </span>
            </div>
          </div>
          
          {/* Simple packet rate chart */}
          <div className="h-8 border border-slate-700 rounded grid mt-1" style={{ gridTemplateColumns: 'repeat(30, 1fr)' }}>
            {trafficStats.history.map((point, index) => {
              // For this simple demo, we'll use tx/rx rates scaled down for packet visualization
              const txPktHeight = Math.min((point.txRate / 10000), 100);
              const rxPktHeight = Math.min((point.rxRate / 10000), 100);
              
              return (
                <div key={`pkt-${index}`} className="flex flex-col-reverse justify-start h-full">
                  {/* Tx packet bar (blue) */}
                  <div 
                    className="w-full bg-blue-500 opacity-70" 
                    style={{ height: `${txPktHeight}%` }}
                  ></div>
                  
                  {/* Rx packet bar (red) */}
                  <div 
                    className="w-full bg-red-500 opacity-70" 
                    style={{ height: `${rxPktHeight}%` }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple card for collapsed view
const SimpleInterfaceCard = ({ iface }: { iface: Interface }) => {
  return (
    <div className={`mb-3 border rounded-md p-2 ${iface.isUp ? 'border-green-500 bg-gray-800' : (iface.disabled ? 'border-gray-500 bg-gray-800' : 'border-red-500 bg-gray-800')}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${iface.isUp ? 'bg-green-500' : (iface.disabled ? 'bg-gray-500' : 'bg-red-500')} mr-2 animate-pulse`}></div>
          <span className="font-bold text-sm text-white">
            {iface.name || 'Unknown Interface'} {iface.type && <span className="text-xs font-semibold text-gray-300">({iface.type})</span>}
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${iface.isUp ? 'bg-blue-600 text-white' : (iface.disabled ? 'bg-gray-600 text-white' : 'bg-red-600 text-white')}`}>
          {iface.isUp ? iface.speed || '1Gbps' : (iface.disabled ? 'Disabled' : 'Down')}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="flex items-center">
          <span className="flex items-center text-xs text-blue-500 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            TX: {iface.txBytes != null ? formatBytes(iface.txBytes) : '0 B'}
          </span>
        </div>
        <div className="flex items-center">
          <span className="flex items-center text-xs text-green-500 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            RX: {iface.rxBytes != null ? formatBytes(iface.rxBytes) : '0 B'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Main component
const InterfaceStatus: React.FC<InterfaceStatusProps> = ({ deviceId }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "up" | "down">("all");
  const interfacesPerPage = 10; // Số interface hiển thị trên mỗi trang
  
  const { data: interfaces, isLoading } = useQuery<Interface[]>({ 
    queryKey: [`/api/devices/${deviceId ?? 0}/interfaces`, { includeHealth: true }],
    enabled: !!deviceId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  // Filter interfaces by status
  const filteredInterfaces = interfaces?.filter(iface => {
    if (statusFilter === "all") return true;
    if (statusFilter === "up") return iface.isUp;
    if (statusFilter === "down") return !iface.isUp && !iface.disabled;
    return true;
  }) || [];
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);
  
  // Calculate pagination info
  const totalInterfaces = filteredInterfaces.length || 0;
  const totalPages = Math.ceil(totalInterfaces / interfacesPerPage);
  
  // Get current page interfaces
  const getCurrentInterfaces = () => {
    if (!filteredInterfaces.length) return [];
    
    const startIndex = (currentPage - 1) * interfacesPerPage;
    const endIndex = startIndex + interfacesPerPage;
    return filteredInterfaces.slice(startIndex, endIndex);
  };
  
  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center mt-4 gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1 text-xs rounded-md ${
            currentPage === 1 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          &lt; Trước
        </button>
        
        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`w-8 h-8 text-xs rounded-md ${
                currentPage === index + 1
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 text-xs rounded-md ${
            currentPage === totalPages
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          Tiếp &gt;
        </button>
      </div>
    );
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <h3 className="font-bold text-white">Trạng thái Interfaces</h3>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && interfaces && (
            <>
              <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`text-xs px-2 py-1 ${
                    statusFilter === "all" 
                      ? "bg-blue-600 text-white" 
                      : "bg-transparent text-gray-300 hover:bg-gray-600"
                  } rounded-md transition-colors`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter("up")}
                  className={`text-xs px-2 py-1 ${
                    statusFilter === "up" 
                      ? "bg-green-600 text-white" 
                      : "bg-transparent text-gray-300 hover:bg-gray-600"
                  } rounded-md transition-colors`}
                >
                  Đang hoạt động
                </button>
                <button
                  onClick={() => setStatusFilter("down")}
                  className={`text-xs px-2 py-1 ${
                    statusFilter === "down" 
                      ? "bg-red-600 text-white" 
                      : "bg-transparent text-gray-300 hover:bg-gray-600"
                  } rounded-md transition-colors`}
                >
                  Không hoạt động
                </button>
              </div>
              <button
                onClick={() => setShowAllDetails(prev => !prev)}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                {showAllDetails ? "Thu gọn" : "Xem chi tiết tất cả"}
              </button>
            </>
          )}
          {!isLoading && interfaces && (
            <span className="text-xs text-green-400 font-bold">
              {filteredInterfaces.length} / {interfaces.length} interfaces
              {statusFilter !== "all" && (
                <span className="ml-1">
                  ({statusFilter === "up" ? "Đang hoạt động" : "Không hoạt động"})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : interfaces && interfaces.length > 0 ? (
          filteredInterfaces.length > 0 ? (
            <div>
              {/* Show all interfaces in detail mode or paginate them */}
              {showAllDetails ? (
                // Show detailed view for current page interfaces
                getCurrentInterfaces().map(iface => (
                  <DetailedInterfaceCard key={iface.id} iface={iface} />
                ))
              ) : (
                // Show simple cards for all interfaces
                getCurrentInterfaces().map(iface => (
                  <SimpleInterfaceCard key={iface.id} iface={iface} />
                ))
              )}
              
              {/* Pagination controls */}
              {renderPagination()}
            </div>
          ) : (
            <div className="text-sm font-medium text-amber-500 text-center py-8 border border-dashed border-amber-300 rounded-md bg-gray-800">
              <div className="flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  Không tìm thấy interfaces nào phù hợp với bộ lọc "{statusFilter === "up" ? "Đang hoạt động" : "Không hoạt động"}"
                </div>
                <button 
                  onClick={() => setStatusFilter("all")}
                  className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md mt-2"
                >
                  Xem tất cả interfaces
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="text-sm font-medium text-red-500 text-center py-8 border border-dashed border-red-300 rounded-md">
            Không có interfaces khả dụng
          </div>
        )}
      </div>
    </div>
  );
};

export default InterfaceStatus;
