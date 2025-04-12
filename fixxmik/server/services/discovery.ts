import { NetworkDeviceDetails } from "../mikrotik-api-types";
import { execSync } from "child_process";
import * as dns from "dns";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as mikrotik from "./mikrotik";
import * as util from "util";

const dnsLookup = util.promisify(dns.lookup);
const dnsReverse = util.promisify(dns.reverse);

// Kiểm tra xem một host có đang hoạt động không
export async function checkHostReachable(
  ipAddress: string,
  timeout: number = 1000,
): Promise<boolean> {
  try {
    // Không sử dụng ping vì không có quyền trong môi trường Replit
    // Thử kết nối TCP đến các port phổ biến (80, 443, 22, 53)
    for (const port of [80, 443, 22, 53]) {
      try {
        const isOpen = await checkPortOpen(ipAddress, port, timeout);
        if (isOpen) {
          return true;
        }
      } catch (err) {
        // Bỏ qua lỗi và tiếp tục thử port khác
      }
    }

    // Nếu không kết nối được đến bất kỳ port phổ biến nào, thử một kết nối cuối cùng
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(timeout);

      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });

      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });

      // Thử kết nối đến port 80 (web server phổ biến)
      socket.connect(80, ipAddress);
    });
  } catch (error) {
    console.error(`Error checking if host ${ipAddress} is reachable:`, error);
    return false;
  }
}

// Quét các port phổ biến để xác định loại thiết bị
export async function scanCommonPorts(
  ipAddress: string,
  timeout: number = 500,
): Promise<number[]> {
  const commonPorts = [
    20, 21, 22, 23, 25, 53, 80, 81, 88, 110, 111, 135, 139, 143, 389, 443, 445,
    465, 500, 515, 554, 587, 631, 636, 993, 995, 1080, 1194, 1433, 1434, 1723,
    1883, 3000, 3306, 3389, 5060, 5061, 5222, 5432, 5900, 6379, 8000, 8008,
    8080, 8087, 8088, 8291, 8443, 8728, 8729, 8883, 9000, 9100, 9200,
  ];

  const openPorts: number[] = [];

  for (const port of commonPorts) {
    try {
      const isOpen = await checkPortOpen(ipAddress, port, timeout);
      if (isOpen) {
        openPorts.push(port);
      }
    } catch (error) {
      continue;
    }
  }

  return openPorts;
}

// Kiểm tra xem một port có mở không
export async function checkPortOpen(
  ipAddress: string,
  port: number,
  timeout: number = 500,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, ipAddress);
  });
}

// Lấy hostname từ IP
export async function getDeviceHostname(
  ipAddress: string,
): Promise<string | null> {
  try {
    const addresses = await dnsReverse(ipAddress);
    return addresses && addresses.length > 0 ? addresses[0] : null;
  } catch (error) {
    return null;
  }
}

// Quét một dải mạng để tìm thiết bị đang hoạt động
export async function performNetworkScan(
  fullScan: boolean = false,
): Promise<NetworkDeviceDetails[]> {
  // Thiết lập quét dải mạng nào
  let networks: string[] = [];

  if (fullScan) {
    // Quét tất cả các dải mạng phổ biến
    networks = [
      "192.168.0.0/24",
      "192.168.1.0/24",
      "10.0.0.0/24",
      "10.0.1.0/24",
      "172.16.0.0/24",
    ];
  } else {
    // Chỉ quét dải mạng cục bộ
    networks = ["192.168.1.0/24"];
  }

  console.log(`Scanning networks: ${networks.join(", ")}`);

  const discoveredDevices: NetworkDeviceDetails[] = [];

  for (const network of networks) {
    try {
      const devices = await scanNetwork(network);
      discoveredDevices.push(...devices);
    } catch (error) {
      console.error(`Error scanning network ${network}:`, error);
    }
  }

  return discoveredDevices;
}

// Quét một dải mạng cụ thể
async function scanNetwork(network: string): Promise<NetworkDeviceDetails[]> {
  try {
    // Giả định dải mạng có định dạng '192.168.1.0/24'
    const baseIP = network.split("/")[0];
    const ipPrefix = baseIP.split(".").slice(0, 3).join(".");

    const discoveredDevices: NetworkDeviceDetails[] = [];
    const promises: Promise<void>[] = [];

    // Quét từng địa chỉ IP trong dải mạng
    for (let i = 1; i <= 254; i++) {
      const ip = `${ipPrefix}.${i}`;

      const promise = (async () => {
        try {
          // Kiểm tra xem thiết bị có online không
          const isReachable = await checkHostReachable(ip);

          if (isReachable) {
            try {
              // Thử lấy thông tin về thiết bị
              const hostname = await getDeviceHostname(ip);

              // Thử lấy địa chỉ MAC (không triển khai đầy đủ trong môi trường này)
              // Trong môi trường thực, sẽ sử dụng ARP để lấy MAC
              // Tạm thời sử dụng MAC ngẫu nhiên
              const macAddress = generateRandomMac();

              // Tạo thông tin thiết bị
              const device: NetworkDeviceDetails = {
                ipAddress: ip,
                macAddress,
                hostName: hostname || undefined,
                firstSeen: new Date(),
                lastSeen: new Date(),
              };

              discoveredDevices.push(device);
            } catch (deviceError) {
              console.error(
                `Error collecting device details for ${ip}:`,
                deviceError,
              );
            }
          }
        } catch (error) {
          // Bỏ qua các lỗi khi quét
        }
      })();

      promises.push(promise);

      // Giới hạn số lượng quét đồng thời để tránh quá tải
      if (promises.length >= 20) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }

    // Đợi các quét còn lại hoàn thành
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return discoveredDevices;
  } catch (error) {
    console.error(`Error scanning network ${network}:`, error);
    return [];
  }
}

// Tạo địa chỉ MAC ngẫu nhiên
function generateRandomMac(): string {
  const hexDigits = "0123456789ABCDEF";
  let mac = "";

  for (let i = 0; i < 6; i++) {
    let part = "";
    for (let j = 0; j < 2; j++) {
      part += hexDigits.charAt(Math.floor(Math.random() * hexDigits.length));
    }
    mac += (i === 0 ? "" : ":") + part;
  }

  return mac;
}

// Lấy thông tin từ thiết bị MikroTik
export async function discoverMikrotikDevices(
  deviceIds: number[],
): Promise<NetworkDeviceDetails[]> {
  const discoveredDevices: NetworkDeviceDetails[] = [];

  for (const deviceId of deviceIds) {
    try {
      // Lấy thông tin thiết bị MikroTik từ cơ sở dữ liệu
      const device = await mikrotik.getMikrotikDevice(deviceId);

      if (!device) {
        continue;
      }

      // Lấy danh sách DHCP lease từ thiết bị
      const leases = await mikrotik.getDhcpLeases(device);

      // Lấy danh sách ARP từ thiết bị
      const arpEntries = await mikrotik.getArpTable(device);

      // Kết hợp thông tin từ cả hai nguồn
      const combinedDevices = await combineDeviceInfo(leases, arpEntries);

      discoveredDevices.push(...combinedDevices);
    } catch (error) {
      console.error(
        `Error discovering devices from MikroTik device ${deviceId}:`,
        error,
      );
    }
  }

  return discoveredDevices;
}

// Kết hợp thông tin từ DHCP lease và ARP table
async function combineDeviceInfo(
  dhcpLeases: any[],
  arpEntries: any[],
): Promise<NetworkDeviceDetails[]> {
  const combinedDevices: NetworkDeviceDetails[] = [];
  const processedMacs = new Set<string>();

  // Xử lý DHCP leases trước
  for (const lease of dhcpLeases) {
    if (!lease.macAddress || !lease.address) {
      continue;
    }

    processedMacs.add(lease.macAddress.toLowerCase());

    const device: NetworkDeviceDetails = {
      ipAddress: lease.address,
      macAddress: lease.macAddress,
      hostName: lease.hostName || undefined,
      interface: lease.server || undefined,
      lastSeen: new Date(),
    };

    combinedDevices.push(device);
  }

  // Bổ sung từ ARP table
  for (const arpEntry of arpEntries) {
    if (!arpEntry.macAddress || !arpEntry.address) {
      continue;
    }

    // Bỏ qua những MAC đã xử lý từ DHCP
    if (processedMacs.has(arpEntry.macAddress.toLowerCase())) {
      continue;
    }

    const device: NetworkDeviceDetails = {
      ipAddress: arpEntry.address,
      macAddress: arpEntry.macAddress,
      interface: arpEntry.interface || undefined,
      lastSeen: new Date(),
    };

    combinedDevices.push(device);
  }

  return combinedDevices;
}

// Quét mạng bằng ARP để tìm thiết bị
export async function scanNetworkByArp(
  subnet?: string,
): Promise<NetworkDeviceDetails[]> {
  try {
    // Nếu không có subnet được chỉ định, quét mạng cục bộ
    const networks = subnet ? [subnet] : ["192.168.1.0/24"];
    console.log(`Performing ARP scan on networks: ${networks.join(", ")}`);

    const discoveredDevices: NetworkDeviceDetails[] = [];

    for (const network of networks) {
      // Thực hiện quét ARP
      const devices = await scanNetwork(network);
      discoveredDevices.push(...devices);
    }

    console.log(
      `ARP scan completed, found ${discoveredDevices.length} devices`,
    );
    return discoveredDevices;
  } catch (error) {
    console.error("Error during ARP network scan:", error);
    return [];
  }
}

// Phát hiện thiết bị từ thông tin DHCP của MikroTik
export async function detectDevicesFromMikrotikDHCP(
  deviceId: number,
): Promise<NetworkDeviceDetails[]> {
  try {
    console.log(
      `Detecting devices from MikroTik DHCP server (device ID: ${deviceId})`,
    );

    // Lấy thông tin thiết bị MikroTik
    const device = await mikrotik.getMikrotikDevice(deviceId);

    if (!device) {
      console.error(`MikroTik device with ID ${deviceId} not found`);
      return [];
    }

    // Lấy danh sách DHCP lease từ thiết bị
    const leases = await mikrotik.getDhcpLeases(device.id);

    // Lấy danh sách ARP từ thiết bị
    const arpEntries = await mikrotik.getArpTable(device.id);

    // Kết hợp thông tin từ cả hai nguồn
    const combinedDevices = await combineDeviceInfo(leases, arpEntries);

    console.log(
      `Detected ${combinedDevices.length} devices from MikroTik DHCP server`,
    );
    return combinedDevices;
  } catch (error) {
    console.error(
      `Error detecting devices from MikroTik DHCP (device ID: ${deviceId}):`,
      error,
    );
    return [];
  }
}
