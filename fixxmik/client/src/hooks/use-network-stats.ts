import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Interface } from "@shared/schema";

/**
 * Interface cho DHCP Stats
 */
export interface DHCPStats {
  totalLeases: number;
  activeLeases: number;
  usagePercentage: number;
  poolSize: number;
  availableIPs: number;
  poolRanges: Array<{
    name: string;
    start: string;
    end: string;
    size: number;
    used: number;
    availablePercentage: number;
  }>;
  lastUpdated: Date;
}

/**
 * Interface cho Connection Stats
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  tcpConnections: number;
  udpConnections: number;
  icmpConnections: number;
  otherConnections: number;
  top10Sources: Array<{
    ipAddress: string;
    connectionCount: number;
    percentage: number;
  }>;
  top10Destinations: Array<{
    ipAddress: string;
    connectionCount: number;
    percentage: number;
  }>;
  top10Ports: Array<{
    port: number;
    protocol: string;
    connectionCount: number;
    percentage: number;
    serviceName?: string;
  }>;
  externalConnections: number;
  internalConnections: number;
  lastUpdated: Date;
}

/**
 * Hook để lấy thông tin DHCP Stats từ API
 */
export function useDHCPStats(
  deviceId: number | null,
  autoRefresh = false,
  refreshInterval = 30000,
) {
  const [dhcpStats, setDHCPStats] = useState<DHCPStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDHCPStats = useCallback(async () => {
    if (!deviceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/devices/${deviceId}/dhcp-stats`);

      if (response.data.success) {
        // Chuyển đổi lastUpdated từ string sang Date
        const stats = {
          ...response.data.data,
          lastUpdated: new Date(response.data.data.lastUpdated),
        };
        setDHCPStats(stats);
      } else {
        setError(response.data.message || "Không thể lấy thông tin DHCP stats");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi lấy dữ liệu DHCP stats",
      );
      console.error("Error fetching DHCP stats:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Fetch dữ liệu ban đầu
  useEffect(() => {
    fetchDHCPStats();
  }, [fetchDHCPStats]);

  // Cài đặt auto refresh nếu được yêu cầu
  useEffect(() => {
    if (autoRefresh && deviceId) {
      const interval = setInterval(fetchDHCPStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, deviceId, fetchDHCPStats, refreshInterval]);

  return { dhcpStats, loading, error, refetch: fetchDHCPStats };
}

/**
 * Hook để lấy thông tin Connection Stats từ API
 */
export function useConnectionStats(
  deviceId: number | null,
  autoRefresh = false,
  refreshInterval = 30000,
) {
  const [connectionStats, setConnectionStats] =
    useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectionStats = useCallback(async () => {
    if (!deviceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/devices/${deviceId}/connection-stats`,
      );

      if (response.data.success) {
        // Chuyển đổi lastUpdated từ string sang Date
        const stats = {
          ...response.data.data,
          lastUpdated: new Date(response.data.data.lastUpdated),
        };
        setConnectionStats(stats);
      } else {
        setError(
          response.data.message || "Không thể lấy thông tin connection stats",
        );
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi lấy dữ liệu connection stats",
      );
      console.error("Error fetching connection stats:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Fetch dữ liệu ban đầu
  useEffect(() => {
    fetchConnectionStats();
  }, [fetchConnectionStats]);

  // Cài đặt auto refresh nếu được yêu cầu
  useEffect(() => {
    if (autoRefresh && deviceId) {
      const interval = setInterval(fetchConnectionStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, deviceId, fetchConnectionStats, refreshInterval]);

  return { connectionStats, loading, error, refetch: fetchConnectionStats };
}

/**
 * Interface cho Network Stats (kết hợp nhiều loại thống kê)
 */
export interface NetworkStats {
  interfaces: Interface[] | null;
  dhcpStats: DHCPStats | null;
  connectionStats: ConnectionStats | null;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

/**
 * Hook để lấy thông tin Network Stats tổng hợp từ API
 */
export function useNetworkStats(
  deviceId: number | null,
  autoRefresh = false,
  refreshInterval = 30000,
): NetworkStats {
  const [interfaces, setInterfaces] = useState<Interface[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sử dụng các hook cơ bản
  const {
    dhcpStats,
    loading: dhcpLoading,
    error: dhcpError,
    refetch: refreshDhcp,
  } = useDHCPStats(deviceId, autoRefresh);
  const {
    connectionStats,
    loading: connLoading,
    error: connError,
    refetch: refreshConn,
  } = useConnectionStats(deviceId, autoRefresh);

  // Fetch interfaces
  const fetchInterfaces = useCallback(async () => {
    if (!deviceId) {
      setInterfaces(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/devices/${deviceId}/interfaces`);
      if (response.data.success) {
        setInterfaces(response.data.data);
      } else {
        setError(response.data.message || "Không thể lấy thông tin interfaces");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi lấy dữ liệu interfaces",
      );
      console.error("Error fetching interfaces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  // Fetch tất cả dữ liệu
  const refreshAllStats = useCallback(async () => {
    await Promise.all([fetchInterfaces(), refreshDhcp(), refreshConn()]);
  }, [fetchInterfaces, refreshDhcp, refreshConn]);

  // Fetch dữ liệu ban đầu
  useEffect(() => {
    fetchInterfaces();
  }, [fetchInterfaces]);

  // Auto refresh nếu được yêu cầu
  useEffect(() => {
    if (autoRefresh && deviceId) {
      const interval = setInterval(fetchInterfaces, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, deviceId, fetchInterfaces, refreshInterval]);

  return {
    interfaces,
    dhcpStats,
    connectionStats,
    isLoading: isLoading || dhcpLoading || connLoading,
    error: error || dhcpError || connError,
    refreshStats: refreshAllStats,
  };
}
