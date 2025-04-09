/**
 * Connection Stats Service - Thu thập thông tin về các kết nối ra vào mạng
 */
import { mikrotikService } from './mikrotik';
import { logger } from '../logger';

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

class ConnectionStatsService {
  private cachedStats = new Map<number, { stats: ConnectionStats, timestamp: number }>();
  // Cache thời gian 1 phút
  private readonly CACHE_TTL = 60 * 1000;

  // Service name mapping cho các port phổ biến
  private readonly commonPorts: { [port: number]: { name: string, protocol: string } } = {
    21: { name: 'FTP', protocol: 'tcp' },
    22: { name: 'SSH', protocol: 'tcp' },
    23: { name: 'Telnet', protocol: 'tcp' },
    25: { name: 'SMTP', protocol: 'tcp' },
    53: { name: 'DNS', protocol: 'udp' },
    80: { name: 'HTTP', protocol: 'tcp' },
    110: { name: 'POP3', protocol: 'tcp' },
    123: { name: 'NTP', protocol: 'udp' },
    143: { name: 'IMAP', protocol: 'tcp' },
    161: { name: 'SNMP', protocol: 'udp' },
    443: { name: 'HTTPS', protocol: 'tcp' },
    465: { name: 'SMTPS', protocol: 'tcp' },
    587: { name: 'SMTP Submission', protocol: 'tcp' },
    993: { name: 'IMAPS', protocol: 'tcp' },
    995: { name: 'POP3S', protocol: 'tcp' },
    1194: { name: 'OpenVPN', protocol: 'udp' },
    1723: { name: 'PPTP', protocol: 'tcp' },
    3389: { name: 'RDP', protocol: 'tcp' },
    5060: { name: 'SIP', protocol: 'udp' },
    8080: { name: 'HTTP Proxy', protocol: 'tcp' },
    8443: { name: 'HTTPS Alternate', protocol: 'tcp' }
  };

  /**
   * Lấy thông tin thống kê connection tracking cho một thiết bị Mikrotik
   */
  async getConnectionStats(deviceId: number): Promise<ConnectionStats | null> {
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
        logger.warn(`Không thể kết nối đến thiết bị ID ${deviceId} để lấy thông tin connection tracking`);
        return null;
      }

      // Lấy client
      const client = mikrotikService.getClientForDevice(deviceId);
      if (!client) {
        logger.warn(`Không thể lấy client cho thiết bị ID ${deviceId}`);
        return null;
      }

      // Lấy tất cả connections
      const connections = await client.executeCommand('/ip/firewall/connection/print');
      
      if (!connections || !Array.isArray(connections)) {
        logger.warn(`Không lấy được thông tin connection tracking từ thiết bị ID ${deviceId}`);
        return null;
      }

      // In log để debug
      logger.info(`Received ${connections.length} connections from device ${deviceId}`);
      if (connections.length > 0) {
        logger.info(`Sample connection: ${JSON.stringify(connections[0])}`);
      }

      // Tính tổng số kết nối
      const totalConnections = connections.length;
      
      // Phân loại theo protocol
      const tcpConnections = connections.filter(conn => conn.protocol === 'tcp').length;
      const udpConnections = connections.filter(conn => conn.protocol === 'udp').length;
      const icmpConnections = connections.filter(conn => conn.protocol === 'icmp').length;
      const otherConnections = totalConnections - tcpConnections - udpConnections - icmpConnections;

      // Lấy tất cả địa chỉ IP (nguồn và đích)
      const sourcesMap = new Map<string, number>();
      const destinationsMap = new Map<string, number>();
      const portsMap = new Map<string, number>(); // format: "port-protocol"

      // Đếm kết nối nội bộ và bên ngoài
      let internalConnections = 0;
      let externalConnections = 0;

      // Duyệt qua tất cả các kết nối
      for (const conn of connections) {
        // Xác định nguồn
        const srcIP = conn['src-address']?.split(':')[0];
        if (srcIP) {
          sourcesMap.set(srcIP, (sourcesMap.get(srcIP) || 0) + 1);
        }

        // Xác định đích
        const dstIP = conn['dst-address']?.split(':')[0];
        if (dstIP) {
          destinationsMap.set(dstIP, (destinationsMap.get(dstIP) || 0) + 1);
        }

        // Xác định port và protocol
        // Tập trung vào port đích (dst-port) vì đó là các cổng dịch vụ
        const dstPort = conn['dst-port'] ? parseInt(conn['dst-port']) : null;
        if (dstPort && conn.protocol) {
          const key = `${dstPort}-${conn.protocol}`;
          portsMap.set(key, (portsMap.get(key) || 0) + 1);
          
          // Log chi tiết về kết nối có port để debug
          if (portsMap.size < 5) { // Chỉ log một số ít kết nối để tránh tràn log
            logger.debug(`Found port connection: ${dstPort} (${conn.protocol}), src: ${conn['src-address']}, dst: ${conn['dst-address']}`);
          }
        }

        // Phân loại nội bộ và bên ngoài
        if (srcIP && dstIP) {
          // Check if internal connection (both private IP ranges)
          const isInternal = this.isPrivateIP(srcIP) && this.isPrivateIP(dstIP);
          if (isInternal) {
            internalConnections++;
          } else {
            externalConnections++;
          }
        }
      }

      // Top 10 Sources
      const top10Sources = Array.from(sourcesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ipAddress, connectionCount]) => ({
          ipAddress,
          connectionCount,
          percentage: (connectionCount / totalConnections) * 100
        }));

      // Top 10 Destinations
      const top10Destinations = Array.from(destinationsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ipAddress, connectionCount]) => ({
          ipAddress,
          connectionCount,
          percentage: (connectionCount / totalConnections) * 100
        }));

      // Top 10 Ports
      const top10Ports = Array.from(portsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([portProtocol, connectionCount]) => {
          const [portStr, protocol] = portProtocol.split('-');
          const port = parseInt(portStr);
          
          // Thêm thông tin service name nếu có
          const serviceName = this.commonPorts[port]?.name;
          
          return {
            port,
            protocol,
            connectionCount,
            percentage: (connectionCount / totalConnections) * 100,
            serviceName
          };
        });

      // Tạo thống kê
      const stats: ConnectionStats = {
        totalConnections,
        activeConnections: totalConnections, // Tất cả connections được liệt kê đều đang hoạt động
        tcpConnections,
        udpConnections,
        icmpConnections,
        otherConnections,
        top10Sources,
        top10Destinations,
        top10Ports,
        externalConnections,
        internalConnections,
        lastUpdated: new Date()
      };

      // Cập nhật cache
      this.cachedStats.set(deviceId, { stats, timestamp: now });

      return stats;
    } catch (error) {
      logger.error(`Lỗi khi lấy thông tin connection stats cho thiết bị ID ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Kiểm tra xem một địa chỉ IP có phải là IP private hay không
   */
  private isPrivateIP(ip: string): boolean {
    // Check if IP belongs to private ranges: 10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x
    const parts = ip.split('.').map(Number);
    
    if (parts.length !== 4) return false;
    
    return (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    );
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

export const connectionStatsService = new ConnectionStatsService();