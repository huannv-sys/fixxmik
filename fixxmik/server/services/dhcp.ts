import * as RouterOS from 'node-routeros';
import { storage } from '../storage';

/**
 * Interface cho DHCP Lease
 */
export interface DHCPLease {
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

/**
 * Dịch vụ quản lý DHCP
 */
export class DHCPService {
  /**
   * Lấy danh sách DHCP leases từ thiết bị MikroTik
   * @param deviceId ID của thiết bị
   * @returns Danh sách các DHCP leases
   */
  async getDHCPLeases(deviceId: number): Promise<DHCPLease[]> {
    try {
      // Lấy thông tin thiết bị từ cơ sở dữ liệu
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      // Kết nối đến thiết bị MikroTik
      console.log(`Connecting to device ${device.name} (${device.ipAddress}) to get DHCP leases`);
      const client = new RouterOS.RouterOSAPI({
        host: device.ipAddress,
        user: device.username,
        password: device.password,
        port: 8728, // Default API port
        timeout: 10000
      });
      
      try {
        // Thiết lập kết nối
        await client.connect();
        console.log(`Successfully connected to ${device.ipAddress}`);
        
        // Lấy danh sách DHCP leases từ thiết bị
        console.log('Fetching DHCP leases...');
        const rawLeases = await client.write('/ip/dhcp-server/lease/print');
        
        // Đóng kết nối
        client.close();
        
        // Chuyển đổi dữ liệu sang định dạng mong muốn
        const leases: DHCPLease[] = rawLeases.map((lease: any) => ({
          id: lease['.id'] || undefined,
          address: lease.address || '',
          macAddress: lease['mac-address'] || '',
          clientId: lease['client-id'] || undefined,
          hostName: lease['host-name'] || undefined,
          comment: lease.comment || undefined,
          dynamic: lease.dynamic === 'true',
          status: lease.status || 'bound',
          expiresAfter: lease['expires-after'] || undefined,
          lastSeen: lease['last-seen'] || undefined,
          server: lease.server || undefined,
          blocked: lease.blocked === 'true'
        }));
        
        console.log(`Found ${leases.length} DHCP leases`);
        return leases;
      } catch (error) {
        console.error(`Error fetching DHCP leases from device ${deviceId}:`, error);
        client.close();
        throw error;
      }
    } catch (error) {
      console.error(`Failed to get DHCP leases for device ${deviceId}:`, error);
      throw error;
    }
  }
}

// Tạo instance của DHCPService để sử dụng trong toàn ứng dụng
export const dhcpService = new DHCPService();