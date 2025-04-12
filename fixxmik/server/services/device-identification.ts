import { NetworkDeviceDetails } from "../mikrotik-api-types";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// Cache thông tin nhà sản xuất MAC
const MAC_VENDORS_CACHE_FILE = "./attached_assets/mac_vendors_cache.json";
const MAC_VENDORS_CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 ngày
let macVendorsCache: Record<string, { vendor: string; timestamp: number }> = {};

// Load cache từ file khi module được khởi tạo
try {
  if (fs.existsSync(MAC_VENDORS_CACHE_FILE)) {
    const cacheData = fs.readFileSync(MAC_VENDORS_CACHE_FILE, "utf8");
    macVendorsCache = JSON.parse(cacheData);
    console.log(
      `Đã tải ${Object.keys(macVendorsCache).length} mục MAC vendor từ cache`,
    );
  }
} catch (error) {
  console.error("Lỗi khi tải MAC vendor cache:", error);
  // Tạo file cache nếu chưa tồn tại
  try {
    fs.writeFileSync(MAC_VENDORS_CACHE_FILE, JSON.stringify({}), "utf8");
    console.log("Đã tạo file MAC vendor cache mới");
  } catch (err) {
    console.error("Không thể tạo file MAC vendor cache:", err);
  }
}

/**
 * Lưu cache vào file
 */
function saveMacVendorsCache() {
  try {
    fs.writeFileSync(
      MAC_VENDORS_CACHE_FILE,
      JSON.stringify(macVendorsCache),
      "utf8",
    );
  } catch (error) {
    console.error("Lỗi khi lưu MAC vendor cache:", error);
  }
}

/**
 * Chuẩn hóa định dạng MAC address
 */
function normalizeMac(mac: string): string {
  // Chuyển đổi về dạng chữ hoa, loại bỏ các ký tự đặc biệt
  return mac.toUpperCase().replace(/[^A-F0-9]/g, "");
}

/**
 * Tra cứu nhà sản xuất từ MAC address
 */
export async function getMacVendor(mac: string): Promise<string | null> {
  if (!mac || mac.length < 6) {
    return null;
  }

  // Chuẩn hóa MAC address
  const normalizedMac = normalizeMac(mac);
  // Sử dụng 6 ký tự đầu tiên (OUI - Organizationally Unique Identifier)
  const oui = normalizedMac.substring(0, 6);

  // Kiểm tra cache
  if (macVendorsCache[oui]) {
    const cachedEntry = macVendorsCache[oui];
    // Kiểm tra xem cache có hết hạn chưa
    if (Date.now() - cachedEntry.timestamp < MAC_VENDORS_CACHE_EXPIRY) {
      return cachedEntry.vendor;
    }
  }

  // Nếu không có trong cache hoặc cache đã hết hạn, tra cứu online
  try {
    // Sử dụng API macvendors.com để tra cứu
    const response = await axios.get(`https://api.macvendors.com/${oui}`, {
      timeout: 5000, // 5 giây timeout
    });

    if (response.status === 200 && response.data) {
      const vendor = response.data;

      // Cập nhật cache
      macVendorsCache[oui] = {
        vendor: vendor,
        timestamp: Date.now(),
      };

      // Lưu cache
      saveMacVendorsCache();

      return vendor;
    }
  } catch (error) {
    // Lỗi API hoặc không tìm thấy
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Nhà sản xuất không tìm thấy, cập nhật cache với giá trị rỗng
      macVendorsCache[oui] = {
        vendor: "",
        timestamp: Date.now(),
      };
      saveMacVendorsCache();
    } else {
      console.error(`Lỗi khi tra cứu MAC vendor cho ${mac}:`, error);
    }
  }

  // Thử sử dụng cơ sở dữ liệu OUI local nếu có
  // TODO: Thêm logic tra cứu OUI local

  return null;
}

/**
 * Xác định thông tin thiết bị dựa trên các thông tin đã có
 */
export async function identifyDevice(
  device: NetworkDeviceDetails,
): Promise<NetworkDeviceDetails | null> {
  if (!device) return null;

  try {
    // Thêm thông tin về nhà sản xuất nếu chưa có
    if (!device.vendor && device.macAddress) {
      const vendor = await getMacVendor(device.macAddress);
      if (vendor) {
        device.vendor = vendor;
      }
    }

    // TODO: Thêm logic nhận dạng thiết bị dựa trên các đặc điểm khác

    // Xác định trạng thái online/offline
    if (device.lastSeen) {
      const now = new Date();
      const lastSeenTime = new Date(device.lastSeen).getTime();
      const thresholdTime = now.getTime() - 30 * 60 * 1000; // 30 phút

      device.isOnline = lastSeenTime >= thresholdTime;
    }

    return device;
  } catch (error) {
    console.error(
      `Lỗi khi xác định thông tin thiết bị ${device.ipAddress}:`,
      error,
    );
    return device;
  }
}
