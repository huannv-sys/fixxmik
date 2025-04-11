import { getMacVendor } from './device-identification';
import { networkDevices } from '../../shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

interface DeviceClassification {
  deviceType: string;
  deviceRole?: string;
  confidenceScore?: number;
}

// Function to classify a device based on its ID from the database
export async function classifyDevice(deviceId: number): Promise<string> {
  try {
    const [device] = await db.select()
      .from(networkDevices)
      .where(eq(networkDevices.id, deviceId));
    
    if (!device) {
      return DeviceRole.Unknown;
    }
    
    // Classify based on MAC address, IP, and vendor info
    const classification = await classifyDeviceByDetails(
      device.macAddress, 
      device.ipAddress, 
      device.vendor || undefined
    );
    
    return classification.deviceRole || DeviceRole.Unknown;
  } catch (error) {
    console.error("Error classifying device by ID:", error);
    return DeviceRole.Unknown;
  }
}

// Add a wrapper function to keep compatibility with previous code
export async function reclassifyAllDevices(): Promise<number> {
  try {
    const devices = await db.select().from(networkDevices);
    let updatedCount = 0;
    
    for (const device of devices) {
      const role = await classifyDevice(device.id);
      
      // Update the device role in the database
      await db.update(networkDevices)
        .set({ deviceRole: role })
        .where(eq(networkDevices.id, device.id));
        
      updatedCount++;
    }
    
    return updatedCount;
  } catch (error) {
    console.error("Error reclassifying devices:", error);
    return 0;
  }
}

// Get the recommended monitoring methods for a device role
export function getMonitoringMethodsForRole(role: string): string[] {
  const monitoringMethodsByRole: Record<string, string[]> = {
    [DeviceRole.Router]: ['SNMP', 'API', 'Ping'],
    [DeviceRole.Network]: ['SNMP', 'Ping'],
    [DeviceRole.Server]: ['SNMP', 'WMI', 'Ping', 'HTTP'],
    [DeviceRole.Endpoint]: ['Ping', 'ARP', 'HTTP'],
    [DeviceRole.Mobile]: ['Ping', 'ARP'],
    [DeviceRole.IoT]: ['Ping', 'ARP'],
    [DeviceRole.Printer]: ['SNMP', 'Ping'],
    [DeviceRole.Security]: ['SNMP', 'Ping', 'RTSP'],
    [DeviceRole.Multimedia]: ['Ping', 'UPnP'],
    [DeviceRole.VoIP]: ['SIP', 'Ping'],
    [DeviceRole.Unknown]: ['Ping', 'ARP'],
  };
  
  return monitoringMethodsByRole[role] || monitoringMethodsByRole[DeviceRole.Unknown];
}

// Danh sách các loại thiết bị
export enum DeviceType {
  Unknown = 'Unknown',
  Router = 'Router',
  Switch = 'Switch',
  AccessPoint = 'AccessPoint',
  Server = 'Server',
  Desktop = 'Desktop',
  Laptop = 'Laptop',
  Mobile = 'Mobile',
  Tablet = 'Tablet',
  IOT = 'IOT',
  Camera = 'Camera',
  Printer = 'Printer',
  SmartTV = 'SmartTV',
  VoIP = 'VoIP'
}

// Danh sách các vai trò thiết bị
export enum DeviceRole {
  Unknown = 'unknown',
  Endpoint = 'endpoint',
  Infrastructure = 'infrastructure',
  Server = 'server',
  Mobile = 'mobile',
  IoT = 'iot',
  Storage = 'storage',
  Printer = 'printer',
  Multimedia = 'multimedia',
  Security = 'security',
  Network = 'network',
  VoIP = 'voip',
  Router = 'router'
}

// Danh sách các nhà sản xuất và loại thiết bị tương ứng
const vendorToDeviceTypeMap: Record<string, DeviceType> = {
  // Networking
  'Cisco': DeviceType.Router,
  'Mikrotik': DeviceType.Router,
  'Ubiquiti': DeviceType.Router,
  'TP-Link': DeviceType.Router,
  'D-Link': DeviceType.Router,
  'ASUS': DeviceType.Router,
  'NETGEAR': DeviceType.Router,
  'Aruba': DeviceType.AccessPoint,
  'Huawei': DeviceType.Router,
  'Linksys': DeviceType.Router,
  'ZyXEL': DeviceType.Router,
  'Juniper': DeviceType.Router,
  'Fortinet': DeviceType.Router,
  'Meraki': DeviceType.AccessPoint,
  
  // Mobile devices
  'Apple': DeviceType.Mobile,
  'Samsung': DeviceType.Mobile,
  'Google': DeviceType.Mobile,
  'OnePlus': DeviceType.Mobile,
  'Xiaomi': DeviceType.Mobile,
  'Oppo': DeviceType.Mobile,
  'Vivo': DeviceType.Mobile,
  'LG': DeviceType.Mobile,
  'Motorola': DeviceType.Mobile,
  'Nokia': DeviceType.Mobile,
  'Honor': DeviceType.Mobile,
  'Realme': DeviceType.Mobile,
  
  // PC/Laptop
  'Dell': DeviceType.Desktop,
  'HP': DeviceType.Desktop,
  'Lenovo': DeviceType.Laptop,
  'Intel': DeviceType.Desktop,
  'ASUS Computer': DeviceType.Laptop,
  'Gigabyte': DeviceType.Desktop,
  'Acer': DeviceType.Laptop,
  'MSI': DeviceType.Laptop,
  'Microsoft': DeviceType.Laptop,
  
  // Printers
  'HP Inc': DeviceType.Printer,
  'Brother': DeviceType.Printer,
  'Canon': DeviceType.Printer,
  'Epson': DeviceType.Printer,
  'Xerox': DeviceType.Printer,
  'Kyocera': DeviceType.Printer,
  
  // IoT devices
  'Amazon': DeviceType.IOT,
  'Google Home': DeviceType.IOT,
  'Nest': DeviceType.IOT,
  'Ecobee': DeviceType.IOT,
  'Ring': DeviceType.IOT,
  'Philips': DeviceType.IOT,
  'Sonos': DeviceType.IOT,

  // Cameras
  'Hikvision': DeviceType.Camera,
  'Dahua': DeviceType.Camera,
  'Axis': DeviceType.Camera,
  'Bosch': DeviceType.Camera,
  'GoPro': DeviceType.Camera,
  'Logitech': DeviceType.Camera,
  
  // Smart TVs
  'Sony': DeviceType.SmartTV,
  'Vizio': DeviceType.SmartTV,
  'TCL': DeviceType.SmartTV,
  'Hisense': DeviceType.SmartTV,
  'Panasonic': DeviceType.SmartTV,
  'Sharp': DeviceType.SmartTV,
  
  // VoIP
  'Cisco Systems': DeviceType.VoIP,
  'Polycom': DeviceType.VoIP,
  'Avaya': DeviceType.VoIP,
  'Grandstream': DeviceType.VoIP,
  'Yealink': DeviceType.VoIP
};

// Ánh xạ từ DeviceType sang DeviceRole
const deviceTypeToRoleMap: Record<string, DeviceRole> = {
  [DeviceType.Unknown]: DeviceRole.Unknown,
  [DeviceType.Router]: DeviceRole.Router,
  [DeviceType.Switch]: DeviceRole.Network,
  [DeviceType.AccessPoint]: DeviceRole.Network,
  [DeviceType.Server]: DeviceRole.Server,
  [DeviceType.Desktop]: DeviceRole.Endpoint,
  [DeviceType.Laptop]: DeviceRole.Endpoint,
  [DeviceType.Mobile]: DeviceRole.Mobile,
  [DeviceType.Tablet]: DeviceRole.Mobile,
  [DeviceType.IOT]: DeviceRole.IoT,
  [DeviceType.Camera]: DeviceRole.Security,
  [DeviceType.Printer]: DeviceRole.Printer,
  [DeviceType.SmartTV]: DeviceRole.Multimedia,
  [DeviceType.VoIP]: DeviceRole.VoIP
};

/**
 * Phân loại thiết bị dựa trên thông tin MAC address, địa chỉ IP và nhà sản xuất
 * 
 * @param macAddress Địa chỉ MAC của thiết bị
 * @param ipAddress Địa chỉ IP của thiết bị
 * @param vendor Tên nhà sản xuất (nếu đã biết)
 * @returns Kết quả phân loại thiết bị
 */
export async function classifyDeviceByDetails(macAddress: string, ipAddress: string, vendor?: string): Promise<DeviceClassification> {
  // Nếu không cung cấp vendor, tra cứu từ MAC address
  if (!vendor) {
    vendor = await getMacVendor(macAddress);
  }
  
  // Kết quả phân loại mặc định
  const result: DeviceClassification = {
    deviceType: DeviceType.Unknown,
    deviceRole: DeviceRole.Unknown,
    confidenceScore: 0.5
  };
  
  // Phân loại dựa trên nhà sản xuất
  if (vendor) {
    // Tìm kiếm trong danh sách các nhà sản xuất đã biết
    for (const [vendorPattern, deviceType] of Object.entries(vendorToDeviceTypeMap)) {
      if (vendor.includes(vendorPattern)) {
        result.deviceType = deviceType;
        result.deviceRole = deviceTypeToRoleMap[deviceType];
        result.confidenceScore = 0.8;
        break;
      }
    }
  }
  
  // Phân tích địa chỉ IP để có thêm thông tin
  // - Các địa chỉ IP cụ thể có thể chỉ ra vai trò, ví dụ: x.x.x.1 thường là router/gateway
  if (ipAddress) {
    const ipParts = ipAddress.split('.');
    const lastOctet = Number(ipParts[3]);
    
    // Địa chỉ IP thấp (1-5) thường là thiết bị mạng hoặc server
    if (lastOctet <= 5) {
      if (result.deviceType === DeviceType.Unknown) {
        result.deviceType = DeviceType.Router;
        result.deviceRole = DeviceRole.Router;
        result.confidenceScore = 0.6;
      } else {
        // Tăng độ tin cậy nếu đã phân loại từ vendor
        result.confidenceScore = Math.min(0.9, (result.confidenceScore || 0) + 0.1);
      }
    }
    
    // Địa chỉ IP cao (220+) thường là thiết bị endpoint
    if (lastOctet >= 220) {
      if (result.deviceType === DeviceType.Unknown) {
        result.deviceType = DeviceType.Desktop;
        result.deviceRole = DeviceRole.Endpoint;
        result.confidenceScore = 0.5;
      }
    }
  }
  
  // Phân tích OUI (Organizationally Unique Identifier) từ MAC address
  // OUI là 3 byte đầu tiên của MAC address
  const oui = macAddress.substring(0, 8).toUpperCase();
  
  // Một số OUI đặc biệt của các thiết bị phổ biến
  const specialOUIs: Record<string, DeviceType> = {
    '00:0C:29': DeviceType.Server, // VMware
    '00:50:56': DeviceType.Server, // VMware
    '00:1A:11': DeviceType.IOT,    // Google Home
    '18:B4:30': DeviceType.IOT,    // Nest
    'B8:27:EB': DeviceType.IOT,    // Raspberry Pi
    'DC:A6:32': DeviceType.IOT,    // Raspberry Pi
    '00:04:F2': DeviceType.Printer, // Polycom
    '00:90:4C': DeviceType.VoIP,   // Epox
  };
  
  // Kiểm tra OUI đặc biệt
  for (const [ouiPattern, deviceType] of Object.entries(specialOUIs)) {
    if (oui.startsWith(ouiPattern.substring(0, 6))) {
      result.deviceType = deviceType;
      result.deviceRole = deviceTypeToRoleMap[deviceType];
      result.confidenceScore = 0.85;
      break;
    }
  }
  
  return result;
}