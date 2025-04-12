import { useQuery } from "@tanstack/react-query";
import { Device, Metric } from "@shared/schema";

interface SummaryCardsProps {
  deviceId: number | null;
}

const formatBytes = (bytes: number | undefined, decimals = 2) => {
  if (bytes === undefined) return 'N/A';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const SummaryCards: React.FC<SummaryCardsProps> = ({ deviceId }) => {
  const { data: device } = useQuery<Device>({ 
    queryKey: deviceId ? [`/api/devices/${deviceId}`] : null,
    enabled: !!deviceId,
  });
  
  const { data: metrics } = useQuery<Metric[]>({ 
    queryKey: deviceId ? [`/api/devices/${deviceId}/metrics`, { limit: 1 }] : null,
    enabled: !!deviceId,
  });
  
  const latestMetric = metrics && metrics.length > 0 ? metrics[0] : null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* CPU Card */}
      <div className="bg-amber-700 rounded-lg shadow-md p-4 border border-amber-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">CPU Usage</h3>
          <div className="text-white bg-amber-600 p-1.5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="14" x2="23" y2="14"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="14" x2="4" y2="14"></line>
            </svg>
          </div>
        </div>
        <div className="flex items-end">
          <div className="text-3xl font-bold text-white">
            {latestMetric ? `${Math.round(latestMetric.cpuUsage || 0)}%` : 'N/A'}
          </div>
        </div>
        <div className="w-full bg-amber-800 rounded-full h-3 mt-3">
          <div 
            className="bg-yellow-300 h-3 rounded-full" 
            style={{ width: `${latestMetric ? Math.round(latestMetric.cpuUsage || 0) : 0}%` }}
          ></div>
        </div>
      </div>
      
      {/* Memory Card */}
      <div className="bg-blue-700 rounded-lg shadow-md p-4 border border-blue-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Memory Usage</h3>
          <div className="text-white bg-blue-600 p-1.5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6" y2="6"></line>
              <line x1="6" y1="18" x2="6" y2="18"></line>
            </svg>
          </div>
        </div>
        <div className="flex items-end">
          <div className="text-2xl font-bold text-white">
            {latestMetric ? `${formatBytes(latestMetric.memoryUsage)} / ${formatBytes(latestMetric.totalMemory)}` : 'N/A'}
          </div>
        </div>
        <div className="w-full bg-blue-800 rounded-full h-3 mt-3">
          <div 
            className="bg-blue-300 h-3 rounded-full" 
            style={{ 
              width: latestMetric?.totalMemory ? 
                `${Math.round((latestMetric.memoryUsage || 0) / latestMetric.totalMemory * 100)}%` : '0%' 
            }}
          ></div>
        </div>
      </div>
      
      {/* Bandwidth Card */}
      <div className="bg-emerald-700 rounded-lg shadow-md p-4 border border-emerald-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Bandwidth</h3>
          <div className="text-white bg-emerald-600 p-1.5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
        </div>
        <div className="flex items-end">
          <div className="text-2xl font-bold text-white">
            {latestMetric ? `${Math.round((latestMetric.uploadBandwidth || 0) + (latestMetric.downloadBandwidth || 0))} Mbps` : 'N/A'}
          </div>
        </div>
        <div className="w-full bg-emerald-800 rounded-full h-3 mt-3">
          <div 
            className="bg-emerald-300 h-3 rounded-full" 
            style={{ width: latestMetric ? '58%' : '0%' }}
          ></div>
        </div>
      </div>
      
      {/* Temperature Card */}
      <div className="bg-red-700 rounded-lg shadow-md p-4 border border-red-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Temperature</h3>
          <div className="text-white bg-red-600 p-1.5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
            </svg>
          </div>
        </div>
        <div className="flex items-end">
          <div className="text-3xl font-bold text-white">
            {latestMetric ? `${Math.round(latestMetric.temperature || 0)}°C` : 'N/A'}
          </div>
        </div>
        <div className="w-full bg-red-800 rounded-full h-3 mt-3">
          <div 
            className="bg-gradient-to-r from-yellow-300 to-red-400 h-3 rounded-full" 
            style={{ 
              width: latestMetric ? `${Math.min(100, Math.round((latestMetric.temperature || 0) / 80 * 100))}%` : '0%'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
