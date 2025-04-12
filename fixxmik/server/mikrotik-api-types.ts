/**
 * Định nghĩa các kiểu dữ liệu trả về từ MikroTik API
 * Sử dụng để cải thiện type checking và intellisense
 */

// Bản ghi ARP từ MikroTik API
export interface ArpEntry {
  id: string;
  address: string;
  macAddress: string;
  interface: string;
  complete?: string;
  disabled?: string;
  dynamic?: string;
  invalid?: string;
  lastSeen?: Date;
  deviceId?: number; // ID của thiết bị Mikrotik nguồn
}

// Bản ghi DHCP từ MikroTik API
export interface DhcpLease {
  id: string;
  address: string;
  macAddress: string;
  clientId?: string;
  hostName?: string;
  comment?: string;
  status: string;
  lastSeen?: Date;
  server?: string;
  disabled?: boolean;
  dynamic?: boolean;
  blocked?: boolean;
  radius?: boolean;
  expiresAfter?: string;
  activeAddress?: string;
  activeServerId?: string;
  agentCircuitId?: string;
  agentRemoteId?: string;
  deviceId?: number; // ID của thiết bị Mikrotik nguồn
}

// Bản ghi interface từ MikroTik API
export interface MikrotikInterface {
  id: string;
  name: string;
  type: string;
  mtu?: number;
  actualMtu?: number;
  l2mtu?: number;
  macAddress?: string;
  running?: boolean;
  disabled?: boolean;
  comment?: string;
  txPackets?: number;
  rxPackets?: number;
  txBytes?: number;
  rxBytes?: number;
  txDrops?: number;
  rxDrops?: number;
  txErrors?: number;
  rxErrors?: number;
  lastLinkUpTime?: string;
  linkDowns?: number;
  speed?: string;
  user?: string;
  uptime?: string;
  activeAddress?: string;
}

// Thiết bị mạng được phát hiện thông qua MikroTik API
export interface NetworkDeviceDetails {
  ipAddress: string;
  macAddress: string;
  hostname?: string; // Khớp với tên trường trong schema.ts
  interface?: string;
  vendor?: string;
  firstSeen?: Date;
  lastSeen?: Date;
  deviceType?: string;
  deviceData?: Record<string, any>;
  isOnline?: boolean; // Trạng thái online/offline của thiết bị
  metadata?: {
    openPorts?: number[];
    httpHeaders?: Record<string, string>;
    snmpData?: {
      sysName?: string;
      sysDescr?: string;
      sysObjectID?: string;
      sysContact?: string;
      sysLocation?: string;
      sysUpTime?: string;
      sysServices?: number;
    };
    deviceClass?: string;
    gateway?: string;
  };
  // Thêm các trường tương thích với networkDevices schema
  hostName?: string; // Trường cũ để tương thích ngược
  deviceRole?: string;
  txBytes?: number;
  rxBytes?: number;
  txRate?: number;
  rxRate?: number;
  description?: string;
  isIdentified?: boolean;
  identificationScore?: number;
  isManaged?: boolean;
  managedDeviceId?: number;
}
