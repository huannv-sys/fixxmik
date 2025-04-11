/**
 * DHCP Stats Service - Thu thập thông tin về tình trạng sử dụng IP
 */
import { mikrotikService } from './mikrotik';
import { logger } from '../logger';

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

class DHCPStatsService {
  private cachedStats = new Map<number, { stats: DHCPStats, timestamp: number }>();
  // Cache thời gian 5 phút
  private readonly CACHE_TTL = 5 * 60 * 1000;

  /**
   * Lấy thông tin thống kê DHCP cho một thiết bị Mikrotik
   */
  async getDHCPStats(deviceId: number): Promise<DHCPStats | null> {
    try {
      // Kiểm tra cache trước
      const cachedResult = this.cachedStats.get(deviceId);
      const now = Date.now();

      if (cachedResult && (now - cachedResult.timestamp) < this.CACHE_TTL) {
        return cachedResult.stats;
      }

      // Kết nối thiết bị
      const connected = await mikrotikService.connectToDevice(deviceId);
      if (!connected) {
        logger.warn(`Không thể kết nối đến thiết bị ID ${deviceId} để lấy thông tin DHCP`);
        return null;
      }

      // Lấy client
      const client = mikrotikService.getClientForDevice(deviceId);
      if (!client) {
        logger.warn(`Không thể lấy client cho thiết bị ID ${deviceId}`);
        return null;
      }

      // Lấy thông tin về DHCP server
      const dhcpServers = await client.executeCommand('/ip/dhcp-server/print');
      if (!dhcpServers || !Array.isArray(dhcpServers) || dhcpServers.length === 0) {
        logger.warn(`Không tìm thấy DHCP server nào trên thiết bị ID ${deviceId}`);
        return null;
      }

      // Lấy thông tin về DHCP pool
      const dhcpPools = await client.executeCommand('/ip/pool/print');
      if (!dhcpPools || !Array.isArray(dhcpPools) || dhcpPools.length === 0) {
        logger.warn(`Không tìm thấy DHCP pool nào trên thiết bị ID ${deviceId}`);
        return null;
      }

      // Lấy thông tin về DHCP leases
      const dhcpLeases = await client.executeCommand('/ip/dhcp-server/lease/print');
      const activeLeases = Array.isArray(dhcpLeases) 
        ? dhcpLeases.filter(lease => lease.status === 'bound' || lease.status === 'waiting')
        : [];

      // Tính toán thông tin pool ranges
      const poolRanges = dhcpPools.map((pool: any) => {
        const { name, ranges } = pool;
        // Parse range format như "192.168.1.2-192.168.1.254"
        const rangeMatches = (ranges || '').match(/(\d+\.\d+\.\d+\.\d+)-(\d+\.\d+\.\d+\.\d+)/);
        let start = '';
        let end = '';
        let size = 0;

        if (rangeMatches && rangeMatches.length >= 3) {
          start = rangeMatches[1];
          end = rangeMatches[2];
          
          // Tính kích thước pool
          const startParts = start.split('.').map(Number);
          const endParts = end.split('.').map(Number);
          
          if (startParts.length === 4 && endParts.length === 4) {
            const startIP = startParts[0] * 16777216 + startParts[1] * 65536 + startParts[2] * 256 + startParts[3];
            const endIP = endParts[0] * 16777216 + endParts[1] * 65536 + endParts[2] * 256 + endParts[3];
            size = endIP - startIP + 1;
          }
        }

        // Tính số lượng IP đã sử dụng trong range này
        const used = activeLeases.filter(lease => {
          if (!lease.address) return false;
          
          const ip = lease.address;
          const ipParts = ip.split('.').map(Number);
          const ipValue = ipParts[0] * 16777216 + ipParts[1] * 65536 + ipParts[2] * 256 + ipParts[3];
          
          const startParts = start.split('.').map(Number);
          const endParts = end.split('.').map(Number);
          
          const startValue = startParts[0] * 16777216 + startParts[1] * 65536 + startParts[2] * 256 + startParts[3];
          const endValue = endParts[0] * 16777216 + endParts[1] * 65536 + endParts[2] * 256 + endParts[3];
          
          return ipValue >= startValue && ipValue <= endValue;
        }).length;

        // Tính phần trăm còn trống
        const availablePercentage = size > 0 ? 100 - (used / size * 100) : 0;

        return {
          name,
          start,
          end,
          size,
          used,
          availablePercentage
        };
      });

      // Tính toán tổng của tất cả các pools
      const totalLeases = dhcpLeases ? dhcpLeases.length : 0;
      const poolSize = poolRanges.reduce((total, range) => total + range.size, 0);
      const availableIPs = poolSize - activeLeases.length;
      const usagePercentage = poolSize > 0 ? (activeLeases.length / poolSize) * 100 : 0;

      const stats: DHCPStats = {
        totalLeases,
        activeLeases: activeLeases.length,
        usagePercentage,
        poolSize,
        availableIPs,
        poolRanges,
        lastUpdated: new Date()
      };

      // Cập nhật cache
      this.cachedStats.set(deviceId, { stats, timestamp: now });

      return stats;
    } catch (error) {
      logger.error(`Lỗi khi lấy thông tin DHCP stats cho thiết bị ID ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Xóa cache cho một thiết bị cụ thể
   */
  clearCache(deviceId: number): void {
    this.cachedStats.delete(deviceId);
  }

  /**
   * Xóa tất cả cache
   */
  clearAllCache(): void {
    this.cachedStats.clear();
  }
}

export const dhcpStatsService = new DHCPStatsService();