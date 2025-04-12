/**
 * Module để phát hiện và quét thiết bị mạng từ các thiết bị Mikrotik
 * Dựa trên file Python realtime_discovery.py
 */

import {
  ArpEntry,
  DhcpLease,
  NetworkDeviceDetails,
} from "../mikrotik-api-types";
import * as mikrotikService from "./mikrotik";
import { getMacVendor } from "./device-identification";
import { classifyDevice } from "./device-classifier";
import { db } from "../db";
import { networkDevices } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

// Cache các thiết bị đã phát hiện
const discoveredDevices: Map<string, NetworkDeviceDetails> = new Map();

// Thời gian ngưỡng (ms) để đánh dấu thiết bị là mới (5 phút)
const NEW_DEVICE_THRESHOLD = 5 * 60 * 1000;

/**
 * Lấy tất cả các bản ghi ARP từ tất cả các thiết bị MikroTik
 */
export async function getAllArpEntries(): Promise<ArpEntry[]> {
  const devices = await mikrotikService.getMikrotikDevices();
  const allEntries: ArpEntry[] = [];

  for (const device of devices) {
    try {
      if (!device.isOnline) continue;

      const arpEntries = await mikrotikService.getArpTable(device);
      allEntries.push(...arpEntries);
    } catch (error) {
      console.error(
        `Error getting ARP entries from device ${device.id}:`,
        error,
      );
    }
  }

  return allEntries;
}

/**
 * Lấy tất cả các bản ghi DHCP lease từ tất cả các thiết bị MikroTik
 */
export async function getAllDhcpLeases(): Promise<DhcpLease[]> {
  const devices = await mikrotikService.getMikrotikDevices();
  const allLeases: DhcpLease[] = [];

  for (const device of devices) {
    try {
      if (!device.isOnline) continue;

      const dhcpLeases = await mikrotikService.getDhcpLeases(device);
      allLeases.push(...dhcpLeases);
    } catch (error) {
      console.error(
        `Error getting DHCP leases from device ${device.id}:`,
        error,
      );
    }
  }

  return allLeases;
}

/**
 * Trích xuất thông tin thiết bị từ bản ghi ARP hoặc DHCP
 */
export async function extractDeviceInfo(
  entry: ArpEntry | DhcpLease,
  sourceType: "arp" | "dhcp",
  sourceDeviceId: number,
): Promise<NetworkDeviceDetails> {
  const now = new Date();
  const macAddress = entry.macAddress.toUpperCase();

  let hostname = "";
  if ("hostName" in entry && entry.hostName) {
    hostname = entry.hostName;
  }

  // Lấy thông tin từ MAC address
  let vendor = await getMacVendor(macAddress);

  // Xác định loại thiết bị dựa trên nhà sản xuất
  const deviceClassification = await classifyDevice(
    macAddress,
    entry.address,
    vendor || undefined,
  );

  return {
    ipAddress: entry.address,
    macAddress: macAddress,
    hostname: hostname || undefined,
    interface: "interface" in entry ? entry.interface : undefined,
    vendor: vendor || undefined,
    deviceType: deviceClassification.deviceType,
    firstSeen: now,
    lastSeen: now,
    isOnline: true,
    deviceData: {
      source: sourceType,
      sourceDeviceId: sourceDeviceId,
      isNew: true,
      deviceRole: deviceClassification.deviceRole,
    },
  };
}

/**
 * Phát hiện thiết bị mới từ bảng ARP và DHCP leases
 */
export async function detectNewDevices(): Promise<NetworkDeviceDetails[]> {
  const now = new Date();
  const newDevices: NetworkDeviceDetails[] = [];
  const currentMacs = new Set<string>();

  console.log("Bắt đầu phát hiện thiết bị mới...");

  // Xử lý bản ghi ARP
  const arpEntries = await getAllArpEntries();
  for (const entry of arpEntries) {
    if (!entry.macAddress) continue;

    const mac = entry.macAddress.toUpperCase();
    currentMacs.add(mac);

    if (!discoveredDevices.has(mac)) {
      // Thiết bị mới phát hiện
      const deviceInfo = await extractDeviceInfo(
        entry,
        "arp",
        entry.deviceId
          ? typeof entry.deviceId === "string"
            ? parseInt(entry.deviceId)
            : entry.deviceId
          : 0,
      );
      discoveredDevices.set(mac, deviceInfo);
      newDevices.push(deviceInfo);
      console.log(
        `Phát hiện thiết bị mới từ ARP: ${entry.address} (${mac}) - ${deviceInfo.vendor || "Unknown"}`,
      );
    } else {
      // Cập nhật thông tin cho thiết bị đã biết
      const existingDevice = discoveredDevices.get(mac)!;
      existingDevice.lastSeen = now;
      existingDevice.ipAddress = entry.address;
      existingDevice.isOnline = true;

      // Kiểm tra xem thiết bị có được đánh dấu là mới không
      const timeDiff =
        now.getTime() - (existingDevice.firstSeen?.getTime() || now.getTime());
      if (timeDiff < NEW_DEVICE_THRESHOLD) {
        if (existingDevice.deviceData) {
          existingDevice.deviceData.isNew = true;
        } else {
          existingDevice.deviceData = { isNew: true };
        }
      } else {
        if (existingDevice.deviceData) {
          existingDevice.deviceData.isNew = false;
        } else {
          existingDevice.deviceData = { isNew: false };
        }
      }
    }
  }

  // Xử lý DHCP leases
  const dhcpLeases = await getAllDhcpLeases();
  for (const lease of dhcpLeases) {
    if (!lease.macAddress) continue;

    const mac = lease.macAddress.toUpperCase();
    currentMacs.add(mac);

    if (!discoveredDevices.has(mac)) {
      // Thiết bị mới phát hiện
      const deviceInfo = await extractDeviceInfo(
        lease,
        "dhcp",
        lease.deviceId
          ? typeof lease.deviceId === "string"
            ? parseInt(lease.deviceId)
            : lease.deviceId
          : 0,
      );
      discoveredDevices.set(mac, deviceInfo);
      newDevices.push(deviceInfo);
      console.log(
        `Phát hiện thiết bị mới từ DHCP: ${lease.address} (${mac}) - ${deviceInfo.hostname || "Không có tên"}`,
      );
    } else {
      // Cập nhật thông tin cho thiết bị đã biết
      const existingDevice = discoveredDevices.get(mac)!;
      existingDevice.lastSeen = now;
      existingDevice.ipAddress = lease.address;
      existingDevice.isOnline = true;

      // Cập nhật hostname nếu có từ DHCP
      if (lease.hostName && !existingDevice.hostname) {
        existingDevice.hostname = lease.hostName;
      }

      // Kiểm tra xem thiết bị có được đánh dấu là mới không
      const timeDiff =
        now.getTime() - (existingDevice.firstSeen?.getTime() || now.getTime());
      if (timeDiff < NEW_DEVICE_THRESHOLD) {
        if (existingDevice.deviceData) {
          existingDevice.deviceData.isNew = true;
        } else {
          existingDevice.deviceData = { isNew: true };
        }
      } else {
        if (existingDevice.deviceData) {
          existingDevice.deviceData.isNew = false;
        } else {
          existingDevice.deviceData = { isNew: false };
        }
      }
    }
  }

  // Đánh dấu thiết bị không còn hoạt động sau 1 ngày
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  for (const [mac, device] of discoveredDevices.entries()) {
    if (
      device.lastSeen &&
      device.lastSeen < oneDayAgo &&
      !currentMacs.has(mac)
    ) {
      // Đánh dấu thiết bị offline, nhưng không xóa khỏi danh sách
      device.isOnline = false;
    }
  }

  return newDevices;
}

/**
 * Sử dụng port scanning để kiểm tra thiết bị mà có địa chỉ IP tĩnh
 */
export async function scanStaticIpDevices(
  subnet: string,
  routerId: number,
): Promise<NetworkDeviceDetails[]> {
  // Lấy range từ subnet (ví dụ: 192.168.1.0/24 -> 192.168.1.1 đến 192.168.1.254)
  const ipBase = subnet.split("/")[0].split(".");
  const ipPrefix = ipBase.slice(0, 3).join(".");
  const newDevices: NetworkDeviceDetails[] = [];

  // Lấy thiết bị router
  const router = await mikrotikService.getMikrotikDevice(routerId);
  if (!router) {
    console.error(`Router with ID ${routerId} not found`);
    return [];
  }

  // Lấy danh sách các thiết bị đã có
  const existingDevices = await mikrotikService.getNetworkNeighbors(router);
  const existingMacs = new Set(
    existingDevices.map((d) => d.macAddress?.toUpperCase()),
  );

  // Danh sách các port phổ biến để kiểm tra
  const commonPorts = [22, 23, 80, 443, 8080, 8443];

  // Hạn chế số lượng kết nối đồng thời
  const MAX_PARALLEL = 10;
  let currentParallel = 0;
  const waitForSlot = () => {
    if (currentParallel < MAX_PARALLEL) {
      currentParallel++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const checkAgain = () => {
        if (currentParallel < MAX_PARALLEL) {
          currentParallel++;
          resolve();
        } else {
          setTimeout(checkAgain, 100);
        }
      };
      checkAgain();
    });
  };

  // Quét từng địa chỉ IP trong dải mạng và các port phổ biến
  const promises: Promise<void>[] = [];
  for (let i = 1; i <= 254; i++) {
    const ip = `${ipPrefix}.${i}`;

    // Bỏ qua địa chỉ IP của router
    if (ip === router.ipAddress) continue;

    const checkPort = async (ip: string, port: number): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const socket = new (require("net").Socket)();
        socket.setTimeout(500); // 500ms timeout

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

        try {
          socket.connect(port, ip);
        } catch (error) {
          resolve(false);
        }
      });
    };

    const checkDevice = async (ip: string) => {
      await waitForSlot();

      try {
        // Kiểm tra các port phổ biến
        let deviceFound = false;
        const openPorts: number[] = [];

        for (const port of commonPorts) {
          const isOpen = await checkPort(ip, port);
          if (isOpen) {
            deviceFound = true;
            openPorts.push(port);
          }
        }

        if (deviceFound) {
          // Sử dụng một MAC address giả cho thiết bị không rõ MAC
          // Chúng ta sẽ cố gắng cập nhật MAC thật khi có thông tin từ ARP
          const fakeMAC = generateRandomMac();

          if (!existingMacs.has(fakeMAC)) {
            const newDevice: NetworkDeviceDetails = {
              ipAddress: ip,
              macAddress: fakeMAC,
              isOnline: true,
              firstSeen: new Date(),
              lastSeen: new Date(),
              deviceType: "Unknown", // Sẽ được xác định sau
              deviceData: {
                source: "port-scan",
                sourceDeviceId: routerId,
                isNew: true,
                openPorts: openPorts,
              },
            };

            // Xác định thông tin thiết bị
            try {
              const vendor = await getMacVendor(fakeMAC);
              if (vendor) {
                newDevice.vendor = vendor;
                const deviceClassification = await classifyDevice(
                  fakeMAC,
                  ip,
                  vendor || undefined,
                );
                newDevice.deviceType = deviceClassification.deviceType;
                if (newDevice.deviceData) {
                  newDevice.deviceData.deviceRole =
                    deviceClassification.deviceRole;
                }
              }
            } catch (error) {
              console.error(`Error identifying device at ${ip}:`, error);
            }

            newDevices.push(newDevice);
            console.log(
              `Phát hiện thiết bị với địa chỉ IP tĩnh: ${ip}, open ports: ${openPorts.join(", ")}`,
            );
          }
        }
      } catch (error) {
        console.error(`Error scanning ${ip}:`, error);
      } finally {
        currentParallel--;
      }
    };

    promises.push(checkDevice(ip));
  }

  await Promise.all(promises);
  return newDevices;
}

/**
 * Lưu thiết bị mới vào cơ sở dữ liệu
 */
export async function saveNewDevices(
  devices: NetworkDeviceDetails[],
): Promise<number> {
  let count = 0;

  for (const device of devices) {
    try {
      // Kiểm tra xem thiết bị đã tồn tại trong cơ sở dữ liệu chưa
      const existingDevices = await db
        .select()
        .from(networkDevices)
        .where(eq(networkDevices.macAddress, device.macAddress));

      if (existingDevices.length === 0) {
        // Thêm thiết bị mới vào cơ sở dữ liệu
        await db.insert(networkDevices).values({
          ipAddress: device.ipAddress,
          macAddress: device.macAddress,
          hostname: device.hostname || null,
          interface: device.interface || null,
          vendor: device.vendor || null,
          deviceType: device.deviceType || null,
          firstSeen: device.firstSeen || new Date(),
          lastSeen: device.lastSeen || new Date(),
          isOnline: device.isOnline || false,
          deviceData: device.deviceData || null,
        });
        count++;
      } else {
        // Cập nhật thông tin thiết bị hiện có
        await db
          .update(networkDevices)
          .set({
            ipAddress: device.ipAddress,
            hostname: device.hostname || sql`hostname`,
            interface: device.interface || sql`interface`,
            vendor: device.vendor || sql`vendor`,
            deviceType: device.deviceType || sql`device_type`,
            lastSeen: device.lastSeen || new Date(),
            isOnline: device.isOnline || false,
            deviceData: device.deviceData || sql`device_data`,
          })
          .where(eq(networkDevices.macAddress, device.macAddress));
      }
    } catch (error) {
      console.error(
        `Error saving device ${device.ipAddress} (${device.macAddress}):`,
        error,
      );
    }
  }

  return count;
}

/**
 * Lấy danh sách các thiết bị đã phát hiện
 */
export async function getDiscoveredDevices(
  onlyNew: boolean = false,
): Promise<NetworkDeviceDetails[]> {
  const result: NetworkDeviceDetails[] = [];

  for (const device of discoveredDevices.values()) {
    if (onlyNew && (!device.deviceData || !device.deviceData.isNew)) {
      continue;
    }
    result.push(device);
  }

  // Sắp xếp theo thời gian phát hiện, mới nhất lên đầu
  result.sort((a, b) => {
    const timeA = a.firstSeen?.getTime() || 0;
    const timeB = b.firstSeen?.getTime() || 0;
    return timeB - timeA;
  });

  return result;
}

/**
 * Tạo địa chỉ MAC ngẫu nhiên
 */
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

/**
 * Cập nhật trạng thái online/offline cho các thiết bị đã phát hiện
 */
export async function updateDeviceStatus(): Promise<void> {
  const now = new Date();

  // Lấy danh sách các thiết bị đang online từ cơ sở dữ liệu
  const dbDevices = await db.select().from(networkDevices);

  for (const dbDevice of dbDevices) {
    // Kiểm tra thiết bị trong bộ nhớ cache
    const cachedDevice = discoveredDevices.get(dbDevice.macAddress);

    if (cachedDevice) {
      // Cập nhật trạng thái từ cache
      await db
        .update(networkDevices)
        .set({
          isOnline: cachedDevice.isOnline,
          lastSeen: cachedDevice.isOnline ? now : dbDevice.lastSeen,
        })
        .where(eq(networkDevices.id, dbDevice.id));
    } else {
      // Nếu không có trong cache, giữ nguyên trạng thái
      discoveredDevices.set(dbDevice.macAddress, {
        ipAddress: dbDevice.ipAddress,
        macAddress: dbDevice.macAddress,
        hostname: dbDevice.hostname || undefined,
        interface: dbDevice.interface || undefined,
        vendor: dbDevice.vendor || undefined,
        deviceType: dbDevice.deviceType || undefined,
        firstSeen: dbDevice.firstSeen || undefined,
        lastSeen: dbDevice.lastSeen || undefined,
        isOnline: dbDevice.isOnline !== null ? dbDevice.isOnline : false,
        deviceData: dbDevice.deviceData as Record<string, any> | undefined,
      });
    }
  }
}

/**
 * Kết hợp phát hiện thiết bị từ nhiều nguồn và lưu vào cơ sở dữ liệu
 */
export async function runFullNetworkScan(
  routerId: number,
  subnet?: string,
): Promise<{
  arpDevices: number;
  staticDevices: number;
  total: number;
}> {
  try {
    console.log("Bắt đầu quét mạng đầy đủ...");

    // Phát hiện thiết bị từ ARP và DHCP
    const arpDevices = await detectNewDevices();
    console.log(`Phát hiện ${arpDevices.length} thiết bị từ ARP/DHCP`);

    // Lưu các thiết bị vừa phát hiện
    const arpCount = await saveNewDevices(arpDevices);

    // Quét các thiết bị có địa chỉ IP tĩnh
    let staticCount = 0;
    if (subnet) {
      const staticDevices = await scanStaticIpDevices(subnet, routerId);
      console.log(`Phát hiện ${staticDevices.length} thiết bị có IP tĩnh`);

      // Lưu các thiết bị có IP tĩnh
      staticCount = await saveNewDevices(staticDevices);
    }

    // Cập nhật trạng thái các thiết bị
    await updateDeviceStatus();

    console.log(
      `Quét mạng hoàn tất: ${arpCount} thiết bị từ ARP/DHCP, ${staticCount} thiết bị có IP tĩnh`,
    );

    return {
      arpDevices: arpCount,
      staticDevices: staticCount,
      total: arpCount + staticCount,
    };
  } catch (error) {
    console.error("Lỗi khi quét mạng đầy đủ:", error);
    throw error;
  }
}
