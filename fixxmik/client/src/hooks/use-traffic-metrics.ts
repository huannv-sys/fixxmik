import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Metric } from "@shared/schema";

export interface TrafficMetrics {
  metrics: Metric[] | null;
  isLoading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
}

/**
 * Hook để lấy dữ liệu metrics lưu lượng mạng
 */
export function useTrafficMetrics(
  deviceId: number | null,
  autoRefresh = false,
  refreshInterval = 10000,
): TrafficMetrics {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!deviceId) {
      setMetrics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/devices/${deviceId}/metrics`);

      if (response.data && Array.isArray(response.data)) {
        setMetrics(response.data);
      } else {
        // Nếu không có dữ liệu hoặc dữ liệu không đúng định dạng
        setError("Không nhận được dữ liệu metrics hợp lệ");
        console.error("Invalid metrics data format:", response.data);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi lấy dữ liệu metrics",
      );
      console.error("Error fetching metrics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  // Fetch dữ liệu ban đầu
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto refresh nếu được yêu cầu
  useEffect(() => {
    if (autoRefresh && deviceId) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, deviceId, fetchMetrics, refreshInterval]);

  return { metrics, isLoading, error, refreshMetrics: fetchMetrics };
}
