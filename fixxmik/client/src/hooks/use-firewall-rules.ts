import { useQuery } from "@tanstack/react-query";
import { FirewallRuleResponse } from "@shared/schema";

export interface FirewallRulesFilters {
  chain?: string;
  enabled?: boolean;
  search?: string;
}

export function useFirewallRules(deviceId: number | null, filters: FirewallRulesFilters = {}) {
  const { chain, enabled, search } = filters;
  
  // Build query string
  let queryString = '';
  if (chain && chain !== 'All Chains') {
    queryString += `chain=${encodeURIComponent(chain)}&`;
  }
  if (enabled !== undefined) {
    queryString += `enabled=${enabled}&`;
  }
  if (search) {
    queryString += `search=${encodeURIComponent(search)}&`;
  }
  
  // Remove trailing & if exists
  if (queryString.endsWith('&')) {
    queryString = queryString.slice(0, -1);
  }
  
  // Add ? prefix if queryString is not empty
  if (queryString) {
    queryString = `?${queryString}`;
  }
  
  return useQuery<FirewallRuleResponse[]>({
    queryKey: ['/api/devices', deviceId, 'firewall-rules', filters],
    enabled: Boolean(deviceId),
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/devices/${deviceId}/firewall-rules${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch firewall rules');
      }
      return response.json();
    },
  });
}

export function useFirewallRule(deviceId: number | null, ruleId: string | null) {
  return useQuery<FirewallRuleResponse>({
    queryKey: ['/api/devices', deviceId, 'firewall-rules', ruleId],
    enabled: Boolean(deviceId) && Boolean(ruleId),
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/devices/${deviceId}/firewall-rules/${ruleId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch firewall rule');
      }
      return response.json();
    },
  });
}
