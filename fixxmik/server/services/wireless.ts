import {
  WirelessInterface,
  InsertWirelessInterface,
} from "../../shared/schema";
import { storage } from "../storage";
import { alertSeverity, AlertSeverity } from "../../shared/schema";
import { mikrotikService } from "./mikrotik";

/**
 * WirelessService - Quản lý các wireless interfaces của MikroTik
 */
export class WirelessService {
  /**
   * Lấy danh sách wireless interfaces của một thiết bị
   */
  async getWirelessInterfaces(deviceId: number): Promise<WirelessInterface[]> {
    try {
      return await storage.getWirelessInterfaces(deviceId);
    } catch (error) {
      console.error(
        `Error getting wireless interfaces for device ${deviceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Lấy chi tiết một wireless interface
   */
  async getWirelessInterface(
    id: number,
  ): Promise<WirelessInterface | undefined> {
    try {
      return await storage.getWirelessInterface(id);
    } catch (error) {
      console.error(`Error getting wireless interface ${id}:`, error);
      throw error;
    }
  }

  /**
   * Thu thập thông tin wireless interfaces từ thiết bị MikroTik
   */
  async collectWirelessStats(deviceId: number): Promise<void> {
    const client = mikrotikService.getClientForDevice(deviceId);
    if (!client) {
      throw new Error(`No connection to device ${deviceId}`);
    }

    try {
      console.log(`Collecting wireless stats for device ${deviceId}...`);

      // Lấy danh sách wireless interfaces
      const wifiData = await client.executeCommand(
        "/interface/wireless/print",
        [
          { detail: "" }, // Lấy thông tin chi tiết
        ],
      );

      if (!Array.isArray(wifiData)) {
        throw new Error("Invalid wireless data format");
      }

      console.log(`Found ${wifiData.length} wireless interfaces`);

      // Lấy thông tin người dùng đang kết nối vào mỗi interface để đếm số lượng
      const registrationData = await client.executeCommand(
        "/interface/wireless/registration-table/print",
      );

      // Tạo map để đếm số client trên mỗi interface
      const clientCounts = new Map<string, number>();

      if (Array.isArray(registrationData)) {
        for (const reg of registrationData) {
          const interface_name = reg["interface"];
          if (interface_name) {
            const currentCount = clientCounts.get(interface_name) || 0;
            clientCounts.set(interface_name, currentCount + 1);
          }
        }
      }

      // Đánh dấu các wireless interfaces hiện tại để xóa những interface không còn tồn tại
      const currentWirelessIds = new Set<number>();
      const existingWirelessInterfaces =
        await storage.getWirelessInterfaces(deviceId);

      for (const wifi of wifiData) {
        // Tìm wireless interface đã tồn tại trong db
        const existingWirelessInterface = existingWirelessInterfaces.find(
          (w) => w.name === wifi.name || w.macAddress === wifi["mac-address"],
        );

        // Lấy số client kết nối
        const clients = clientCounts.get(wifi.name) || 0;

        const wirelessData: InsertWirelessInterface = {
          deviceId,
          name: wifi.name,
          macAddress: wifi["mac-address"],
          ssid: wifi.ssid,
          band: wifi.band || null,
          frequency: wifi.frequency || null,
          channel: wifi["channel-width"] || null,
          noiseFloor: wifi["noise-floor"]
            ? parseInt(wifi["noise-floor"])
            : null,
          txPower: wifi["tx-power"] ? parseInt(wifi["tx-power"]) : null,
          // radioName: wifi['radio-name'] || null,
          isActive: wifi.disabled === "false",
          mode: wifi.mode || null,
          clients,
        };

        if (existingWirelessInterface) {
          // Cập nhật wireless interface đã tồn tại
          const updatedWirelessInterface =
            await storage.updateWirelessInterface(
              existingWirelessInterface.id,
              wirelessData,
            );

          if (updatedWirelessInterface) {
            currentWirelessIds.add(updatedWirelessInterface.id);
          }

          // Check status for alerting
          this.checkWirelessStatus(
            deviceId,
            existingWirelessInterface,
            wirelessData,
          );
        } else {
          // Tạo mới wireless interface
          const newWirelessInterface =
            await storage.createWirelessInterface(wirelessData);
          currentWirelessIds.add(newWirelessInterface.id);
        }
      }

      // Xóa wireless interfaces không còn tồn tại
      for (const wifiIface of existingWirelessInterfaces) {
        if (!currentWirelessIds.has(wifiIface.id)) {
          await storage.deleteWirelessInterface(wifiIface.id);
        }
      }
    } catch (error) {
      console.error(
        `Error collecting wireless stats for device ${deviceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Kiểm tra trạng thái wireless interface và tạo cảnh báo nếu cần
   */
  private async checkWirelessStatus(
    deviceId: number,
    oldInterface: WirelessInterface,
    newInterfaceData: InsertWirelessInterface,
  ): Promise<void> {
    // Kiểm tra sự thay đổi trạng thái hoạt động
    if (oldInterface.isActive !== newInterfaceData.isActive) {
      const severity: AlertSeverity = newInterfaceData.isActive
        ? alertSeverity.INFO
        : alertSeverity.WARNING;

      const message = newInterfaceData.isActive
        ? `Wireless interface ${newInterfaceData.name} (${newInterfaceData.ssid || "no SSID"}) is now active`
        : `Wireless interface ${newInterfaceData.name} (${newInterfaceData.ssid || "no SSID"}) is down`;

      await mikrotikService.createAlert(
        deviceId,
        severity,
        message,
        "wireless",
      );
    }

    // Kiểm tra sự thay đổi số lượng clients
    if (oldInterface.clients !== newInterfaceData.clients) {
      // Có thể tạo thêm cảnh báo về sự thay đổi clients nếu cần
    }
  }
}

export const wirelessService = new WirelessService();
