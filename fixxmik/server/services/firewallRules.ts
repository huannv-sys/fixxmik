import { storage } from '../storage';
import { mikrotikService } from './mikrotik';
import type { Device, FirewallRule, FirewallRuleResponse, InsertFirewallRule } from '@shared/schema';

export const firewallRuleService = {
  async syncFirewallRules(deviceId: number): Promise<FirewallRule[]> {
    try {
      // Get device
      const device = await storage.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      // Ensure device is connected
      await mikrotikService.connectToDevice(device);
      
      // Fetch rules from MikroTik
      const mikrotikRules = await mikrotikService.getFirewallRules(deviceId);
      
      // Get existing rules from database
      const existingRules = await storage.getFirewallRules(deviceId);
      const existingRuleMap = new Map<string, FirewallRule>();
      
      existingRules.forEach(rule => {
        existingRuleMap.set(rule.ruleId, rule);
      });
      
      // Process each rule
      const results: FirewallRule[] = [];
      
      for (const mikrotikRule of mikrotikRules) {
        const existingRule = existingRuleMap.get(mikrotikRule.id);
        
        if (existingRule) {
          // Update existing rule
          const updates: Partial<FirewallRule> = {
            chain: mikrotikRule.chain,
            action: mikrotikRule.action,
            enabled: mikrotikRule.enabled,
            srcAddress: mikrotikRule.srcAddress,
            dstAddress: mikrotikRule.dstAddress,
            protocol: mikrotikRule.protocol,
            srcPort: mikrotikRule.srcPort,
            dstPort: mikrotikRule.dstPort,
            hits: mikrotikRule.hits,
            bytes: mikrotikRule.bytes,
            comment: mikrotikRule.comment,
            position: mikrotikRule.position,
            connectionState: mikrotikRule.connectionState,
            lastModified: mikrotikRule.lastModified ? new Date(mikrotikRule.lastModified) : undefined,
            lastHit: mikrotikRule.lastHit ? new Date(mikrotikRule.lastHit) : undefined,
            details: mikrotikRule.details,
            updatedAt: new Date(),
          };
          
          const updatedRule = await storage.updateFirewallRule(existingRule.id, updates);
          if (updatedRule) {
            results.push(updatedRule);
          }
          
          // Remove from map to track what's been processed
          existingRuleMap.delete(mikrotikRule.id);
        } else {
          // Create new rule
          const newRule: InsertFirewallRule = {
            deviceId,
            ruleId: mikrotikRule.id,
            chain: mikrotikRule.chain,
            action: mikrotikRule.action,
            enabled: mikrotikRule.enabled,
            srcAddress: mikrotikRule.srcAddress,
            dstAddress: mikrotikRule.dstAddress,
            protocol: mikrotikRule.protocol,
            srcPort: mikrotikRule.srcPort,
            dstPort: mikrotikRule.dstPort,
            hits: mikrotikRule.hits,
            bytes: mikrotikRule.bytes,
            comment: mikrotikRule.comment,
            position: mikrotikRule.position,
            connectionState: mikrotikRule.connectionState,
            lastModified: mikrotikRule.lastModified ? new Date(mikrotikRule.lastModified) : undefined,
            details: mikrotikRule.details,
          };
          
          const createdRule = await storage.createFirewallRule(newRule);
          results.push(createdRule);
        }
      }
      
      // Any remaining rules in existingRuleMap no longer exist on the device
      // In a real-world scenario, you might want to delete them or mark them as inactive
      // For this implementation, we'll leave them in the database
      
      return results.sort((a, b) => (a.position || 0) - (b.position || 0));
    } catch (error) {
      console.error(`Error syncing firewall rules for device ${deviceId}:`, error);
      throw error;
    }
  },
  
  async getFirewallRules(deviceId: number, filters?: {
    chain?: string;
    enabled?: boolean;
    search?: string;
  }): Promise<FirewallRule[]> {
    return storage.getFirewallRules(deviceId, filters);
  },
  
  async getFirewallRule(id: number): Promise<FirewallRule | undefined> {
    return storage.getFirewallRule(id);
  },
  
  convertToResponse(rule: FirewallRule): FirewallRuleResponse {
    return {
      id: rule.ruleId,
      chain: rule.chain,
      action: rule.action,
      srcAddress: rule.srcAddress,
      dstAddress: rule.dstAddress,
      protocol: rule.protocol,
      srcPort: rule.srcPort,
      dstPort: rule.dstPort,
      enabled: rule.enabled,
      hits: rule.hits,
      bytes: rule.bytes,
      comment: rule.comment,
      position: rule.position || 0,
      connectionState: rule.connectionState,
      lastModified: rule.lastModified?.toISOString(),
      lastHit: rule.lastHit?.toISOString(),
      details: rule.details,
    };
  }
};
