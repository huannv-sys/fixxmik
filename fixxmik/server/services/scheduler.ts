import * as discoveryService from "./discovery";
import * as deviceIdentificationService from "./device-identification";
import { storage } from "../storage";
import { db } from "../db";
import { networkDevices } from "@shared/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { mikrotikService } from ".";

/**
 * Service lập lịch quét và xử lý tự động
 */
export class SchedulerService {
  private discoveryScanInterval: NodeJS.Timeout | null = null;
  private identificationScanInterval: NodeJS.Timeout | null = null;
  private routerDiscoveryInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private isDiscoveryRunning = false;
  private isIdentificationRunning = false;
  private isRouterDiscoveryRunning = false;
  private isMetricsCollectionRunning = false;

  // Khoảng thời gian quét mặc định (5 phút)
  private discoveryScanIntervalMs = 5 * 60 * 1000;
  // Khoảng thời gian nhận diện mặc định (15 phút)
  private identificationScanIntervalMs = 15 * 60 * 1000;
  // Khoảng thời gian quét router mặc định (10 phút)
  private routerDiscoveryIntervalMs = 10 * 60 * 1000;
  // Khoảng thời gian thu thập metrics (15 giây)
  private metricsCollectionIntervalMs = 15 * 1000;

  /**
   * Khởi tạo scheduler và bắt đầu các công việc
   */
  public initialize() {
    console.log("Initializing network discovery scheduler...");
    this.startDiscoveryScan();
    this.startIdentificationScan();
    this.startRouterDiscovery();
    this.startMetricsCollection();
  }

  /**
   * Dừng tất cả các công việc đang chạy
   */
  public stop() {
    if (this.discoveryScanInterval) {
      clearInterval(this.discoveryScanInterval);
      this.discoveryScanInterval = null;
    }

    if (this.identificationScanInterval) {
      clearInterval(this.identificationScanInterval);
      this.identificationScanInterval = null;
    }

    if (this.routerDiscoveryInterval) {
      clearInterval(this.routerDiscoveryInterval);
      this.routerDiscoveryInterval = null;
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    console.log("Network discovery scheduler stopped");
  }

  /**
   * Bắt đầu quét phát hiện thiết bị theo lịch
   */
  private startDiscoveryScan() {
    if (this.discoveryScanInterval) {
      clearInterval(this.discoveryScanInterval);
    }

    // Chạy ngay lần đầu
    this.runNetworkDiscovery();

    // Sau đó lập lịch theo khoảng thời gian
    this.discoveryScanInterval = setInterval(() => {
      this.runNetworkDiscovery();
    }, this.discoveryScanIntervalMs);

    console.log(
      `Network discovery scan scheduled every ${this.discoveryScanIntervalMs / (60 * 1000)} minutes`,
    );
  }

  /**
   * Bắt đầu quét nhận diện thiết bị theo lịch
   */
  private startIdentificationScan() {
    if (this.identificationScanInterval) {
      clearInterval(this.identificationScanInterval);
    }

    // Chạy ngay lần đầu
    this.runDeviceIdentification();

    // Sau đó lập lịch theo khoảng thời gian
    this.identificationScanInterval = setInterval(() => {
      this.runDeviceIdentification();
    }, this.identificationScanIntervalMs);

    console.log(
      `Device identification scan scheduled every ${this.identificationScanIntervalMs / (60 * 1000)} minutes`,
    );
  }

  /**
   * Bắt đầu quét router theo lịch
   */
  private startRouterDiscovery() {
    if (this.routerDiscoveryInterval) {
      clearInterval(this.routerDiscoveryInterval);
    }

    // Chạy ngay lần đầu
    this.runRouterDiscovery();

    // Sau đó lập lịch theo khoảng thời gian
    this.routerDiscoveryInterval = setInterval(() => {
      this.runRouterDiscovery();
    }, this.routerDiscoveryIntervalMs);

    console.log(
      `Router DHCP discovery scheduled every ${this.routerDiscoveryIntervalMs / (60 * 1000)} minutes`,
    );
  }

  /**
   * Thực hiện phát hiện thiết bị mạng
   */
  private async runNetworkDiscovery() {
    // Tránh chạy đồng thời
    if (this.isDiscoveryRunning) return;

    this.isDiscoveryRunning = true;

    try {
      console.log("Running network discovery scan...");

      // Quét ARP trên mạng cục bộ
      await discoveryService.scanNetworkByArp();

      // Quét các subnet tùy chỉnh (ví dụ: từ cấu hình)
      // await discoveryService.scanNetworkByArp('192.168.2.0/24');

      console.log("Network discovery scan completed");
    } catch (error) {
      console.error("Error during network discovery scan:", error);
    } finally {
      this.isDiscoveryRunning = false;
    }
  }

  /**
   * Thực hiện nhận diện thiết bị mạng
   */
  private async runDeviceIdentification() {
    // Tránh chạy đồng thời
    if (this.isIdentificationRunning) return;

    this.isIdentificationRunning = true;

    try {
      console.log("Running device identification scan...");

      // Lấy các thiết bị chưa được nhận diện hoặc có điểm nhận diện thấp
      const devices = await db
        .select()
        .from(networkDevices)
        .where(
          and(
            eq(networkDevices.isIdentified, false),
            lt(networkDevices.identificationScore || 0, 50),
          ),
        )
        .orderBy(desc(networkDevices.lastSeen))
        .limit(20);

      console.log(`Found ${devices.length} devices for identification`);

      // Nhận diện từng thiết bị
      for (const device of devices) {
        await deviceIdentificationService.identifyDevice(device.id);
      }

      console.log("Device identification scan completed");
    } catch (error) {
      console.error("Error during device identification scan:", error);
    } finally {
      this.isIdentificationRunning = false;
    }
  }

  /**
   * Thực hiện quét DHCP từ các router
   */
  private async runRouterDiscovery() {
    // Tránh chạy đồng thời
    if (this.isRouterDiscoveryRunning) return;

    this.isRouterDiscoveryRunning = true;

    try {
      console.log("Running router DHCP discovery...");

      // Lấy tất cả thiết bị MikroTik
      const devices = await storage.getAllDevices();

      // Lấy thông tin DHCP từ mỗi router
      for (const device of devices) {
        try {
          await discoveryService.detectDevicesFromMikrotikDHCP(device.id);
        } catch (error) {
          console.error(`Error scanning DHCP from device ${device.id}:`, error);
        }
      }

      console.log("Router DHCP discovery completed");
    } catch (error) {
      console.error("Error during router DHCP discovery:", error);
    } finally {
      this.isRouterDiscoveryRunning = false;
    }
  }

  /**
   * Cập nhật khoảng thời gian quét phát hiện
   * @param intervalMinutes Khoảng thời gian (phút)
   */
  public setDiscoveryScanInterval(intervalMinutes: number) {
    if (intervalMinutes < 1) intervalMinutes = 1;

    this.discoveryScanIntervalMs = intervalMinutes * 60 * 1000;
    this.startDiscoveryScan();

    return intervalMinutes;
  }

  /**
   * Cập nhật khoảng thời gian quét nhận diện
   * @param intervalMinutes Khoảng thời gian (phút)
   */
  public setIdentificationScanInterval(intervalMinutes: number) {
    if (intervalMinutes < 1) intervalMinutes = 1;

    this.identificationScanIntervalMs = intervalMinutes * 60 * 1000;
    this.startIdentificationScan();

    return intervalMinutes;
  }

  /**
   * Cập nhật khoảng thời gian quét router
   * @param intervalMinutes Khoảng thời gian (phút)
   */
  public setRouterDiscoveryInterval(intervalMinutes: number) {
    if (intervalMinutes < 1) intervalMinutes = 1;

    this.routerDiscoveryIntervalMs = intervalMinutes * 60 * 1000;
    this.startRouterDiscovery();

    return intervalMinutes;
  }

  /**
   * Chạy quét phát hiện thủ công
   */
  public async runManualDiscovery(subnet?: string) {
    if (this.isDiscoveryRunning) {
      return { success: false, message: "Discovery scan is already running" };
    }

    try {
      this.isDiscoveryRunning = true;
      const devices = await discoveryService.scanNetworkByArp(subnet);
      return {
        success: true,
        message: `Manual discovery completed, found ${devices.length} devices`,
        devices,
      };
    } catch (error) {
      console.error("Error during manual discovery:", error);
      return { success: false, message: `Error: ${error}` };
    } finally {
      this.isDiscoveryRunning = false;
    }
  }

  /**
   * Chạy quét DHCP từ router thủ công
   * @param deviceId ID của thiết bị MikroTik
   */
  public async runManualRouterDiscovery(deviceId: number) {
    if (this.isRouterDiscoveryRunning) {
      return { success: false, message: "Router discovery is already running" };
    }

    try {
      this.isRouterDiscoveryRunning = true;
      const devices =
        await discoveryService.detectDevicesFromMikrotikDHCP(deviceId);
      return {
        success: true,
        message: `Manual router discovery completed, found ${devices.length} devices from router ID ${deviceId}`,
        devices,
      };
    } catch (error) {
      console.error(
        `Error during manual router discovery for device ${deviceId}:`,
        error,
      );
      return { success: false, message: `Error: ${error}` };
    } finally {
      this.isRouterDiscoveryRunning = false;
    }
  }

  /**
   * Chạy nhận diện thiết bị thủ công
   * @param networkDeviceId ID của thiết bị mạng
   */
  public async runManualIdentification(networkDeviceId: number) {
    try {
      const device =
        await deviceIdentificationService.identifyDevice(networkDeviceId);
      if (!device) {
        return {
          success: false,
          message: `Device with ID ${networkDeviceId} not found`,
        };
      }

      return {
        success: true,
        message: `Device identification completed for ${device.ipAddress}`,
        device,
      };
    } catch (error) {
      console.error(
        `Error during manual identification for device ${networkDeviceId}:`,
        error,
      );
      return { success: false, message: `Error: ${error}` };
    }
  }

  /**
   * Lấy trạng thái hiện tại của scheduler
   */
  public getStatus() {
    return {
      isDiscoveryRunning: this.isDiscoveryRunning,
      isIdentificationRunning: this.isIdentificationRunning,
      isRouterDiscoveryRunning: this.isRouterDiscoveryRunning,
      discoveryScanInterval: this.discoveryScanIntervalMs / (60 * 1000),
      identificationScanInterval:
        this.identificationScanIntervalMs / (60 * 1000),
      routerDiscoveryInterval: this.routerDiscoveryIntervalMs / (60 * 1000),
    };
  }

  /**
   * Cập nhật khoảng thời gian polling cho tất cả các thiết bị
   * @param intervalMs Khoảng thời gian tính bằng millisecond
   */
  public setPollingInterval(intervalMs: number) {
    // Đảm bảo không nhỏ hơn 5 giây
    if (intervalMs < 5000) intervalMs = 5000;

    this.discoveryScanIntervalMs = intervalMs;
    this.identificationScanIntervalMs = intervalMs * 3; // Nhận diện ít thường xuyên hơn
    this.routerDiscoveryIntervalMs = intervalMs * 2; // Quét router với tần suất trung bình

    // Khởi động lại các quá trình lập lịch
    this.startDiscoveryScan();
    this.startIdentificationScan();
    this.startRouterDiscovery();

    console.log(
      `All polling intervals updated: discovery=${intervalMs}ms, identification=${intervalMs * 3}ms, router=${intervalMs * 2}ms`,
    );
    return intervalMs;
  }

  /**
   * Cập nhật số lượng thiết bị tối đa được xử lý đồng thời
   * @param count Số lượng thiết bị tối đa
   */
  public setMaxConcurrentDevices(count: number) {
    if (count < 1) count = 1;
    // Lưu cấu hình này và cập nhật các dịch vụ khác nếu cần
    console.log(`Max concurrent devices set to ${count}`);
    return count;
  }

  /**
   * Lấy trạng thái polling của các thiết bị
   */
  public getDevicePollingStatus() {
    return {
      discoveryStatus: {
        isRunning: this.isDiscoveryRunning,
        interval: this.discoveryScanIntervalMs,
        nextScheduled: this.discoveryScanInterval ? "Active" : "Stopped",
      },
      identificationStatus: {
        isRunning: this.isIdentificationRunning,
        interval: this.identificationScanIntervalMs,
        nextScheduled: this.identificationScanInterval ? "Active" : "Stopped",
      },
      routerDiscoveryStatus: {
        isRunning: this.isRouterDiscoveryRunning,
        interval: this.routerDiscoveryIntervalMs,
        nextScheduled: this.routerDiscoveryInterval ? "Active" : "Stopped",
      },
      metricsCollectionStatus: {
        isRunning: this.isMetricsCollectionRunning,
        interval: this.metricsCollectionIntervalMs,
        nextScheduled: this.metricsCollectionInterval ? "Active" : "Stopped",
      },
    };
  }

  /**
   * Bắt đầu thu thập metrics theo lịch
   */
  private startMetricsCollection() {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    // Chạy ngay lần đầu
    this.collectRealTimeMetrics();

    // Sau đó lập lịch theo khoảng thời gian
    this.metricsCollectionInterval = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.metricsCollectionIntervalMs);

    console.log(
      `Metrics collection scheduled every ${this.metricsCollectionIntervalMs / 1000} seconds`,
    );
  }

  /**
   * Thu thập metrics thời gian thực từ các thiết bị và phát sóng qua WebSocket
   */
  private async collectRealTimeMetrics() {
    if (this.isMetricsCollectionRunning) return;

    this.isMetricsCollectionRunning = true;

    try {
      // Lấy tất cả thiết bị đang online
      const devices = await storage.getAllDevices();
      const onlineDevices = devices.filter((device) => device.isOnline);

      for (const device of onlineDevices) {
        try {
          // Thu thập metrics từ thiết bị
          const metrics = await mikrotikService.collectDeviceMetrics(device.id);

          // Lấy thông tin giao diện
          const interfaces = await storage.getInterfaces(device.id);

          // Nếu thu thập thành công, phát sóng qua WebSocket
          if (metrics) {
            // Topic dành riêng cho thiết bị cụ thể
            const deviceTopic = `device_metrics_${device.id}`;

            // Tạo đối tượng dữ liệu để phát sóng
            const data = {
              type: "metrics_update",
              deviceId: device.id,
              timestamp: new Date().toISOString(),
              metrics: metrics,
              interfaces: interfaces,
            };

            // Phát sóng metrics tới các clients đã đăng ký
            if ((global as any).broadcastToTopic) {
              (global as any).broadcastToTopic(deviceTopic, {
                type: "metrics_update",
                payload: data,
              });

              // Đồng thời phát sóng cho topic tổng quan
              (global as any).broadcastToTopic("all_devices_metrics", {
                type: "metrics_update",
                payload: data,
              });
            }
          }
        } catch (error) {
          console.error(
            `Error collecting metrics for device ${device.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error during metrics collection:", error);
    } finally {
      this.isMetricsCollectionRunning = false;
    }
  }

  /**
   * Cập nhật khoảng thời gian thu thập metrics
   * @param intervalSeconds Khoảng thời gian (giây)
   */
  public setMetricsCollectionInterval(intervalSeconds: number) {
    if (intervalSeconds < 5) intervalSeconds = 5; // Tối thiểu 5 giây

    this.metricsCollectionIntervalMs = intervalSeconds * 1000;
    this.startMetricsCollection();

    return intervalSeconds;
  }
}

// Xuất một thể hiện duy nhất của service lập lịch
export const schedulerService = new SchedulerService();
