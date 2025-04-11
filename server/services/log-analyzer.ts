import { MikrotikService } from './mikrotik';
import * as storage from '../storage';

/**
 * Dịch vụ phân tích logs từ Mikrotik RouterOS để lấy dữ liệu traffic và phân tích
 */
export class LogAnalyzerService {
  private mikrotikService: MikrotikService;
  
  constructor(mikrotikService: MikrotikService) {
    this.mikrotikService = mikrotikService;
  }
  
  /**
   * Phân tích log traffic từ thiết bị Mikrotik
   * @param deviceId ID của thiết bị
   * @param options Các tùy chọn cho phân tích
   */
  async analyzeTrafficLogs(deviceId: number, options: {
    timeRange?: 'hour' | 'day' | 'week' | 'month';
    startDate?: Date;
    endDate?: Date;
    interface?: string;
    limit?: number;
    categories?: boolean; // Phân loại theo dịch vụ
    topClients?: number; // Số lượng top clients
  } = {}) {
    try {
      const {
        timeRange = 'day',
        startDate,
        endDate,
        interface: interfaceName,
        limit = 1000,
        categories = true,
        topClients = 10
      } = options;
      
      // Xác định topics để lấy log
      const topics = ['firewall', 'connection'];
      
      // Xác định khoảng thời gian
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      
      if (startDate) {
        dateFrom = this.formatDate(startDate);
      } else {
        // Mặc định lấy theo timeRange
        const fromDate = new Date();
        switch (timeRange) {
          case 'hour':
            fromDate.setHours(fromDate.getHours() - 1);
            break;
          case 'day':
            fromDate.setDate(fromDate.getDate() - 1);
            break;
          case 'week':
            fromDate.setDate(fromDate.getDate() - 7);
            break;
          case 'month':
            fromDate.setMonth(fromDate.getMonth() - 1);
            break;
        }
        dateFrom = this.formatDate(fromDate);
      }
      
      if (endDate) {
        dateTo = this.formatDate(endDate);
      }
      
      // Lấy logs từ thiết bị
      const result = await this.mikrotikService.getDeviceLogs(deviceId, {
        topics,
        limit,
        dateFrom,
        dateTo
      });
      
      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || 'Không thể lấy logs từ thiết bị'
        };
      }
      
      const logs = result.data;
      
      // Phân tích logs
      const analysis = this.processTrafficLogs(logs, {
        interfaceName,
        includeCategories: categories,
        topClients
      });
      
      return {
        success: true,
        data: analysis,
        message: `Đã phân tích ${logs.length} log records`
      };
    } catch (error) {
      console.error(`Error analyzing traffic logs for device ${deviceId}:`, error);
      return {
        success: false,
        message: `Lỗi khi phân tích logs: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Xử lý dữ liệu logs để phân tích traffic
   */
  private processTrafficLogs(logs: any[], options: {
    interfaceName?: string;
    includeCategories?: boolean;
    topClients?: number;
  }) {
    const {
      interfaceName,
      includeCategories = true,
      topClients = 10
    } = options;
    
    // Thống kê theo protocol
    const protocolStats: Record<string, { connections: number; bytes: number }> = {};
    
    // Thống kê theo IP nguồn
    const sourceIpStats: Record<string, { connections: number; bytes: number }> = {};
    
    // Thống kê theo IP đích
    const destIpStats: Record<string, { connections: number; bytes: number }> = {};
    
    // Thống kê theo interface
    const interfaceStats: Record<string, { connections: number; bytes: number }> = {};
    
    // Thống kê theo port
    const portStats: Record<string, { connections: number; service: string }> = {};
    
    // Map port to service name
    const commonPorts: Record<string, string> = {
      '80': 'HTTP',
      '443': 'HTTPS',
      '22': 'SSH',
      '21': 'FTP',
      '25': 'SMTP',
      '110': 'POP3',
      '143': 'IMAP',
      '53': 'DNS',
      '3389': 'RDP',
      '1194': 'OpenVPN',
      '1723': 'PPTP',
      '1701': 'L2TP',
      '500': 'IPSec',
      '4500': 'IPSec NAT-T',
      '5060': 'SIP',
      '5061': 'SIP TLS',
      '3306': 'MySQL',
      '5432': 'PostgreSQL',
      '27017': 'MongoDB',
      '6379': 'Redis',
      '11211': 'Memcached',
      '9200': 'Elasticsearch',
      '9300': 'Elasticsearch',
      '2049': 'NFS',
      '445': 'SMB',
      '139': 'NetBIOS',
      '137': 'NetBIOS',
      '138': 'NetBIOS',
      '389': 'LDAP',
      '636': 'LDAPS',
      '88': 'Kerberos',
      '464': 'Kerberos',
      '3268': 'LDAP GC',
      '3269': 'LDAP GC SSL',
      '67': 'DHCP Server',
      '68': 'DHCP Client',
      '5353': 'mDNS',
      '5355': 'LLMNR',
      '1900': 'SSDP',
      '5000': 'UPnP',
      '161': 'SNMP',
      '162': 'SNMP Trap',
      '123': 'NTP',
      '514': 'Syslog',
      '5514': 'Syslog TLS',
      '6514': 'Syslog TLS',
      '6666': 'IRC',
      '6667': 'IRC',
      '6697': 'IRC SSL',
      '194': 'IRC',
      '6660': 'IRC',
      '6661': 'IRC',
      '6662': 'IRC',
      '6663': 'IRC',
      '6664': 'IRC',
      '6665': 'IRC',
      '6668': 'IRC',
      '6669': 'IRC',
      '6670': 'IRC',
      '6671': 'IRC',
      '6672': 'IRC',
      '6673': 'IRC',
      '6674': 'IRC',
      '6675': 'IRC',
      '6676': 'IRC',
      '6677': 'IRC',
      '6678': 'IRC',
      '6679': 'IRC',
      '6680': 'IRC',
      '6681': 'IRC',
      '6682': 'IRC',
      '6683': 'IRC',
      '6684': 'IRC',
      '6685': 'IRC',
      '6686': 'IRC',
      '6687': 'IRC',
      '6688': 'IRC',
      '6689': 'IRC',
      '1935': 'RTMP',
      '554': 'RTSP',
      '5004': 'RTP',
      '5005': 'RTCP',
      '8000': 'HTTP Alt',
      '8008': 'HTTP Alt',
      '8080alt': 'HTTP Proxy',
      '8009': 'AJP',
      '8081': 'HTTP Alt',
      '8082': 'HTTP Alt',
      '8083': 'HTTP Alt',
      '8084': 'HTTP Alt',
      '8085': 'HTTP Alt',
      '8086': 'HTTP Alt',
      '8087': 'HTTP Alt',
      '8088': 'HTTP Alt',
      '8089': 'HTTP Alt',
      '8090': 'HTTP Alt',
      '8091': 'HTTP Alt',
      '8092': 'HTTP Alt',
      '8093': 'HTTP Alt',
      '8094': 'HTTP Alt',
      '8095': 'HTTP Alt',
      '8096': 'HTTP Alt',
      '8097': 'HTTP Alt',
      '8098': 'HTTP Alt',
      '8099': 'HTTP Alt',
      '8100': 'HTTP Alt',
      '8433': 'HTTPS Alt',
      '8434': 'HTTPS Alt',
      '8435': 'HTTPS Alt',
      '8436': 'HTTPS Alt',
      '8437': 'HTTPS Alt',
      '8438': 'HTTPS Alt',
      '8439': 'HTTPS Alt',
      '8440': 'HTTPS Alt',
      '8441': 'HTTPS Alt',
      '8442': 'HTTPS Alt',
      '8443alt': 'HTTPS Alt',
      '8444': 'HTTPS Alt',
      '8445': 'HTTPS Alt',
      '8446': 'HTTPS Alt',
      '8447': 'HTTPS Alt',
      '8448': 'HTTPS Alt',
      '8449': 'HTTPS Alt',
      '8450': 'HTTPS Alt',
      '8451': 'HTTPS Alt',
      '8452': 'HTTPS Alt',
    };
    
    // Thống kê tổng quan
    const summary = {
      totalConnections: 0,
      totalBytes: 0,
      incomingConnections: 0,
      outgoingConnections: 0,
      incomingBytes: 0,
      outgoingBytes: 0,
      timeRange: {
        start: new Date(),
        end: new Date(0) // Khởi tạo với giá trị thời gian nhỏ nhất
      }
    };
    
    // Phân loại dữ liệu
    for (const log of logs) {
      // Bỏ qua log nếu không thuộc topic connection hoặc firewall
      if (!log.topics || !String(log.topics).match(/connection|firewall/i)) {
        continue;
      }
      
      // Phân tích thời gian
      if (log.time && log.date) {
        const dateStr = log.date.replace(/([0-9]+)\/([0-9]+)\/([0-9]+)/, '$3-$1-$2');
        const logDate = new Date(`${dateStr}T${log.time}`);
        
        if (logDate < summary.timeRange.start) {
          summary.timeRange.start = logDate;
        }
        
        if (logDate > summary.timeRange.end) {
          summary.timeRange.end = logDate;
        }
      }
      
      // Phân tích message
      if (log.message) {
        // Kết nối TCP/UDP
        const connMatch = log.message.match(/([a-z]+),([0-9a-f\.:]+):([0-9]+)->([0-9a-f\.:]+):([0-9]+)/i);
        if (connMatch) {
          const protocol = connMatch[1].toUpperCase();
          const srcIp = connMatch[2];
          const srcPort = connMatch[3];
          const dstIp = connMatch[4];
          const dstPort = connMatch[5];
          
          // Thống kê theo protocol
          if (!protocolStats[protocol]) {
            protocolStats[protocol] = { connections: 0, bytes: 0 };
          }
          protocolStats[protocol].connections++;
          
          // Thống kê theo IP nguồn
          if (!sourceIpStats[srcIp]) {
            sourceIpStats[srcIp] = { connections: 0, bytes: 0 };
          }
          sourceIpStats[srcIp].connections++;
          
          // Thống kê theo IP đích
          if (!destIpStats[dstIp]) {
            destIpStats[dstIp] = { connections: 0, bytes: 0 };
          }
          destIpStats[dstIp].connections++;
          
          // Thống kê theo port
          if (!portStats[dstPort]) {
            const service = commonPorts[dstPort] || 'Unknown';
            portStats[dstPort] = { connections: 0, service };
          }
          portStats[dstPort].connections++;
          
          // Thống kê tổng quan
          summary.totalConnections++;
          
          // Phân loại kết nối vào/ra
          const isLocalSrc = this.isLocalIp(srcIp);
          const isLocalDst = this.isLocalIp(dstIp);
          
          if (isLocalSrc && !isLocalDst) {
            summary.outgoingConnections++;
          } else if (!isLocalSrc && isLocalDst) {
            summary.incomingConnections++;
          }
        }
        
        // Kết nối ICMP
        const icmpMatch = log.message.match(/ICMP,([0-9a-f\.:]+)->([0-9a-f\.:]+)/i);
        if (icmpMatch) {
          const srcIp = icmpMatch[1];
          const dstIp = icmpMatch[2];
          
          // Thống kê theo protocol
          if (!protocolStats['ICMP']) {
            protocolStats['ICMP'] = { connections: 0, bytes: 0 };
          }
          protocolStats['ICMP'].connections++;
          
          // Thống kê theo IP nguồn
          if (!sourceIpStats[srcIp]) {
            sourceIpStats[srcIp] = { connections: 0, bytes: 0 };
          }
          sourceIpStats[srcIp].connections++;
          
          // Thống kê theo IP đích
          if (!destIpStats[dstIp]) {
            destIpStats[dstIp] = { connections: 0, bytes: 0 };
          }
          destIpStats[dstIp].connections++;
          
          // Thống kê tổng quan
          summary.totalConnections++;
          
          // Phân loại kết nối vào/ra
          const isLocalSrc = this.isLocalIp(srcIp);
          const isLocalDst = this.isLocalIp(dstIp);
          
          if (isLocalSrc && !isLocalDst) {
            summary.outgoingConnections++;
          } else if (!isLocalSrc && isLocalDst) {
            summary.incomingConnections++;
          }
        }
        
        // Thống kê bytes
        const bytesMatch = log.message.match(/bytes:([0-9]+)/i);
        if (bytesMatch) {
          const bytes = parseInt(bytesMatch[1]);
          summary.totalBytes += bytes;
          
          // Phân loại bytes vào/ra
          if (connMatch) {
            const srcIp = connMatch[2];
            const dstIp = connMatch[4];
            
            // Thống kê theo IP nguồn và đích
            sourceIpStats[srcIp].bytes += bytes;
            destIpStats[dstIp].bytes += bytes;
            
            // Thống kê theo protocol
            const protocol = connMatch[1].toUpperCase();
            protocolStats[protocol].bytes += bytes;
            
            // Phân loại bytes vào/ra
            const isLocalSrc = this.isLocalIp(srcIp);
            const isLocalDst = this.isLocalIp(dstIp);
            
            if (isLocalSrc && !isLocalDst) {
              summary.outgoingBytes += bytes;
            } else if (!isLocalSrc && isLocalDst) {
              summary.incomingBytes += bytes;
            }
          } else if (icmpMatch) {
            const srcIp = icmpMatch[1];
            const dstIp = icmpMatch[2];
            
            // Thống kê theo IP nguồn và đích
            sourceIpStats[srcIp].bytes += bytes;
            destIpStats[dstIp].bytes += bytes;
            
            // Thống kê theo protocol
            protocolStats['ICMP'].bytes += bytes;
            
            // Phân loại bytes vào/ra
            const isLocalSrc = this.isLocalIp(srcIp);
            const isLocalDst = this.isLocalIp(dstIp);
            
            if (isLocalSrc && !isLocalDst) {
              summary.outgoingBytes += bytes;
            } else if (!isLocalSrc && isLocalDst) {
              summary.incomingBytes += bytes;
            }
          }
        }
        
        // Thống kê theo interface
        const interfaceMatch = log.message.match(/in:([a-z0-9-]+)/i) || log.message.match(/out:([a-z0-9-]+)/i);
        if (interfaceMatch) {
          const interfaceName = interfaceMatch[1];
          
          // Bỏ qua nếu filter theo interface nhưng không khớp
          if (options.interfaceName && options.interfaceName !== interfaceName) {
            continue;
          }
          
          if (!interfaceStats[interfaceName]) {
            interfaceStats[interfaceName] = { connections: 0, bytes: 0 };
          }
          
          interfaceStats[interfaceName].connections++;
          
          // Thêm bytes nếu có
          if (bytesMatch) {
            const bytes = parseInt(bytesMatch[1]);
            interfaceStats[interfaceName].bytes += bytes;
          }
        }
      }
    }
    
    // Sắp xếp và lấy top clients
    const topSourceIps = Object.entries(sourceIpStats)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, topClients)
      .map(([ip, stats]) => ({
        ip,
        connections: stats.connections,
        bytes: stats.bytes,
        bytesFormatted: this.formatBytes(stats.bytes)
      }));
    
    const topDestIps = Object.entries(destIpStats)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, topClients)
      .map(([ip, stats]) => ({
        ip,
        connections: stats.connections,
        bytes: stats.bytes,
        bytesFormatted: this.formatBytes(stats.bytes)
      }));
    
    // Chuyển đổi protocol stats thành mảng đã sắp xếp
    const protocolStatsList = Object.entries(protocolStats)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .map(([protocol, stats]) => ({
        protocol,
        connections: stats.connections,
        bytes: stats.bytes,
        bytesFormatted: this.formatBytes(stats.bytes),
        percentage: summary.totalBytes > 0 ? (stats.bytes / summary.totalBytes * 100) : 0
      }));
    
    // Chuyển đổi interface stats thành mảng đã sắp xếp
    const interfaceStatsList = Object.entries(interfaceStats)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .map(([iface, stats]) => ({
        interface: iface,
        connections: stats.connections,
        bytes: stats.bytes,
        bytesFormatted: this.formatBytes(stats.bytes),
        percentage: summary.totalBytes > 0 ? (stats.bytes / summary.totalBytes * 100) : 0
      }));
    
    // Chuyển đổi port stats thành mảng đã sắp xếp
    const portStatsList = Object.entries(portStats)
      .sort((a, b) => b[1].connections - a[1].connections)
      .slice(0, 20) // Chỉ lấy top 20 port
      .map(([port, stats]) => ({
        port: parseInt(port),
        service: stats.service,
        connections: stats.connections
      }));
    
    // Định dạng lại summary
    const formattedSummary = {
      ...summary,
      totalBytesFormatted: this.formatBytes(summary.totalBytes),
      incomingBytesFormatted: this.formatBytes(summary.incomingBytes),
      outgoingBytesFormatted: this.formatBytes(summary.outgoingBytes),
      averageBandwidthMbps: this.calculateAverageBandwidth(summary.totalBytes, summary.timeRange.start, summary.timeRange.end)
    };
    
    // Kết quả phân tích
    return {
      summary: formattedSummary,
      protocols: protocolStatsList,
      interfaces: interfaceStatsList,
      topSources: topSourceIps,
      topDestinations: topDestIps,
      services: portStatsList
    };
  }
  
  /**
   * Kiểm tra xem một IP có phải là địa chỉ local hay không
   */
  private isLocalIp(ip: string): boolean {
    if (ip.startsWith('192.168.') || 
        ip.startsWith('10.') || 
        ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return true;
    }
    
    if (ip.startsWith('fe80:') || ip.startsWith('fd') || ip === '::1') {
      return true;
    }
    
    return false;
  }
  
  /**
   * Định dạng bytes thành chuỗi có đơn vị
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Tính toán băng thông trung bình (Mbps)
   */
  private calculateAverageBandwidth(bytes: number, startTime: Date, endTime: Date): number {
    const timeDiffMs = endTime.getTime() - startTime.getTime();
    
    if (timeDiffMs <= 0) return 0;
    
    const seconds = timeDiffMs / 1000;
    const bits = bytes * 8;
    // Sửa từ 1000000 thành 1024*1024 để đảm bảo chuyển đúng đơn vị Megabits
    const megabits = bits / (1024 * 1024);
    
    return parseFloat((megabits / seconds).toFixed(2));
  }
  
  /**
   * Định dạng ngày tháng theo định dạng MM/DD/YYYY
   */
  private formatDate(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
  }
}

// Khởi tạo service singleton
let instance: LogAnalyzerService | null = null;

export function initLogAnalyzerService(mikrotikService: MikrotikService): LogAnalyzerService {
  if (!instance) {
    instance = new LogAnalyzerService(mikrotikService);
  }
  return instance;
}

export function getLogAnalyzerService(): LogAnalyzerService {
  if (!instance) {
    throw new Error('LogAnalyzerService chưa được khởi tạo');
  }
  return instance;
}