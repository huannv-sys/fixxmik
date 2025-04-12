import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DeviceResponse } from "@shared/schema";

export function useDevices() {
  return useQuery<DeviceResponse[]>({
    queryKey: ["/api/devices"],
  });
}

export function useDevice(deviceId: number) {
  return useQuery<DeviceResponse>({
    queryKey: ["/api/devices", deviceId],
    enabled: Boolean(deviceId),
  });
}

export function useSyncFirewallRules(deviceId: number) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/devices/${deviceId}/sync-firewall-rules`,
      );
      return res.json();
    },
    onSuccess: () => {
      // Invalidate device firewall rules query
      queryClient.invalidateQueries({
        queryKey: ["/api/devices", deviceId, "firewall-rules"],
      });
    },
  });
}
