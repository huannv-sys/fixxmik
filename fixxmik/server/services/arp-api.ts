/**
 * API để lấy thông tin ARP từ thiết bị Mikrotik
 */

import { mikrotikService } from "./mikrotik";
import { ArpEntry, NetworkDeviceDetails } from "../mikrotik-api-types";

/**
 * Lấy thông tin bảng ARP từ thiết bị Mikrotik
 * @param deviceId ID của thiết bị Mikrotik
 * @returns Danh sách các đối tượng ArpEntry
 */
export async function getDeviceArpTable(deviceId: number): Promise<ArpEntry[]> {
  try {
    console.log(`Đang lấy bảng ARP từ thiết bị ${deviceId}...`);

    // Gọi hàm getArpTable từ mikrotikService
    const arpEntries = await mikrotikService.executeCommand(
      deviceId,
      "/ip/arp/print",
    );

    console.log(
      `Đã lấy được ${arpEntries.length} bản ghi ARP từ thiết bị ${deviceId}`,
    );

    // Không cần đóng kết nối vì getArpTable đã thực hiện việc này

    return arpEntries;
  } catch (error) {
    console.error(`Lỗi khi lấy thông tin ARP từ thiết bị ${deviceId}:`, error);
    return [];
  }
}

/**
 * Chuyển đổi từ ArpEntry sang NetworkDeviceDetails
 * @param entries Danh sách các ArpEntry
 * @param deviceId ID của thiết bị nguồn
 * @returns Danh sách các NetworkDeviceDetails
 */
export function convertArpEntriesToNetworkDevices(
  entries: ArpEntry[],
  deviceId: number,
): NetworkDeviceDetails[] {
  return entries.map((entry, index) => ({
    id: entry.id || index.toString(),
    ipAddress: entry.address,
    macAddress: entry.macAddress,
    interface: entry.interface,
    isOnline:
      typeof entry.complete === "boolean"
        ? entry.complete
        : entry.complete === "yes",
    deviceType: "Unknown",
    firstSeen: new Date(),
    lastSeen: new Date(),
    deviceData: {
      source: "arp",
      sourceDeviceId: deviceId,
      dynamic:
        typeof entry.dynamic === "boolean"
          ? entry.dynamic
          : entry.dynamic === "true",
      disabled:
        typeof entry.disabled === "boolean"
          ? entry.disabled
          : entry.disabled === "true",
    },
  }));
}
