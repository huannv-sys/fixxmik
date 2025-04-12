import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Wifi, Clock, Database, Filter } from 'lucide-react';

// Interface for DHCP Lease
interface DHCPLease {
  id?: string;
  address: string;
  macAddress: string;
  clientId?: string;
  hostName?: string;
  comment?: string;
  dynamic: boolean;
  status: 'bound' | 'waiting' | 'busy' | 'offered';
  expiresAfter?: string;
  lastSeen?: string;
  server?: string;
  blocked?: boolean;
}

interface DHCPLeasesProps {
  deviceId: number | null;
}

const DHCPLeases: React.FC<DHCPLeasesProps> = ({ deviceId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dynamicFilter, setDynamicFilter] = useState<string>("all");
  
  // Fetch DHCP Leases
  const { data: leases, isLoading, error, refetch } = useQuery<DHCPLease[]>({
    queryKey: [`/api/devices/${deviceId}/dhcp/leases`],
    enabled: Boolean(deviceId),
    refetchInterval: autoRefresh ? 10000 : false, // Refresh every 10 seconds if auto-refresh is enabled
  });
  
  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    if (!leases) return ["all"];
    const statuses = new Set<string>(["all"]);
    leases.forEach(lease => {
      if (lease.status) statuses.add(lease.status);
    });
    return Array.from(statuses);
  }, [leases]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDynamicFilter('all');
  };
  
  // Filter leases based on search query, status, and dynamic/static
  const filteredLeases = useMemo(() => {
    return leases?.filter(lease => {
      // Text search filter
      const query = searchQuery.toLowerCase();
      const matchesSearch = query === '' || 
        lease.address.toLowerCase().includes(query) ||
        lease.macAddress.toLowerCase().includes(query) ||
        (lease.hostName && lease.hostName.toLowerCase().includes(query)) ||
        (lease.comment && lease.comment.toLowerCase().includes(query));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || lease.status === statusFilter;
      
      // Dynamic/Static filter
      const matchesDynamic = 
        dynamicFilter === 'all' || 
        (dynamicFilter === 'dynamic' && lease.dynamic) || 
        (dynamicFilter === 'static' && !lease.dynamic);
      
      return matchesSearch && matchesStatus && matchesDynamic;
    }) || [];
  }, [leases, searchQuery, statusFilter, dynamicFilter]);
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bound':
        return <Badge className="bg-green-600">Bound</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-600">Waiting</Badge>;
      case 'busy':
        return <Badge className="bg-red-600">Busy</Badge>;
      case 'offered':
        return <Badge className="bg-blue-600">Offered</Badge>;
      default:
        return <Badge className="bg-gray-600">{status}</Badge>;
    }
  };
  
  // Format time string
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    
    if (timeString === 'never') return 'never';
    
    // Check if it's a relative time (e.g., "1w2d3h4m")
    if (/^\d+[wdhms]/.test(timeString)) {
      return timeString;
    }
    
    // Otherwise, treat it as a date string
    try {
      const date = new Date(timeString);
      return date.toLocaleString();
    } catch (e) {
      return timeString;
    }
  };
  
  return (
    <Card className="bg-gray-900 border-gray-800 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white text-lg">DHCP Leases</CardTitle>
            <CardDescription className="text-gray-400">
              Active leases from DHCP server
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleAutoRefresh}
              className={`${autoRefresh ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}
            >
              <Clock className="h-4 w-4 mr-1" />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="bg-gray-800 text-gray-400">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={`bg-gray-800 text-gray-400 ${showFilters ? 'border-primary text-primary' : ''}`}
          >
            <Filter className="h-4 w-4 mr-1" />
            Lọc
          </Button>
          
          {(searchQuery || statusFilter !== 'all' || dynamicFilter !== 'all') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
              className="bg-gray-800 text-gray-400"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
        
        {showFilters && (
          <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="IP, MAC, hoặc tên máy chủ..."
                  className="pl-8 bg-gray-800 border-gray-700 text-gray-200"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Trạng thái</label>
              <Select 
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-10 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {uniqueStatuses
                    .filter(status => status !== 'all')
                    .map(status => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Kiểu</label>
              <Select 
                value={dynamicFilter}
                onValueChange={setDynamicFilter}
              >
                <SelectTrigger className="h-10 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="dynamic">Động (Dynamic)</SelectItem>
                  <SelectItem value="static">Tĩnh (Static)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        

        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="py-6 px-2 text-center text-red-400">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-70" />
            <p>Error loading DHCP leases. Please make sure DHCP server is enabled on this device.</p>
          </div>
        ) : !filteredLeases || filteredLeases.length === 0 ? (
          <div className="py-8 px-2 text-center text-gray-400">
            <Wifi className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No DHCP leases found</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? 'Try changing your search terms' : 'DHCP server might not be active or no clients are connected'}
            </p>
          </div>
        ) : (
          <div className="border rounded-md border-gray-800 overflow-hidden">
            <Table>
              <TableCaption>
                Showing {filteredLeases.length} of {leases?.length || 0} DHCP leases
              </TableCaption>
              <TableHeader className="bg-gray-800">
                <TableRow>
                  <TableHead className="text-gray-400">IP Address</TableHead>
                  <TableHead className="text-gray-400">MAC Address</TableHead>
                  <TableHead className="text-gray-400">Hostname</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((lease, index) => (
                  <TableRow key={index} className="border-gray-800 hover:bg-gray-800/70">
                    <TableCell className="font-medium text-gray-300">{lease.address}</TableCell>
                    <TableCell className="text-gray-400 font-mono text-xs">{lease.macAddress}</TableCell>
                    <TableCell className="text-gray-300">{lease.hostName || '-'}</TableCell>
                    <TableCell>{getStatusBadge(lease.status)}</TableCell>
                    <TableCell className="text-gray-400">{formatTime(lease.expiresAfter)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DHCPLeases;