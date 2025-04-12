import type {
  InsertDevice,
  InsertMetric,
  InsertInterface,
  InsertAlert,
  AlertSeverity,
  Device,
} from "@shared/schema";
import { storage } from "../storage";
import { alertSeverity } from "@shared/schema";
import { wirelessService } from "./wireless";
import { capsmanService } from "./capsman";
import { deviceInfoService } from "./device_info";
import {
  ArpEntry,
  DhcpLease,
  NetworkDeviceDetails,
  MikrotikInterface,
} from "../mikrotik-api-types";

// Sử dụng thư viện node-routeros để kết nối với RouterOS
import * as RouterOS from "node-routeros";
import { networkDevices } from "@shared/schema";

// Định nghĩa kiểu dữ liệu cho kết nối PPP
export interface PPPConnection {
  name: string;
  type: "pppoe" | "l2tp" | "pptp";
  user?: string;
  uptime?: string;
  activeAddress?: string;
  service?: string;
  status?: string;
  running?: boolean;
  disabled?: boolean;
  comment?: string;
  macAddress?: string;
  txByte?: number;
  rxByte?: number;
  mtu?: number;
}

/**
 * Interface định nghĩa tham số kết nối
 */
interface ConnectionParams {
  id: number;
  host: string;
  username: string;
  password: string;
  port?: number;
}

/**
 * Lưu trữ các kết nối MikroTik đang hoạt động
 */
interface ConnectionStore {
  [key: number]: MikrotikClient;
}

/**
 * MikroTik Client Class - Quản lý kết nối tới thiết bị MikroTik
 */
class MikrotikClient {
  public connected: boolean = false; // Đổi từ private thành public để có thể truy cập từ bên ngoài
  private ipAddress: string;
  private username: string;
  private password: string;
  private connection: any = null;
  private port: number = 8728; // Cổng API mặc định

  constructor(ipAddress: string, username: string, password: string) {
    this.ipAddress = ipAddress;
    this.username = username;
    this.password = password;
  }

  setPort(port: number): void {
    this.port = port;
  }

  // Xử lý dữ liệu để tránh undefined/null/NaN
  private sanitizeObjectValues(obj: any): any {
    if (!obj || typeof obj !== "object") {
      return obj || null;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "number" && isNaN(value))
      ) {
        if (key === "running" || key === "disabled") {
          result[key] = false;
        } else if (key.includes("byte") || key.includes("packets")) {
          result[key] = 0;
        } else if (key === "mac-address") {
          result[key] = "00:00:00:00:00:00";
        } else if (key === "name" || key === "comment") {
          result[key] = key === "name" ? "unknown" : "";
        } else {
          result[key] = null;
        }
      } else if (typeof value === "object") {
        result[key] = this.sanitizeObjectValues(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  async connect(timeout = 20000): Promise<boolean> {
    try {
      if (this.connected && this.connection) {
        console.log(`Already connected to ${this.ipAddress}`);
        return true;
      }

      console.log(
        `Connecting to ${this.ipAddress}:${this.port} as ${this.username}`,
      );

      const connectionConfig = {
        host: this.ipAddress,
        user: this.username,
        password: this.password,
        port: this.port,
        timeout: timeout,
        keepalive: true,
      };

      console.log(
        `Connection config: ${JSON.stringify({ ...connectionConfig, password: "******" })}`,
      );

      // Tạo kết nối mới
      this.connection = new RouterOS.RouterOSAPI(connectionConfig);

      try {
        // Thiết lập timeout cho kết nối với thời gian dài hơn (20 giây)
        const connectPromise = this.connection.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Connection timed out after ${timeout}ms`));
          }, timeout);
        });

        await Promise.race([connectPromise, timeoutPromise]);

        console.log(`Successfully connected to ${this.ipAddress}`);
        this.connected = true;

        // Thiết lập sự kiện để theo dõi khi kết nối bị đóng một cách không mong muốn
        if (this.connection && this.connection.socket) {
          this.connection.socket.on("close", () => {
            console.log(
              `Connection to ${this.ipAddress} was closed unexpectedly`,
            );
            this.connected = false;
          });
        }

        return true;
      } catch (error) {
        console.error(`Failed to connect to ${this.ipAddress}:`, error);
        this.connected = false;
        this.connection = null;
        return false;
      }
    } catch (error) {
      console.error(`Error in connect method for ${this.ipAddress}:`, error);
      this.connected = false;
      this.connection = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        this.connection.close();
        console.log(`Disconnected from ${this.ipAddress}`);
      } catch (error) {
        console.error(`Error disconnecting from ${this.ipAddress}:`, error);
      }
      this.connection = null;
    }
    this.connected = false;
  }

  // Hàm execute với tham số là mảng các chuỗi
  async execute(command: string, params: string[] = []): Promise<any> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RouterOS device ${this.ipAddress}`);
    }

    try {
      console.log(`Executing command: ${command}`);

      // Chuẩn bị command
      const fullCommand = command.startsWith("/") ? command : `/${command}`;

      // Chuyển đổi params thành đối tượng query
      const apiParams = params.reduce(
        (obj, param) => {
          if (param.includes("=")) {
            const [key, value] = param.split("=", 2);
            obj[key] = value;
          }
          return obj;
        },
        {} as Record<string, string>,
      );

      // Thực thi lệnh
      const result = await this.connection.write(fullCommand, apiParams);

      // Xử lý kết quả để tránh undefined/null/NaN
      const processedResult = Array.isArray(result)
        ? result.map((item: any) => this.sanitizeObjectValues(item))
        : this.sanitizeObjectValues(result);

      return processedResult;
    } catch (error) {
      console.error(`Failed to execute command ${command}:`, error);
      throw error;
    }
  }

  async executeCommand(command: string, params: any[] = []): Promise<any> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RouterOS device ${this.ipAddress}`);
    }

    try {
      console.log(`Executing command: ${command}`);

      // Chuẩn bị command và params
      const fullCommand = command.startsWith("/") ? command : `/${command}`;

      // Chuyển đổi params sang định dạng RouterOS API
      let apiParams: any = {};

      if (params && params.length > 0) {
        console.log(`Command params:`, JSON.stringify(params));

        // Nếu params chỉ có một phần tử và là object
        if (params.length === 1 && typeof params[0] === "object") {
          apiParams = params[0];
        }
        // Nếu params là mảng các object, cần xử lý đặc biệt cho một số lệnh
        else if (Array.isArray(params) && params.length > 0) {
          // Trong trường hợp /log/print, chúng ta cần xử lý query params theo cách khác
          if (command === "/log/print") {
            // RouterOS API cần một object nếu có nhiều query params
            const combinedParams: any = {};

            // Gộp tất cả các params thành một object duy nhất
            for (const param of params) {
              if (typeof param === "object") {
                Object.assign(combinedParams, param);
              }
            }

            apiParams = combinedParams;
            console.log(`Processed log params:`, JSON.stringify(apiParams));
          } else {
            // Đối với các lệnh khác, sử dụng param đầu tiên nếu là object
            if (typeof params[0] === "object") {
              apiParams = params[0];
            }
          }
        }
      }

      console.log(`Final apiParams:`, JSON.stringify(apiParams));

      // Thực thi lệnh
      const result = await this.connection.write(fullCommand, apiParams);

      // Xử lý kết quả để tránh undefined/null/NaN
      const processedResult = Array.isArray(result)
        ? result.map((item: any) => this.sanitizeObjectValues(item))
        : this.sanitizeObjectValues(result);

      return processedResult;
    } catch (error) {
      console.error(`Failed to execute command ${command}:`, error);
      throw error;
    }
  }

  /**
   * Lấy log từ thiết bị RouterOS
   * @param options Các tùy chọn để lọc log (topics, limit, time, etc.)
   * @returns Danh sách các bản ghi log
   */
  async getLogs(
    options: {
      topics?: string[]; // Các topics cần lọc (system, firewall, dhcp, etc.)
      limit?: number; // Số lượng bản ghi tối đa
      timeFrom?: string; // Thời gian bắt đầu (định dạng: HH:MM:SS)
      timeTo?: string; // Thời gian kết thúc
      dateFrom?: string; // Ngày bắt đầu (định dạng: MM/DD/YYYY)
      dateTo?: string; // Ngày kết thúc
    } = {},
  ): Promise<any[]> {
    try {
      console.log(`Fetching logs with options:`, JSON.stringify(options));
      const {
        topics = [],
        limit = 500,
        timeFrom,
        timeTo,
        dateFrom,
        dateTo,
      } = options;

      // Xây dựng mảng các tham số truy vấn theo định dạng RouterOS API
      const queryParams: any[] = [];

      // Thêm tham số giới hạn
      if (limit) {
        queryParams.push({ "?limit": limit.toString() });
      }

      // Thêm tham số lọc topic nếu có
      if (topics && topics.length > 0) {
        // Với RouterOS API, chúng ta cần đặt yêu cầu lọc dưới dạng "?topics=*topic*"
        const topicQuery =
          topics.length === 1
            ? `*${topics[0]}*`
            : topics.map((t) => `*${t}*`).join(",");
        queryParams.push({ "?topics": topicQuery });
      }

      // Thêm các tham số thời gian
      if (timeFrom) queryParams.push({ "?time-from": timeFrom });
      if (timeTo) queryParams.push({ "?time-to": timeTo });
      if (dateFrom) queryParams.push({ "?date-from": dateFrom });
      if (dateTo) queryParams.push({ "?date-to": dateTo });

      console.log(
        `Executing log command with params:`,
        JSON.stringify(queryParams),
      );

      // Lấy log từ thiết bị với tham số dưới dạng mảng
      let logs = await this.executeCommand(
        "/log/print",
        queryParams.length > 0 ? queryParams : undefined,
      );
      console.log(`Retrieved ${logs?.length || 0} logs from device`);

      // Nếu không có kết quả, thử lại với số lượng logs ít hơn
      if (!logs || logs.length === 0) {
        console.log("No logs found, trying with a smaller limit...");
        const smallerLimit = Math.min(100, limit);
        const reducedParams = queryParams.map((p) =>
          "?limit" in p ? { "?limit": smallerLimit.toString() } : p,
        );
        logs = await this.executeCommand(
          "/log/print",
          reducedParams.length > 0 ? reducedParams : undefined,
        );
        console.log(
          `Second attempt retrieved ${logs?.length || 0} logs from device`,
        );
      }

      if (logs?.length > 0) {
        console.log(`Sample log entry:`, JSON.stringify(logs[0]));
      } else {
        console.log(`No logs found with the specified filters`);
        // Thử lệnh log/print đơn giản nhất để xem có lấy được logs không
        logs = await this.executeCommand("/log/print", [{ "?limit": "10" }]);
        console.log(`Basic log retrieval retrieved ${logs?.length || 0} logs`);
      }

      return logs || [];
    } catch (error) {
      console.error(`Failed to get logs from device:`, error);
      // Trả về mảng rỗng thay vì ném lỗi, để tránh crash ứng dụng
      return [];
    }
  }
}

// Thêm import cho module net để kiểm tra kết nối TCP
import * as net from "net";

export class MikrotikService {
  // Tạo một instance mới của MikrotikService
  createClientInstance(): MikrotikService {
    return new MikrotikService();
  }
  private clients: Map<number, MikrotikClient> = new Map();

  /**
   * Lấy danh sách giao diện mạng từ thiết bị MikroTik với thông tin lưu lượng
   * @returns Array of interfaces with traffic stats
   */
  async getInterfaces(): Promise<MikrotikInterface[]> {
    try {
      // Kiểm tra xem có client nào đang kết nối
      if (this.clients.size === 0) {
        console.error("No connected MikroTik devices");
        return [];
      }

      // Lấy client đầu tiên (thường chỉ có một thiết bị kết nối)
      // Sử dụng Array.from để khắc phục lỗi với '--downlevelIteration'
      const clientsArray = Array.from(this.clients.keys());
      if (clientsArray.length === 0) {
        console.error("Empty clients array after conversion");
        return [];
      }

      const deviceId = clientsArray[0];
      const client = this.clients.get(deviceId);

      if (!client) {
        throw new Error("Invalid MikroTik client");
      }

      // Lấy thông tin giao diện từ thiết bị
      const interfaces = await client.execute("/interface/print");

      // Lấy thêm thông tin lưu lượng
      const trafficData = await client.execute("/interface/monitor-traffic", [
        "=interface=all",
        "=once=",
      ]);

      console.log("Interface data from MikroTik:", interfaces);
      console.log("Traffic data from MikroTik:", trafficData);

      // Xử lý dữ liệu để trả về các giao diện với thông tin lưu lượng
      const result: MikrotikInterface[] = interfaces.map((iface: any) => {
        // Tìm dữ liệu lưu lượng tương ứng
        const traffic = Array.isArray(trafficData)
          ? trafficData.find((t: any) => t.name === iface.name)
          : null;

        return {
          id: iface[".id"] || "",
          name: iface.name || "",
          type: iface.type || "",
          mtu: parseInt(iface.mtu || "0"),
          actualMtu: parseInt(iface["actual-mtu"] || "0"),
          l2mtu: parseInt(iface.l2mtu || "0"),
          macAddress: iface["mac-address"] || "",
          running: iface.running === "true",
          disabled: iface.disabled === "true",
          comment: iface.comment || "",
          txPackets: parseInt(traffic?.["tx-packets"] || "0"),
          rxPackets: parseInt(traffic?.["rx-packets"] || "0"),
          txBytes: parseInt(traffic?.["tx-byte"] || "0"),
          rxBytes: parseInt(traffic?.["rx-byte"] || "0"),
          txDrops: parseInt(traffic?.["tx-drops"] || "0"),
          rxDrops: parseInt(traffic?.["rx-drops"] || "0"),
          txErrors: parseInt(traffic?.["tx-errors"] || "0"),
          rxErrors: parseInt(traffic?.["rx-errors"] || "0"),
          lastLinkUpTime: iface["last-link-up-time"] || "",
          linkDowns: parseInt(iface["link-downs"] || "0"),
        };
      });

      return result;
    } catch (error) {
      console.error("Error getting interfaces from MikroTik:", error);
      return [];
    }
  }

  /**
   * Lấy danh sách các bản ghi ARP từ thiết bị MikroTik
   * @param device Device object or deviceId
   * @returns Array of ARP entries
   */
  async getArpEntries(device: number | Device): Promise<ArpEntry[]> {
    try {
      const deviceId = typeof device === "number" ? device : device.id;
      let client = this.clients.get(deviceId);

      if (!client) {
        const connected = await this.connectToDevice(deviceId);
        if (!connected) {
          console.error(
            `Could not connect to device ${deviceId} for ARP entries`,
          );
          return [];
        }
        client = this.clients.get(deviceId);
      }

      if (!client) {
        console.error(`Still could not get client for device ${deviceId}`);
        return [];
      }

      const arpEntries = await client.executeCommand("/ip/arp/print");

      if (!Array.isArray(arpEntries)) {
        console.error("Invalid ARP table data:", arpEntries);
        return [];
      }

      // Map the RouterOS ARP entries to our ArpEntry type
      return arpEntries.map(
        (entry: any): ArpEntry => ({
          id: entry[".id"] || "",
          address: entry.address || "",
          macAddress: entry["mac-address"] || "",
          interface: entry.interface || "",
          complete: entry.complete || "",
          disabled: entry.disabled === "true" ? "true" : "false",
          dynamic: entry.dynamic === "true" ? "true" : "false",
          invalid: entry.invalid === "true" ? "true" : "false",
          deviceId: deviceId,
        }),
      );
    } catch (error) {
      console.error(`Error in getArpEntries:`, error);
      return [];
    }
  }

  /**
   * Lấy danh sách các bản ghi DHCP lease từ thiết bị MikroTik
   * @param device Device object or deviceId
   * @returns Array of DHCP leases
   */
  async getDhcpLeases(device: number | Device): Promise<DhcpLease[]> {
    try {
      const deviceId = typeof device === "number" ? device : device.id;
      let client = this.clients.get(deviceId);

      if (!client) {
        const connected = await this.connectToDevice(deviceId);
        if (!connected) {
          console.error(
            `Could not connect to device ${deviceId} for DHCP leases`,
          );
          return [];
        }
        client = this.clients.get(deviceId);
      }

      if (!client) {
        console.error(`Still could not get client for device ${deviceId}`);
        return [];
      }

      const leases = await client.executeCommand("/ip/dhcp-server/lease/print");

      if (!Array.isArray(leases)) {
        console.error("Invalid DHCP leases data:", leases);
        return [];
      }

      // Map the RouterOS DHCP leases to our DhcpLease type
      return leases.map(
        (lease: any): DhcpLease => ({
          id: lease[".id"] || "",
          address: lease.address || "",
          macAddress: lease["mac-address"] || "",
          clientId: lease["client-id"],
          hostName: lease["host-name"],
          comment: lease.comment,
          status: lease.status || "unknown",
          lastSeen: lease["last-seen"] ? new Date() : undefined,
          server: lease.server,
          disabled: lease.disabled === "true",
          dynamic: lease.dynamic === "true",
          blocked: lease.blocked === "true",
          radius: lease.radius === "true",
          expiresAfter: lease["expires-after"],
          activeAddress: lease["active-address"],
          activeServerId: lease["active-server"],
          agentCircuitId: lease["agent-circuit-id"],
          agentRemoteId: lease["agent-remote-id"],
          deviceId: deviceId,
        }),
      );
    } catch (error) {
      console.error(`Error in getDhcpLeases:`, error);
      return [];
    }
  }

  /**
   * Lấy danh sách các thiết bị hàng xóm (neighbors) từ thiết bị MikroTik
   * bao gồm ARP entries và DHCP leases
   * @param deviceId ID of the MikroTik device
   * @returns Array of network neighbors
   */
  async getNetworkNeighbors(deviceId: number): Promise<NetworkDeviceDetails[]> {
    try {
      const neighbors: NetworkDeviceDetails[] = [];

      // Get ARP entries
      const arpEntries = await this.getArpEntries(deviceId);

      if (arpEntries && arpEntries.length > 0) {
        console.log(
          `Found ${arpEntries.length} ARP entries for device ${deviceId}`,
        );

        // Convert ARP entries to NetworkDeviceDetails
        for (const entry of arpEntries) {
          neighbors.push({
            ipAddress: entry.address,
            macAddress: entry.macAddress,
            interface: entry.interface,
            firstSeen: new Date(),
            lastSeen: new Date(),
            isOnline: true,
            deviceType: "unknown",
            deviceRole: "unknown",
          });
        }
      }

      // Get DHCP leases
      const dhcpLeases = await this.getDhcpLeases(deviceId);

      if (dhcpLeases && dhcpLeases.length > 0) {
        console.log(
          `Found ${dhcpLeases.length} DHCP leases for device ${deviceId}`,
        );

        // Convert DHCP leases to NetworkDeviceDetails and merge with existing entries
        for (const lease of dhcpLeases) {
          // Check if we already have this device from ARP entries
          const existingIndex = neighbors.findIndex(
            (n) =>
              n.ipAddress === lease.address ||
              n.macAddress === lease.macAddress,
          );

          if (existingIndex >= 0) {
            // Update existing entry with DHCP information
            neighbors[existingIndex].hostName = lease.hostName;
            neighbors[existingIndex].lastSeen = new Date();
          } else {
            // Add new entry
            neighbors.push({
              ipAddress: lease.address,
              macAddress: lease.macAddress,
              hostName: lease.hostName,
              firstSeen: new Date(),
              lastSeen: new Date(),
              isOnline: true,
              deviceType: "unknown",
              deviceRole: "unknown",
            });
          }
        }
      }

      return neighbors;
    } catch (error) {
      console.error(`Error in getNetworkNeighbors:`, error);
      return [];
    }
  }

  /**
   * Lấy client kết nối tới thiết bị MikroTik theo ID
   */
  getClientForDevice(deviceId: number): MikrotikClient | undefined {
    return this.clients.get(deviceId);
  }

  /**
   * Lấy danh sách kết nối PPPoE và L2TP từ thiết bị
   * @param deviceId ID của thiết bị Mikrotik
   * @returns Danh sách kết nối PPP và L2TP
   */
  /**
   * Gets client or initializes connection if needed
   * @param deviceId The device ID
   * @returns Connected MikrotikClient
   */
  async getClient(deviceId: number): Promise<MikrotikClient> {
    let client = this.clients.get(deviceId);

    if (!client) {
      const connected = await this.connectToDevice(deviceId);
      if (!connected) {
        throw new Error(`Could not connect to device ${deviceId}`);
      }
      client = this.clients.get(deviceId);
      if (!client) {
        throw new Error(`Failed to create client for device ${deviceId}`);
      }
    }

    return client;
  }

  async getLTPPConnections(deviceId: number): Promise<PPPConnection[]> {
    try {
      const client = await this.getClient(deviceId);
      console.log(`Getting PPP connections for device ${deviceId}...`);

      // Lấy toàn bộ dữ liệu interface để có thông tin đầy đủ
      const interfaces = await client.executeCommand("/interface/print", [
        { detail: "" },
      ]);
      console.log(`Found ${interfaces?.length || 0} total interfaces`);

      // Tạo map theo tên interface để tra cứu nhanh
      const interfaceMap = new Map();
      if (Array.isArray(interfaces)) {
        interfaces.forEach((iface) => {
          interfaceMap.set(iface.name, iface);
        });
      }

      // Lấy dữ liệu kết nối PPPoE chi tiết
      const pppoeSessions = await client.executeCommand(
        "/interface/pppoe-client/print",
        [{ detail: "" }],
      );
      console.log(
        `Found ${pppoeSessions?.length || 0} PPPoE client connections`,
      );

      // Lấy kết nối L2TP client
      const l2tpClientConns = await client.executeCommand(
        "/interface/l2tp-client/print",
        [{ detail: "" }],
      );
      console.log(
        `Found ${l2tpClientConns?.length || 0} L2TP client connections`,
      );

      // Tạo mảng kết quả từ dữ liệu kết hợp
      const allConnections: PPPConnection[] = [];

      // Thêm kết nối PPPoE
      if (Array.isArray(pppoeSessions)) {
        for (const session of pppoeSessions) {
          // Lấy thông tin interface tương ứng (để có rx-byte, tx-byte chính xác)
          const iface = interfaceMap.get(session.name);

          allConnections.push({
            name: session.name,
            type: "pppoe" as const,
            user: session.user,
            uptime: session.uptime,
            // Ưu tiên thông tin từ interface
            activeAddress: session["ac-name"] || session["service-name"] || "",
            service: session["service-name"] || "pppoe",
            // Đảm bảo trạng thái chính xác
            status:
              session.running === "true" || iface?.running === "true"
                ? "connected"
                : "disconnected",
            running: session.running === "true" || iface?.running === "true",
            disabled: session.disabled === "true" || iface?.disabled === "true",
            comment:
              session.comment || `Kết nối PPPoE: ${session.user || "Unknown"}`,
            macAddress: session["mac-address"] || iface?.["mac-address"] || "",
            // Sử dụng dữ liệu từ interface nếu có, không thì từ session
            txByte: parseInt(iface?.["tx-byte"] || session["tx-byte"] || "0"),
            rxByte: parseInt(iface?.["rx-byte"] || session["rx-byte"] || "0"),
            mtu: parseInt(session.mtu || iface?.mtu || "1500"),
          });
        }
      }

      // Thêm kết nối L2TP client
      if (Array.isArray(l2tpClientConns)) {
        for (const conn of l2tpClientConns) {
          // Lấy thông tin interface tương ứng
          const iface = interfaceMap.get(conn.name);

          allConnections.push({
            name: conn.name,
            type: "l2tp" as const,
            user: conn.user || "",
            uptime: conn.uptime || "0s",
            activeAddress: conn["connect-to"] || "",
            service: "l2tp-out",
            // Đảm bảo trạng thái chính xác
            status:
              conn.running === "true" || iface?.running === "true"
                ? "connected"
                : "disconnected",
            running: conn.running === "true" || iface?.running === "true",
            disabled: conn.disabled === "true" || iface?.disabled === "true",
            comment:
              conn.comment ||
              `Kết nối L2TP VPN: ${conn.user || conn["connect-to"] || "Unknown"}`,
            macAddress: conn["mac-address"] || iface?.["mac-address"] || "",
            // Sử dụng dữ liệu từ interface nếu có, không thì từ session
            txByte: parseInt(iface?.["tx-byte"] || conn["tx-byte"] || "0"),
            rxByte: parseInt(iface?.["rx-byte"] || conn["rx-byte"] || "0"),
            mtu: parseInt(conn.mtu || iface?.mtu || "1500"),
          });
        }
      }

      // Thêm cả L2TP server connections (dành cho máy chủ VPN)
      try {
        const l2tpServerConns = await client.executeCommand(
          "/interface/l2tp-server/print",
          [{ detail: "" }],
        );
        console.log(
          `Found ${l2tpServerConns?.length || 0} L2TP server connections`,
        );

        if (Array.isArray(l2tpServerConns) && l2tpServerConns.length > 0) {
          for (const conn of l2tpServerConns) {
            // Lấy thông tin interface tương ứng
            const iface = interfaceMap.get(conn.name);

            allConnections.push({
              name: conn.name || `l2tp-in${allConnections.length + 1}`,
              type: "l2tp" as const,
              user: conn.user || "",
              uptime: conn.uptime || "0s",
              activeAddress: conn["active-address"] || "",
              service: "l2tp-in",
              // Đảm bảo trạng thái chính xác
              status:
                conn.running === "true" || iface?.running === "true"
                  ? "connected"
                  : "disconnected",
              running: conn.running === "true" || iface?.running === "true",
              disabled: conn.disabled === "true" || iface?.disabled === "true",
              comment:
                conn.comment ||
                `Kết nối L2TP đến máy chủ: ${conn.user || "Unknown"}`,
              macAddress: conn["mac-address"] || iface?.["mac-address"] || "",
              // Sử dụng dữ liệu từ interface nếu có, không thì từ kết nối
              txByte: parseInt(iface?.["tx-byte"] || conn["tx-byte"] || "0"),
              rxByte: parseInt(iface?.["rx-byte"] || conn["rx-byte"] || "0"),
              mtu: parseInt(conn.l2mtu || iface?.mtu || "1500"),
            });
          }
        }
      } catch (l2tpServerError) {
        console.log(
          `Could not get L2TP server connections: ${l2tpServerError}`,
        );
      }

      console.log(
        `Returning ${allConnections.length} PPP/L2TP connections with data`,
      );
      return allConnections;
    } catch (error) {
      console.error(
        `Error getting PPPOE/L2TP connections for device ${deviceId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Lấy logs từ thiết bị MikroTik
   * @param deviceId ID của thiết bị
   * @param options Tùy chọn lọc log (topics, limit, time range)
   */
  async getDeviceLogs(
    deviceId: number,
    options: {
      topics?: string[];
      limit?: number;
      timeFrom?: string;
      timeTo?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ): Promise<{ success: boolean; data?: any[]; message: string }> {
    try {
      console.log(
        `[LOG API] Fetching system logs for device ID ${deviceId} with options:`,
        JSON.stringify(options),
      );

      // Kết nối đến thiết bị nếu chưa có kết nối
      let client = this.clients.get(deviceId);
      if (!client) {
        console.log(
          `[LOG API] No existing connection to device ${deviceId}, connecting...`,
        );
        const connected = await this.connectToDevice(deviceId);
        if (!connected) {
          return {
            success: false,
            message: `Không thể kết nối đến thiết bị ID: ${deviceId}`,
          };
        }
        client = this.clients.get(deviceId);
      }

      if (!client) {
        return {
          success: false,
          message: `Không thể tạo kết nối đến thiết bị ID: ${deviceId}`,
        };
      }

      // Kiểm tra kết nối - đã được đổi sang public để truy cập
      console.log(`[LOG API] Client connection status:`, client.connected);

      try {
        // Thử lấy logs với cách đơn giản nhất trước
        console.log(
          `[LOG API] Attempting to get logs with basic command first`,
        );
        let logs = await client.executeCommand("/log/print", [
          { "?limit": "100" },
        ]);

        if (!logs || !Array.isArray(logs) || logs.length === 0) {
          console.log(
            `[LOG API] No logs with basic command, trying again with default params...`,
          );

          // Tạo mảng tham số truy vấn thay vì object để tránh lỗi TypeScript
          const queryParams: Array<Record<string, string>> = [];

          // Thêm giới hạn số lượng logs
          queryParams.push({ "?limit": "100" });

          // Nếu có topics, thêm vào
          if (options.topics && options.topics.length > 0) {
            const topicStr = options.topics.join(",");
            queryParams.push({ "?topics": topicStr });
          }

          // Thêm các tham số thời gian
          if (options.timeFrom)
            queryParams.push({ "?time-from": options.timeFrom });
          if (options.timeTo) queryParams.push({ "?time-to": options.timeTo });
          if (options.dateFrom)
            queryParams.push({ "?date-from": options.dateFrom });
          if (options.dateTo) queryParams.push({ "?date-to": options.dateTo });

          console.log(
            `[LOG API] Executing with simple params array:`,
            JSON.stringify(queryParams),
          );
          logs = await client.executeCommand("/log/print", queryParams);
        }

        // Nếu vẫn không có logs, thử cách cũ
        if (!logs || !Array.isArray(logs) || logs.length === 0) {
          console.log(`[LOG API] Still no logs, trying raw command...`);
          logs = await client.executeCommand("/log/print");
        }

        // Kiểm tra kết quả
        if (logs && Array.isArray(logs) && logs.length > 0) {
          console.log(
            `[LOG API] Successfully retrieved ${logs.length} logs. Sample:`,
            logs.length > 0 ? JSON.stringify(logs[0]) : "No logs",
          );

          // Format logs để dễ hiển thị
          const formattedLogs = logs.map((log: any) => ({
            id: log[".id"] || "",
            time: log.time || "",
            topics: log.topics || "",
            message: log.message || "",
          }));

          return {
            success: true,
            data: formattedLogs,
            message: `Đã lấy ${logs.length} bản ghi log từ thiết bị`,
          };
        } else {
          console.log(`[LOG API] All attempts failed, no logs found.`);
          // Thử sử dụng một lệnh khác để kiểm tra xem RouterOS API có hoạt động không
          try {
            const systemResource = await client.executeCommand(
              "/system/resource/print",
            );
            console.log(
              `[LOG API] System resource command works:`,
              systemResource ? "Yes" : "No",
            );
          } catch (testError) {
            console.error(`[LOG API] Test command also failed:`, testError);
          }

          return {
            success: false,
            data: [],
            message: `Không tìm thấy bản ghi log nào sau khi thử nhiều cách khác nhau.`,
          };
        }
      } catch (commandError) {
        console.error(`[LOG API] Error executing log command:`, commandError);
        return {
          success: false,
          message: `Lỗi khi thực hiện lệnh lấy logs: ${commandError instanceof Error ? commandError.message : String(commandError)}`,
        };
      }
    } catch (error) {
      console.error(
        `[LOG API] Error getting logs from device ${deviceId}:`,
        error,
      );
      return {
        success: false,
        message: `Lỗi khi lấy logs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Thay đổi trạng thái (bật/tắt) của một interface trên thiết bị MikroTik
   * @param deviceId ID của thiết bị MikroTik
   * @param interfaceId ID của interface trong cơ sở dữ liệu
   * @param enable true để bật interface, false để tắt
   * @returns Kết quả của hoạt động
   */
  async toggleInterface(
    deviceId: number,
    interfaceId: number,
    enable: boolean,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Lấy thông tin về interface từ cơ sở dữ liệu
      const interfaceInfo = await storage.getInterface(interfaceId);

      if (!interfaceInfo) {
        return {
          success: false,
          message: `Interface với ID ${interfaceId} không tồn tại`,
        };
      }

      // Kiểm tra xem interface có thuộc thiết bị này không
      if (interfaceInfo.deviceId !== deviceId) {
        return {
          success: false,
          message: `Interface không thuộc về thiết bị ID ${deviceId}`,
        };
      }

      // Lấy client đã kết nối
      const client = this.clients.get(deviceId);
      if (!client) {
        await this.connectToDevice(deviceId);

        // Kiểm tra lại sau khi thử kết nối
        const reconnectedClient = this.clients.get(deviceId);
        if (!reconnectedClient) {
          return {
            success: false,
            message: `Không thể kết nối đến thiết bị ID: ${deviceId}`,
          };
        }
      }

      // Sử dụng client đã cập nhật
      const currentClient = this.clients.get(deviceId);
      if (!currentClient) {
        return {
          success: false,
          message: `Không thể kết nối đến thiết bị ID: ${deviceId}`,
        };
      }

      // Thực hiện lệnh kích hoạt/vô hiệu hóa interface
      const command = enable ? "/interface/enable" : "/interface/disable";
      const result = await currentClient.executeCommand(command, [
        { ".id": interfaceInfo.name },
      ]);

      // Cập nhật trạng thái trong cơ sở dữ liệu
      await storage.updateInterface(interfaceId, {
        disabled: !enable,
        lastUpdated: new Date(),
      });

      // Force refresh thông tin interface sau 1 giây để đảm bảo trạng thái được cập nhật
      setTimeout(() => {
        this.collectInterfaceStats(deviceId).catch((err) => {
          console.error(
            `Error refreshing interface stats after toggle: ${err}`,
          );
        });
      }, 1000);

      return {
        success: true,
        message: `Interface ${interfaceInfo.name} đã được ${enable ? "bật" : "tắt"} thành công`,
        data: result,
      };
    } catch (error) {
      console.error(`Error toggling interface status: ${error}`);
      return {
        success: false,
        message: `Lỗi khi ${enable ? "bật" : "tắt"} interface: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Kiểm tra xem thiết bị MikroTik có trực tuyến hay không bằng cách thử kết nối TCP đến các cổng phổ biến
   * @param ipAddress Địa chỉ IP của thiết bị
   * @returns True nếu thiết bị trực tuyến, ngược lại là False
   */
  async checkDeviceOnline(ipAddress: string): Promise<boolean> {
    try {
      // Các cổng phổ biến được sử dụng bởi thiết bị MikroTik
      const commonMikrotikPorts = [8728, 8729, 80, 443, 22, 8291];

      // Thử kết nối đến từng cổng
      for (const port of commonMikrotikPorts) {
        try {
          console.log(`Kiểm tra kết nối đến ${ipAddress}:${port}...`);

          // Sử dụng Promise để kiểm tra kết nối với timeout
          const isConnected = await new Promise<boolean>((resolve) => {
            const socket = net.createConnection({
              host: ipAddress,
              port: port,
              timeout: 1000, // 1 giây timeout
            });

            // Đặt timeout cho kết nối
            const timeout = setTimeout(() => {
              socket.destroy();
              resolve(false);
            }, 1000);

            // Xử lý khi kết nối thành công
            socket.on("connect", () => {
              clearTimeout(timeout);
              socket.destroy();
              console.log(`Kết nối thành công đến ${ipAddress}:${port}`);
              resolve(true);
            });

            // Xử lý khi có lỗi kết nối
            socket.on("error", (err) => {
              clearTimeout(timeout);
              socket.destroy();
              console.log(
                `Không thể kết nối đến ${ipAddress}:${port}: ${err.message}`,
              );
              resolve(false);
            });
          });

          if (isConnected) {
            return true;
          }
        } catch (error) {
          console.log(`Lỗi khi thử kết nối đến ${ipAddress}:${port}: ${error}`);
          continue;
        }
      }

      console.log(
        `Không thể kết nối đến thiết bị ${ipAddress} trên bất kỳ cổng nào.`,
      );
      return false;
    } catch (error) {
      console.error(
        `Lỗi khi kiểm tra thiết bị ${ipAddress} có trực tuyến hay không:`,
        error,
      );
      return false;
    }
  }

  /**
   * Kết nối đến thiết bị MikroTik sử dụng tham số kết nối
   * @param params Tham số kết nối
   * @returns Thành công hay không
   */
  async connect(params: ConnectionParams): Promise<boolean> {
    try {
      // Kiểm tra xem đã có kết nối chưa
      let client = this.clients.get(params.id);

      // Nếu đã có kết nối, ngắt kết nối cũ
      if (client) {
        await client.disconnect();
        this.clients.delete(params.id);
      }

      // Tạo client mới
      client = new MikrotikClient(
        params.host,
        params.username,
        params.password,
      );

      // Thiết lập cổng nếu có
      if (params.port) {
        client.setPort(params.port);
      }

      // Kết nối
      const connected = await client.connect();

      if (connected) {
        this.clients.set(params.id, client);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error connecting to device ${params.id}:`, error);
      return false;
    }
  }

  /**
   * Ngắt kết nối từ thiết bị MikroTik
   * @param deviceId ID của thiết bị
   */
  async disconnect(deviceId: number): Promise<void> {
    const client = this.clients.get(deviceId);
    if (client) {
      await client.disconnect();
      this.clients.delete(deviceId);
    }
  }

  /**
   * Gửi lệnh đến thiết bị MikroTik
   * @param deviceId ID của thiết bị
   * @param command Lệnh cần gửi
   * @param params Tham số của lệnh (nếu có)
   * @returns Kết quả từ thiết bị
   */
  async sendCommand(
    deviceId: number,
    command: string,
    params: any[] = [],
  ): Promise<any> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new Error(`No connection to device ${deviceId}`);
    }

    return await client.executeCommand(command, params);
  }

  async connectToDevice(deviceId: number): Promise<boolean> {
    const device = await storage.getDevice(deviceId);
    if (!device) {
      console.error(`Device with ID ${deviceId} not found`);
      return false;
    }

    try {
      console.log(`Connecting to device ${deviceId} (${device.ipAddress})...`);

      // Tạo client mới
      const client = new MikrotikClient(
        device.ipAddress,
        device.username,
        device.password,
      );

      // Thử các cổng API khác nhau
      const ports = [8728, 8729, 80, 443];

      for (const port of ports) {
        try {
          console.log(
            `Trying to connect to ${device.ipAddress} on port ${port}... (Wait 20s for timeout)`,
          );

          client.setPort(port);
          const connected = await client.connect(20000);

          if (connected) {
            console.log(
              `Successfully connected to ${device.ipAddress} on port ${port}`,
            );
            this.clients.set(deviceId, client);
            return true;
          }
        } catch (error) {
          console.error(
            `Failed to connect to ${device.ipAddress} on port ${port}:`,
            error,
          );
        }
      }

      console.error(
        `Failed to connect to device ${deviceId} (${device.ipAddress}) on any port`,
      );

      await this.createAlert(
        deviceId,
        alertSeverity.ERROR,
        `Failed to connect to device on any port`,
        "connection",
      );

      return false;
    } catch (error) {
      console.error(`Error connecting to device ${deviceId}:`, error);
      return false;
    }
  }

  async disconnectFromDevice(deviceId: number): Promise<void> {
    const client = this.clients.get(deviceId);
    if (client) {
      await client.disconnect();
      this.clients.delete(deviceId);
    }
  }

  async collectDeviceMetrics(deviceId: number): Promise<boolean> {
    const device = await storage.getDevice(deviceId);
    if (!device) {
      console.error(`Device with ID ${deviceId} not found`);
      return false;
    }

    try {
      // Lấy client hoặc tạo kết nối mới
      let client = this.clients.get(deviceId);

      if (!client) {
        console.log(
          `No existing connection to device ${deviceId}, attempting to connect...`,
        );
        const connected = await this.connectToDevice(deviceId);

        if (!connected) {
          console.error(`Could not connect to device ${deviceId}`);

          await storage.updateDevice(deviceId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          return false;
        }

        client = this.clients.get(deviceId);
      }

      if (!client) {
        console.error(`Could not create client for device ${deviceId}`);
        return false;
      }

      try {
        // Thu thập thông tin hệ thống
        const resourcesData = await client.executeCommand(
          "/system/resource/print",
        );

        if (!Array.isArray(resourcesData) || resourcesData.length === 0) {
          throw new Error("Invalid system resource data");
        }

        const resources = resourcesData[0];

        // Thu thập thông tin router-board để lấy serial number
        let routerBoard = null;
        try {
          const routerBoardData = await client.executeCommand(
            "/system/routerboard/print",
          );
          routerBoard =
            Array.isArray(routerBoardData) && routerBoardData.length > 0
              ? routerBoardData[0]
              : null;
        } catch (err: any) {
          console.warn(`Failed to get routerboard data: ${err.message}`);
          // Tiếp tục xử lý mà không có dữ liệu routerboard
        }

        // Thu thập identity
        let identity = device.name;
        try {
          const identityData = await client.executeCommand(
            "/system/identity/print",
          );
          if (Array.isArray(identityData) && identityData.length > 0) {
            identity = identityData[0].name;
          }
        } catch (err: any) {
          console.warn(`Failed to get device identity: ${err.message}`);
          // Sử dụng tên thiết bị đã có sẵn
        }

        // Cập nhật thông tin thiết bị
        await storage.updateDevice(deviceId, {
          isOnline: true,
          lastSeen: new Date(),
          model: resources.board || resources["board-name"] || null,
          serialNumber:
            routerBoard?.["serial-number"] ||
            resources["serial-number"] ||
            null,
          routerOsVersion: resources.version || null,
          firmware:
            resources["firmware-type"] ||
            routerBoard?.["firmware-type"] ||
            null,
          cpu: resources["cpu-load"] || 0,
          totalMemory: resources["total-memory"] || 0,
          uptime: resources.uptime || "0d 0h 0m",
        });

        // Thu thập thông tin interfaces để tính lưu lượng mạng
        const interfaces = await client.executeCommand("/interface/print");
        let totalDownloadBandwidth = 0;
        let totalUploadBandwidth = 0;

        if (Array.isArray(interfaces) && interfaces.length > 0) {
          // Tính tổng bandwidth từ tất cả interfaces
          interfaces.forEach((iface) => {
            // Chỉ tính các interface đang hoạt động và không phải loại bridge
            let isRunning = iface.running === "true" || iface.running === true;
            const isDisabled =
              iface.disabled === "true" || iface.disabled === true;
            const type = iface.type || "";

            // Xử lý đặc biệt cho interface CAP (CAPsMAN Access Point)
            const isCAPInterface =
              type === "cap" ||
              type === "CAP" ||
              (iface.name &&
                (iface.name.toLowerCase().includes("cap") ||
                  iface.name.toLowerCase().includes("wlan")));

            // Không tự động đánh dấu CAP interfaces là đang chạy
            // Chỉ ghi log để theo dõi trạng thái thực tế
            if (isCAPInterface) {
              console.log(
                `CAP interface ${iface.name} - running state: ${isRunning}, disabled: ${isDisabled}`,
              );
            }

            if (isRunning && !isDisabled && type !== "bridge") {
              // Lấy giá trị rx-byte và tx-byte
              const rxBytes = parseInt(iface["rx-byte"] || "0", 10);
              const txBytes = parseInt(iface["tx-byte"] || "0", 10);

              // Cộng dồn vào tổng bandwidth
              totalDownloadBandwidth += rxBytes;
              totalUploadBandwidth += txBytes;

              // Ghi chú: Đây là tổng lượng bytes, không phải tốc độ thực tế
              // Sẽ xử lý monitor-traffic trong một phương thức async riêng biệt
            }
          });
        }

        // Lưu metric mới với thêm thông tin bandwidth
        const metric: InsertMetric = {
          deviceId,
          timestamp: new Date(),
          cpuLoad: parseInt(resources["cpu-load"] || "0", 10),
          memoryUsage: parseInt(resources["free-memory"] || "0", 10),
          uptime: resources.uptime || "0d 0h 0m",
          temperature: parseInt(resources.temperature || "0", 10),
          totalMemory: parseInt(resources["total-memory"] || "0", 10),
          downloadBandwidth: totalDownloadBandwidth,
          uploadBandwidth: totalUploadBandwidth,
          boardTemp: routerBoard?.temperature
            ? parseInt(routerBoard.temperature, 10)
            : null,
        };

        await storage.createMetric(metric);

        // Thu thập thông tin interfaces
        await this.collectInterfaceStats(deviceId);

        // Thu thập thông tin wireless nếu có
        try {
          const wirelessData = await client.executeCommand(
            "/interface/wireless/print",
          );

          if (Array.isArray(wirelessData) && wirelessData.length > 0) {
            await storage.updateDevice(deviceId, { hasWireless: true });
            await wirelessService.collectWirelessStats(deviceId);
          } else {
            await storage.updateDevice(deviceId, { hasWireless: false });
          }
        } catch (error) {
          console.warn(
            `Device ${deviceId} does not have wireless interfaces:`,
            error,
          );
          await storage.updateDevice(deviceId, { hasWireless: false });
        }

        // Thu thập thông tin CAPsMAN nếu có
        try {
          console.log(`Kiểm tra CAPsMAN trên thiết bị ${deviceId}...`);

          // Kiểm tra cách 1: Kiểm tra CAPsMAN Manager
          try {
            console.log(`Đang kiểm tra CAPsMAN manager...`);
            const capsmanManagerData = await client.executeCommand(
              "/caps-man/manager/print",
            );
            console.log(`CAPsMAN manager data:`, capsmanManagerData);

            if (
              Array.isArray(capsmanManagerData) &&
              capsmanManagerData.length > 0
            ) {
              const manager = capsmanManagerData[0];
              const isEnabled =
                manager.enabled === "true" || manager.enabled === true;
              console.log(`CAPsMAN manager enabled: ${isEnabled}`);

              await storage.updateDevice(deviceId, { hasCAPsMAN: true });
              console.log(
                `Thiết lập hasCAPsMAN = true cho thiết bị ${deviceId} dựa vào kết quả kiểm tra manager`,
              );

              // Nếu được kích hoạt, thu thập thêm thông tin
              if (isEnabled) {
                await capsmanService.collectCapsmanStats(deviceId);
              }

              return true; // Thoát khỏi quá trình kiểm tra nếu đã xác định được
            }
          } catch (managerError) {
            console.warn(`Không tìm thấy CAPsMAN manager:`, managerError);
          }

          // Kiểm tra cách 2: Kiểm tra CAPsMAN Configuration
          try {
            console.log(`Đang kiểm tra CAPsMAN configurations...`);
            const capsmanConfigData = await client.executeCommand(
              "/caps-man/configuration/print",
            );
            console.log(`CAPsMAN configurations data:`, capsmanConfigData);

            if (
              Array.isArray(capsmanConfigData) &&
              capsmanConfigData.length > 0
            ) {
              console.log(
                `Found ${capsmanConfigData.length} CAPsMAN configurations`,
              );
              await storage.updateDevice(deviceId, { hasCAPsMAN: true });
              console.log(
                `Thiết lập hasCAPsMAN = true cho thiết bị ${deviceId} dựa vào kết quả kiểm tra configurations`,
              );
              return true; // Thoát khỏi quá trình kiểm tra nếu đã xác định được
            }
          } catch (configError) {
            console.warn(`Không tìm thấy CAPsMAN configurations:`, configError);
          }

          // Kiểm tra cách 3: Kiểm tra CAPsMAN Access Points
          try {
            console.log(`Đang kiểm tra CAPsMAN access-point...`);
            const capsmanAPData = await client.executeCommand(
              "/caps-man/access-point/print",
            );
            console.log(`CAPsMAN access-point data:`, capsmanAPData);

            if (Array.isArray(capsmanAPData) && capsmanAPData.length > 0) {
              console.log(
                `Found ${capsmanAPData.length} CAPsMAN access points`,
              );
              await storage.updateDevice(deviceId, { hasCAPsMAN: true });
              console.log(
                `Thiết lập hasCAPsMAN = true cho thiết bị ${deviceId} dựa vào kết quả kiểm tra access-point`,
              );
              return true; // Thoát khỏi quá trình kiểm tra nếu đã xác định được
            }
          } catch (apError) {
            console.warn(`Không tìm thấy CAPsMAN access-point:`, apError);
          }

          // Kiểm tra cách 4: Kiểm tra CAPsMAN Interfaces
          try {
            console.log(`Đang kiểm tra CAPsMAN interfaces...`);
            const capsmanInterfaceData = await client.executeCommand(
              "/caps-man/interface/print",
            );
            console.log(`CAPsMAN interface data:`, capsmanInterfaceData);

            if (
              Array.isArray(capsmanInterfaceData) &&
              capsmanInterfaceData.length > 0
            ) {
              console.log(
                `Found ${capsmanInterfaceData.length} CAPsMAN interfaces`,
              );
              await storage.updateDevice(deviceId, { hasCAPsMAN: true });
              console.log(
                `Thiết lập hasCAPsMAN = true cho thiết bị ${deviceId} dựa vào kết quả kiểm tra interfaces`,
              );
              return true; // Thoát khỏi quá trình kiểm tra nếu đã xác định được
            }
          } catch (interfaceError) {
            console.warn(`Không tìm thấy CAPsMAN interfaces:`, interfaceError);
          }

          // Nếu không tìm thấy bất kỳ thành phần nào của CAPsMAN
          console.log(
            `Không tìm thấy bất kỳ thành phần CAPsMAN nào trên thiết bị ${deviceId}`,
          );
          await storage.updateDevice(deviceId, { hasCAPsMAN: false });
        } catch (error) {
          console.error(
            `Lỗi không xác định khi kiểm tra CAPsMAN cho thiết bị ${deviceId}:`,
            error,
          );
          await storage.updateDevice(deviceId, { hasCAPsMAN: false });
        }

        // Thu thập thông tin firewall rules
        try {
          await this.collectFirewallRules(deviceId);
        } catch (err: any) {
          console.warn(`Failed to collect firewall rules: ${err.message}`);
          // Tiếp tục xử lý
        }

        // Thu thập thông tin VPN connections
        try {
          await this.collectVpnConnections(deviceId);
        } catch (err: any) {
          console.warn(`Failed to collect VPN connections: ${err.message}`);
          // Tiếp tục xử lý
        }

        return true;
      } catch (error: any) {
        console.error(
          `Error collecting metrics for device ${deviceId}:`,
          error,
        );

        await storage.updateDevice(deviceId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        await this.createAlert(
          deviceId,
          alertSeverity.ERROR,
          `Failed to collect metrics: ${error.message}`,
          "metrics",
        );

        await this.disconnectFromDevice(deviceId);

        return false;
      }
    } catch (error) {
      console.error(
        `Unexpected error while collecting metrics for device ${deviceId}:`,
        error,
      );
      return false;
    }
  }

  public async createAlert(
    deviceId: number,
    severity: AlertSeverity,
    message: string,
    source: string | null,
  ): Promise<void> {
    try {
      const device = await storage.getDevice(deviceId);
      if (!device) {
        console.error(
          `Cannot create alert: Device with ID ${deviceId} not found`,
        );
        return;
      }

      // Thêm thông tin về thiết bị vào cảnh báo
      let enhancedMessage = message;

      if (device.model) {
        enhancedMessage = `${device.model}: ${message}`;
      }

      // Bổ sung thông tin RouterOS nếu có lỗi liên quan đến firmware
      if (source === "connection" || source === "firmware") {
        if (device.routerOsVersion) {
          enhancedMessage += ` (RouterOS: ${device.routerOsVersion})`;

          // Thử kiểm tra thông tin phiên bản RouterOS
          try {
            const routerOsInfo = await deviceInfoService.getRouterOSInfo(
              device.routerOsVersion,
            );

            if (
              typeof routerOsInfo === "object" &&
              "release_date" in routerOsInfo &&
              !("error" in routerOsInfo)
            ) {
              enhancedMessage += ` - Released: ${routerOsInfo.release_date}`;
            }
          } catch (versionError) {
            console.warn(
              `Could not get RouterOS version info: ${versionError}`,
            );
          }
        }
      }

      const alert: InsertAlert = {
        deviceId,
        timestamp: new Date(),
        severity,
        message: enhancedMessage,
        source,
      };

      await storage.createAlert(alert);
      console.log(
        `Created new alert for device ${deviceId}: ${enhancedMessage}`,
      );
    } catch (error) {
      console.error(`Error creating alert for device ${deviceId}:`, error);
    }
  }

  private async collectInterfaceStats(deviceId: number): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new Error(`No connection to device ${deviceId}`);
    }

    try {
      // Lấy danh sách interfaces
      const interfaceData = await client.executeCommand("/interface/print");

      if (!Array.isArray(interfaceData)) {
        throw new Error("Invalid interface data format");
      }

      // Tạo cảnh báo nếu không có interfaces
      if (interfaceData.length === 0) {
        await this.createAlert(
          deviceId,
          alertSeverity.WARNING,
          "No interfaces found on device",
          "interface",
        );
        return;
      }

      // Lấy interfaces hiện có
      const existingInterfaces = await storage.getInterfaces(deviceId);

      for (const iface of interfaceData) {
        // Kiểm tra interface đã tồn tại
        const existingInterface = existingInterfaces.find(
          (i) => i.name === iface.name,
        );

        // Chuyển đổi các giá trị string booleans sang boolean thực
        let isRunning = iface.running === "true" || iface.running === true;
        const isDisabled = iface.disabled === "true" || iface.disabled === true;

        // Xử lý đặc biệt cho interface CAP (CAPsMAN Access Point)
        // Kiểm tra nếu là CAP interface, nhưng chỉ đánh dấu đang chạy nếu thực sự đang chạy
        const isCAPInterface =
          iface.type === "cap" ||
          iface.type === "CAP" ||
          (iface.name &&
            (iface.name.toLowerCase().includes("cap") ||
              iface.name.toLowerCase().includes("wlan")));

        // Kiểm tra giá trị running và chỉ đặt là true khi nó thực sự đang chạy
        // Không tự động đánh dấu CAP interfaces đang chạy nếu chúng không chạy
        if (isCAPInterface) {
          console.log(
            `CAP interface ${iface.name} - actual running status: ${isRunning}`,
          );
        }

        if (existingInterface) {
          // Hàm để chuyển đổi an toàn từ string sang number
          const safeParseInt = (
            value: string | null | undefined,
            defaultValue = 0,
          ): number => {
            if (!value) return defaultValue;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
          };

          // Cập nhật interface
          await storage.updateInterface(existingInterface.id, {
            type: iface.type || "unknown",
            macAddress: iface["mac-address"] || "00:00:00:00:00:00",
            comment: iface.comment || "",
            disabled: isDisabled,
            running: isRunning,
            isUp: isRunning && !isDisabled, // Đặt isUp dựa trên running và disabled
            speed:
              iface["tx-speed"] ||
              iface["speed"] ||
              (isRunning ? "1Gbps" : null),
            mtu: safeParseInt(iface.mtu, 1500),
            rxBytes: safeParseInt(iface["rx-byte"]),
            txBytes: safeParseInt(iface["tx-byte"]),
            lastLinkUpTime: iface["last-link-up-time"] || null,
            linkDowns: safeParseInt(iface["link-downs"]),
            txPackets: safeParseInt(iface["tx-packets"]),
            rxPackets: safeParseInt(iface["rx-packets"]),
            txDrops: safeParseInt(iface["tx-drops"]),
            rxErrors: safeParseInt(iface["rx-errors"]),
            txErrors: safeParseInt(iface["tx-errors"]),
            rxDrops: safeParseInt(iface["rx-drops"]),
          });

          // Tạo cảnh báo nếu interface down
          if (!isRunning && !isDisabled) {
            await this.createAlert(
              deviceId,
              alertSeverity.WARNING,
              `Interface ${iface.name} is down`,
              "interface",
            );
          }
        } else {
          // Hàm để chuyển đổi an toàn từ string sang number
          const safeParseInt = (
            value: string | null | undefined,
            defaultValue = 0,
          ): number => {
            if (!value) return defaultValue;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
          };

          // Tạo interface mới
          const newInterface: InsertInterface = {
            deviceId,
            name: iface.name || "unknown",
            type: iface.type || "unknown",
            macAddress: iface["mac-address"] || "00:00:00:00:00:00",
            comment: iface.comment || "",
            disabled: isDisabled,
            running: isRunning,
            isUp: isRunning && !isDisabled, // Đặt isUp dựa trên running và disabled
            speed:
              iface["tx-speed"] ||
              iface["speed"] ||
              (isRunning ? "1Gbps" : null),
            mtu: safeParseInt(iface.mtu, 1500),
            rxBytes: safeParseInt(iface["rx-byte"]),
            txBytes: safeParseInt(iface["tx-byte"]),
            lastLinkUpTime: iface["last-link-up-time"] || null,
            linkDowns: safeParseInt(iface["link-downs"]),
            txPackets: safeParseInt(iface["tx-packets"]),
            rxPackets: safeParseInt(iface["rx-packets"]),
            txDrops: safeParseInt(iface["tx-drops"]),
            rxErrors: safeParseInt(iface["rx-errors"]),
            txErrors: safeParseInt(iface["tx-errors"]),
            rxDrops: safeParseInt(iface["rx-drops"]),
          };

          const createdInterface = await storage.createInterface(newInterface);

          // Tạo cảnh báo nếu interface down
          if (!isRunning && !isDisabled) {
            await this.createAlert(
              deviceId,
              alertSeverity.WARNING,
              `Interface ${iface.name} is down`,
              "interface",
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `Error collecting interface stats for device ${deviceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Parse RouterOS uptime string to milliseconds
   * Example: "4w6h46m50s" -> 2608010000
   */
  public parseUptime(uptimeStr: string): number {
    try {
      const regex = /(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
      const matches = uptimeStr.match(regex);
      if (!matches) return 0;

      const weeks = parseInt(matches[1] || "0") * 7 * 24 * 60 * 60 * 1000;
      const days = parseInt(matches[2] || "0") * 24 * 60 * 60 * 1000;
      const hours = parseInt(matches[3] || "0") * 60 * 60 * 1000;
      const minutes = parseInt(matches[4] || "0") * 60 * 1000;
      const seconds = parseInt(matches[5] || "0") * 1000;

      return weeks + days + hours + minutes + seconds;
    } catch (error) {
      console.error(`Error parsing uptime: ${uptimeStr}`, error);
      return 0;
    }
  }

  private async collectFirewallRules(deviceId: number): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new Error(`No connection to device ${deviceId}`);
    }

    try {
      console.log(`Collecting firewall rules for device ${deviceId}...`);

      // Thu thập luật tường lửa từ filter chi tiết
      try {
        const filterRules = await client.executeCommand(
          "/ip/firewall/filter/print",
          [{ detail: "" }],
        );

        if (Array.isArray(filterRules)) {
          // Đếm số lượng luật đang kích hoạt và bị vô hiệu hóa
          let activeRules = 0;
          let disabledRules = 0;
          let dropRules = 0;
          let rejectRules = 0;
          let acceptRules = 0;

          // Phân tích dữ liệu chi tiết về các luật
          for (const rule of filterRules) {
            console.log(`Filter rule:`, rule);

            if (rule.disabled === "true" || rule.disabled === true) {
              disabledRules++;
            } else {
              activeRules++;

              // Phân loại theo action
              if (rule.action === "drop") {
                dropRules++;
              } else if (rule.action === "reject") {
                rejectRules++;
              } else if (rule.action === "accept") {
                acceptRules++;
              }
            }
          }

          console.log(
            `Device ${deviceId} has ${activeRules} active and ${disabledRules} disabled firewall filter rules`,
          );
          console.log(
            `Actions breakdown: ${acceptRules} accept, ${dropRules} drop, ${rejectRules} reject`,
          );

          // Nếu có interface cho security trong ứng dụng, có thể gửi dữ liệu tổng hợp về
          // storage.updateFirewallStats(deviceId, {
          //   activeFilterRules: activeRules,
          //   disabledFilterRules: disabledRules,
          //   dropRules,
          //   rejectRules,
          //   acceptRules
          // });
        }
      } catch (filterError) {
        console.warn(`Error collecting filter rules:`, filterError);
      }

      // Thu thập luật tường lửa từ nat chi tiết
      try {
        const natRules = await client.executeCommand("/ip/firewall/nat/print", [
          { detail: "" },
        ]);

        if (Array.isArray(natRules)) {
          // Đếm số lượng luật NAT đang kích hoạt và bị vô hiệu hóa
          let activeNatRules = 0;
          let disabledNatRules = 0;
          let dstnatRules = 0;
          let srcnatRules = 0;
          let masqueradeRules = 0;

          for (const rule of natRules) {
            console.log(`NAT rule:`, rule);

            if (rule.disabled === "true" || rule.disabled === true) {
              disabledNatRules++;
            } else {
              activeNatRules++;

              // Phân loại theo chain
              if (rule.chain === "dstnat") {
                dstnatRules++;
              } else if (rule.chain === "srcnat") {
                srcnatRules++;

                // Kiểm tra nếu là masquerade
                if (rule.action === "masquerade") {
                  masqueradeRules++;
                }
              }
            }
          }

          console.log(
            `Device ${deviceId} has ${activeNatRules} active and ${disabledNatRules} disabled firewall NAT rules`,
          );
          console.log(
            `NAT breakdown: ${dstnatRules} DSTNAT, ${srcnatRules} SRCNAT (${masqueradeRules} masquerade)`,
          );
        }
      } catch (natError) {
        console.warn(`Error collecting NAT rules:`, natError);
      }

      // Thu thập thông tin về Address List
      try {
        const addressLists = await client.executeCommand(
          "/ip/firewall/address-list/print",
        );

        if (Array.isArray(addressLists)) {
          // Nhóm theo danh sách và đếm
          const listCounts = new Map<string, number>();

          for (const entry of addressLists) {
            const listName = entry.list || "unknown";
            listCounts.set(listName, (listCounts.get(listName) || 0) + 1);
          }

          // Hiển thị thông tin
          console.log(`Address list statistics:`);
          // Sử dụng Array.from để khắc phục lỗi với '--downlevelIteration'
          Array.from(listCounts.entries()).forEach(([list, count]) => {
            console.log(`- ${list}: ${count} entries`);
          });
        }
      } catch (addrError) {
        console.warn(`Error collecting address lists:`, addrError);
      }

      // Thu thập thông tin về Connection Tracking
      try {
        const connections = await client.executeCommand(
          "/ip/firewall/connection/print",
          [{ "count-only": "" }],
        );

        console.log(`Active connections:`, connections);

        // Lấy thống kê chi tiết về kết nối
        const connectionStats = await client.executeCommand(
          "/ip/firewall/connection/print",
          [{ stats: "" }],
        );

        console.log(`Connection statistics:`, connectionStats);
      } catch (connError) {
        console.warn(`Error collecting connection stats:`, connError);
      }
    } catch (error) {
      console.error(
        `Error collecting firewall rules for device ${deviceId}:`,
        error,
      );
      // Không ném lỗi, tiếp tục thu thập dữ liệu khác
    }
  }

  private async collectVpnConnections(deviceId: number): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new Error(`No connection to device ${deviceId}`);
    }

    try {
      console.log(`Collecting VPN connections for device ${deviceId}...`);

      // Thu thập thông tin cấu hình VPN
      let vpnStats = {
        totalActive: 0,
        pptp: {
          active: 0,
          configured: 0,
          details: [] as any[],
        },
        l2tp: {
          active: 0,
          configured: 0,
          details: [] as any[],
        },
        sstp: {
          active: 0,
          configured: 0,
          details: [] as any[],
        },
        ovpn: {
          active: 0,
          configured: 0,
          details: [] as any[],
        },
      };

      // Kiểm tra cấu hình PPTP
      try {
        // Lấy thông tin cấu hình PPTP server
        const pptpConfig = await client.executeCommand(
          "/interface/pptp-server/server/print",
        );
        if (Array.isArray(pptpConfig)) {
          console.log(`PPTP server configuration:`, pptpConfig);

          // Kiểm tra xem PPTP server có được kích hoạt không
          const pptpEnabled =
            pptpConfig.length > 0 && pptpConfig[0].enabled === "true";
          console.log(`PPTP server enabled: ${pptpEnabled}`);

          if (pptpEnabled) {
            // Lấy danh sách kết nối PPTP hiện tại
            const pptpConns = await client.executeCommand(
              "/interface/pptp-server/print",
              [{ detail: "" }],
            );

            if (Array.isArray(pptpConns)) {
              vpnStats.pptp.active = pptpConns.length;
              vpnStats.pptp.details = pptpConns;
              vpnStats.totalActive += pptpConns.length;

              console.log(
                `Device ${deviceId} has ${pptpConns.length} PPTP server connections`,
              );
              pptpConns.forEach((conn, idx) => {
                console.log(`PPTP connection ${idx + 1}:`, conn);
              });
            }

            // Lấy danh sách tài khoản PPTP
            try {
              const pptpSecrets = await client.executeCommand(
                "/ppp/secret/print",
                [{ where: "service=pptp" }],
              );

              if (Array.isArray(pptpSecrets)) {
                vpnStats.pptp.configured = pptpSecrets.length;
                console.log(
                  `Device ${deviceId} has ${pptpSecrets.length} PPTP accounts configured`,
                );
              }
            } catch (secretErr) {
              console.warn(`Error getting PPTP secrets:`, secretErr);
            }
          }
        }
      } catch (error) {
        console.warn(
          `Error collecting PPTP server info for device ${deviceId}:`,
          error,
        );
      }

      // Kiểm tra cấu hình L2TP
      try {
        // Lấy thông tin cấu hình L2TP server
        const l2tpConfig = await client.executeCommand(
          "/interface/l2tp-server/server/print",
        );
        if (Array.isArray(l2tpConfig)) {
          console.log(`L2TP server configuration:`, l2tpConfig);

          // Kiểm tra xem L2TP server có được kích hoạt không
          const l2tpEnabled =
            l2tpConfig.length > 0 && l2tpConfig[0].enabled === "true";
          console.log(`L2TP server enabled: ${l2tpEnabled}`);

          if (l2tpEnabled) {
            // Lấy danh sách kết nối L2TP hiện tại
            const l2tpConns = await client.executeCommand(
              "/interface/l2tp-server/print",
              [{ detail: "" }],
            );

            if (Array.isArray(l2tpConns)) {
              vpnStats.l2tp.active = l2tpConns.length;
              vpnStats.l2tp.details = l2tpConns;
              vpnStats.totalActive += l2tpConns.length;

              console.log(
                `Device ${deviceId} has ${l2tpConns.length} L2TP server connections`,
              );
              l2tpConns.forEach((conn, idx) => {
                console.log(`L2TP connection ${idx + 1}:`, conn);
              });
            }

            // Lấy danh sách tài khoản L2TP
            try {
              const l2tpSecrets = await client.executeCommand(
                "/ppp/secret/print",
                [{ where: "service=l2tp" }],
              );

              if (Array.isArray(l2tpSecrets)) {
                vpnStats.l2tp.configured = l2tpSecrets.length;
                console.log(
                  `Device ${deviceId} has ${l2tpSecrets.length} L2TP accounts configured`,
                );
              }
            } catch (secretErr) {
              console.warn(`Error getting L2TP secrets:`, secretErr);
            }
          }
        }
      } catch (error) {
        console.warn(
          `Error collecting L2TP server info for device ${deviceId}:`,
          error,
        );
      }

      // Kiểm tra cấu hình SSTP
      try {
        // Lấy thông tin cấu hình SSTP server
        const sstpConfig = await client.executeCommand(
          "/interface/sstp-server/server/print",
        );
        if (Array.isArray(sstpConfig)) {
          console.log(`SSTP server configuration:`, sstpConfig);

          // Kiểm tra xem SSTP server có được kích hoạt không
          const sstpEnabled =
            sstpConfig.length > 0 && sstpConfig[0].enabled === "true";
          console.log(`SSTP server enabled: ${sstpEnabled}`);

          if (sstpEnabled) {
            // Lấy danh sách kết nối SSTP hiện tại
            const sstpConns = await client.executeCommand(
              "/interface/sstp-server/print",
              [{ detail: "" }],
            );

            if (Array.isArray(sstpConns)) {
              vpnStats.sstp.active = sstpConns.length;
              vpnStats.sstp.details = sstpConns;
              vpnStats.totalActive += sstpConns.length;

              console.log(
                `Device ${deviceId} has ${sstpConns.length} SSTP server connections`,
              );
              sstpConns.forEach((conn, idx) => {
                console.log(`SSTP connection ${idx + 1}:`, conn);
              });
            }

            // Lấy danh sách tài khoản SSTP
            try {
              const sstpSecrets = await client.executeCommand(
                "/ppp/secret/print",
                [{ where: "service=sstp" }],
              );

              if (Array.isArray(sstpSecrets)) {
                vpnStats.sstp.configured = sstpSecrets.length;
                console.log(
                  `Device ${deviceId} has ${sstpSecrets.length} SSTP accounts configured`,
                );
              }
            } catch (secretErr) {
              console.warn(`Error getting SSTP secrets:`, secretErr);
            }
          }
        }
      } catch (error) {
        console.warn(
          `Error collecting SSTP server info for device ${deviceId}:`,
          error,
        );
      }

      // Kiểm tra cấu hình OpenVPN
      try {
        // Lấy thông tin cấu hình OpenVPN server
        const ovpnServers = await client.executeCommand(
          "/interface/ovpn-server/server/print",
        );
        if (Array.isArray(ovpnServers)) {
          console.log(`OpenVPN server configuration:`, ovpnServers);

          // Đếm số lượng máy chủ OpenVPN được kích hoạt
          const ovpnEnabled =
            ovpnServers.filter((s) => s.enabled === "true").length > 0;
          console.log(`OpenVPN server enabled: ${ovpnEnabled}`);

          if (ovpnEnabled) {
            // Lấy danh sách kết nối OpenVPN hiện tại
            const ovpnConns = await client.executeCommand(
              "/interface/ovpn-server/print",
              [{ detail: "" }],
            );

            if (Array.isArray(ovpnConns)) {
              vpnStats.ovpn.active = ovpnConns.length;
              vpnStats.ovpn.details = ovpnConns;
              vpnStats.totalActive += ovpnConns.length;

              console.log(
                `Device ${deviceId} has ${ovpnConns.length} OpenVPN server connections`,
              );
              ovpnConns.forEach((conn, idx) => {
                console.log(`OpenVPN connection ${idx + 1}:`, conn);
              });
            }
          }
        }
      } catch (error) {
        console.warn(
          `Error collecting OpenVPN server info for device ${deviceId}:`,
          error,
        );
      }

      // Tổng kết về các kết nối VPN
      console.log(`VPN connection summary for device ${deviceId}:`, vpnStats);
      console.log(`Total active VPN connections: ${vpnStats.totalActive}`);

      // Lưu cập nhật thông tin vào cơ sở dữ liệu (nếu cần)
      // await storage.updateVpnStats(deviceId, vpnStats);
    } catch (error) {
      console.error(
        `Error collecting VPN connections for device ${deviceId}:`,
        error,
      );
      // Không ném lỗi, tiếp tục thu thập dữ liệu khác
    }
  }

  // Phương thức để phát hiện thiết bị MikroTik trên mạng
  public async discoverDevices(subnet: string): Promise<number> {
    console.log(`Starting device discovery on subnet ${subnet}...`);

    try {
      // Phân tích subnet
      const baseIp = subnet.split("/")[0];
      const parts = baseIp.split(".");
      const networkPrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;

      // Số lượng thiết bị được tìm thấy
      let devicesFound = 0;

      // Quét subnet
      for (let i = 1; i < 255; i++) {
        const ipToCheck = `${networkPrefix}.${i}`;

        // Kiểm tra xem thiết bị đã tồn tại trong CSDL chưa
        const existingDevice = await storage.getDeviceByIp(ipToCheck);
        if (existingDevice) {
          console.log(
            `Device at ${ipToCheck} already exists in database, skipping...`,
          );
          continue;
        }

        try {
          // Kiểm tra xem IP này có phải là thiết bị MikroTik không
          const isMikrotik = await this.checkIfMikrotik(
            ipToCheck,
            "admin",
            "admin",
          );

          if (isMikrotik) {
            console.log(`Found MikroTik device at ${ipToCheck}`);

            // Lấy thông tin cơ bản về thiết bị
            let deviceModel = null;
            let routerOsVersion = null;

            try {
              // Thử kết nối để lấy thông tin model
              const tempClient = new MikrotikClient(
                ipToCheck,
                "admin",
                "admin",
              );
              tempClient.setPort(8728);
              const connected = await tempClient.connect(5000);

              if (connected) {
                const resourcesData = await tempClient.executeCommand(
                  "/system/resource/print",
                );
                if (Array.isArray(resourcesData) && resourcesData.length > 0) {
                  deviceModel =
                    resourcesData[0].board || resourcesData[0]["board-name"];
                  routerOsVersion = resourcesData[0].version;
                }
                await tempClient.disconnect();
              }
            } catch (modelError) {
              console.warn(
                `Could not get model info for device at ${ipToCheck}:`,
                modelError,
              );
            }

            // Tạo thiết bị mới trong CSDL với thông tin cơ bản
            const newDevice: InsertDevice = {
              name: `MikroTik-${ipToCheck}`,
              ipAddress: ipToCheck,
              username: "admin", // Tên người dùng mặc định
              password: "password", // Mật khẩu mặc định, nên thay đổi
              // Các trường này sẽ được tạo tự động bởi storage
              model: deviceModel,
              serialNumber: null,
              routerOsVersion: routerOsVersion,
              firmware: null,
              cpu: null,
              totalMemory: null,
              storage: null,
              hasCAPsMAN: false,
              hasWireless: false,
            };

            const createdDevice = await storage.createDevice(newDevice);

            // Nếu có model, thử lấy thêm thông tin từ trang web MikroTik
            if (deviceModel) {
              try {
                console.log(
                  `Enriching device information for model ${deviceModel}...`,
                );
                const enrichedDevice =
                  await deviceInfoService.enrichDeviceInfo(createdDevice);

                if (enrichedDevice !== createdDevice) {
                  await storage.updateDevice(createdDevice.id, enrichedDevice);
                  console.log(
                    `Updated device ${createdDevice.id} with enriched information`,
                  );
                }
              } catch (enrichError) {
                console.warn(
                  `Could not enrich device info for ${deviceModel}:`,
                  enrichError,
                );
              }
            }

            devicesFound++;
          }
        } catch (error) {
          // Bỏ qua lỗi và tiếp tục quét
          continue;
        }
      }

      return devicesFound;
    } catch (error) {
      console.error(`Error discovering devices:`, error);
      return 0;
    }
  }

  private async checkIfMikrotik(
    ipAddress: string,
    username: string,
    password: string,
  ): Promise<boolean> {
    const testClient = new MikrotikClient(ipAddress, username, password);

    // Thử kết nối với các cổng API của MikroTik
    const ports = [8728, 8729, 80, 443];

    for (const port of ports) {
      testClient.setPort(port);

      try {
        // Sử dụng timeout ngắn để tăng tốc độ quét
        const connected = await testClient.connect(5000);

        if (connected) {
          // Thử thực hiện một lệnh đơn giản để xác nhận đây là thiết bị MikroTik
          try {
            const result = await testClient.executeCommand(
              "/system/resource/print",
            );
            if (Array.isArray(result) && result.length > 0) {
              // Đây là thiết bị MikroTik
              await testClient.disconnect();
              return true;
            }
          } catch (cmdError) {
            // Không phải thiết bị MikroTik
            await testClient.disconnect();
            return false;
          }
        }
      } catch (error) {
        // Bỏ qua lỗi và tiếp tục với cổng khác
        continue;
      }
    }

    return false;
  }
}

// Xuất một thể hiện duy nhất của dịch vụ MikroTik
export const mikrotikService = new MikrotikService();

// Lấy thông tin thiết bị MikroTik
// Đã chuyển hàm này xuống dưới

// Lấy danh sách DHCP lease từ thiết bị MikroTik
/**
 * Lấy danh sách tất cả các thiết bị MikroTik
 */
export async function getMikrotikDevices(): Promise<any[]> {
  try {
    // Sử dụng storage.getAllDevices()
    const allDevices = await storage.getAllDevices();
    // Lọc các thiết bị có loại 'router'
    return allDevices.filter((device) => device.deviceType === "router");
  } catch (error) {
    console.error("Error getting MikroTik devices:", error);
    return [];
  }
}

/**
 * Lấy thiết bị MikroTik theo ID
 */
export async function getMikrotikDevice(deviceId: number): Promise<any> {
  try {
    return await storage.getDevice(deviceId);
  } catch (error) {
    console.error(`Error getting MikroTik device ${deviceId}:`, error);
    return null;
  }
}

/**
 * Lấy danh sách các thiết bị láng giềng của một thiết bị MikroTik
 * (bao gồm các thiết bị từ ARP table và DHCP leases)
 */
export async function getNetworkNeighbors(deviceId: number): Promise<any[]> {
  try {
    // Lấy thông tin thiết bị
    const device = await getMikrotikDevice(deviceId);
    if (!device) {
      console.error(`Cannot find device with ID ${deviceId}`);
      return [];
    }

    const neighbors: any[] = [];
    const macAddresses = new Set<string>();

    // Lấy bản ghi ARP
    console.log(
      `Lấy ARP entries từ thiết bị ${deviceId} (${device.ipAddress})`,
    );
    const arpEntries = await getArpTable(deviceId);
    console.log(
      `Lấy được ${arpEntries.length} ARP entries từ thiết bị ${deviceId}`,
    );

    // In ra thông tin chi tiết nếu có
    if (arpEntries.length > 0) {
      console.log(
        `Sample ARP entry from getNetworkNeighbors: ${JSON.stringify(arpEntries[0])}`,
      );
    }

    for (const entry of arpEntries) {
      if (entry.macAddress && !macAddresses.has(entry.macAddress)) {
        macAddresses.add(entry.macAddress);
        neighbors.push({
          ipAddress: entry.address,
          macAddress: entry.macAddress,
          interface: entry.interface,
          source: "arp",
          deviceId: deviceId,
        });
      }
    }

    // Lấy DHCP leases
    console.log(
      `Lấy DHCP leases từ thiết bị ${deviceId} (${device.ipAddress})`,
    );
    const dhcpLeases = await getDhcpLeases(deviceId);
    console.log(
      `Lấy được ${dhcpLeases.length} DHCP leases từ thiết bị ${deviceId}`,
    );

    // In ra thông tin chi tiết nếu có
    if (dhcpLeases.length > 0) {
      console.log(
        `Sample DHCP lease from getNetworkNeighbors: ${JSON.stringify(dhcpLeases[0])}`,
      );
    }

    for (const lease of dhcpLeases) {
      if (lease.macAddress && !macAddresses.has(lease.macAddress)) {
        macAddresses.add(lease.macAddress);
        neighbors.push({
          ipAddress: lease.address,
          macAddress: lease.macAddress,
          hostName: lease.hostName,
          source: "dhcp",
          deviceId: deviceId,
        });
      }
    }

    console.log(
      `Tổng cộng phát hiện ${neighbors.length} thiết bị láng giềng từ thiết bị ${deviceId}`,
    );
    return neighbors;
  } catch (error) {
    console.error(
      `Error getting network neighbors for device ${deviceId}:`,
      error,
    );
    return [];
  }
}

/**
 * Lấy danh sách các bản ghi ARP từ thiết bị MikroTik
 */
export async function getArpEntries(deviceId: number): Promise<ArpEntry[]> {
  try {
    const mikrotikService = new MikrotikService();

    // Kết nối đến thiết bị
    let connected = await mikrotikService.connectToDevice(deviceId);
    if (!connected) {
      console.error(`Could not connect to device ${deviceId}`);
      return [];
    }

    // Gửi lệnh để lấy bảng ARP
    const arpEntries = await mikrotikService.sendCommand(
      deviceId,
      "/ip/arp/print",
    );

    if (!Array.isArray(arpEntries)) {
      console.error("Invalid ARP entries response format");
      return [];
    }

    console.log(
      `Found ${arpEntries.length} ARP entries for device ${deviceId}`,
    );

    // In ra thông tin chi tiết nếu có
    if (arpEntries.length > 0) {
      console.log(`Sample ARP entry: ${JSON.stringify(arpEntries[0])}`);
    }

    return arpEntries.map(
      (entry: any): ArpEntry => ({
        id: entry[".id"] || "",
        address: entry.address || "",
        macAddress: entry["mac-address"] || "",
        interface: entry.interface || "",
        complete: entry.complete || "",
        disabled: entry.disabled || "",
        dynamic: entry.dynamic || "",
        invalid: entry.invalid || "",
        lastSeen: new Date(),
        deviceId: deviceId, // Thêm deviceId để biết thiết bị nguồn
      }),
    );
  } catch (error) {
    console.error(`Error getting ARP entries from device ${deviceId}:`, error);
    return [];
  }
}

/**
 * Lấy danh sách DHCP leases từ thiết bị MikroTik theo ID
 */
export async function getDhcpLeases(deviceId: number): Promise<DhcpLease[]> {
  try {
    const mikrotikService = new MikrotikService();

    // Kết nối đến thiết bị
    let connected = await mikrotikService.connectToDevice(deviceId);
    if (!connected) {
      console.error(`Could not connect to device ${deviceId}`);
      return [];
    }

    // Gửi lệnh để lấy danh sách DHCP leases
    const leases = await mikrotikService.sendCommand(
      deviceId,
      "/ip/dhcp-server/lease/print",
    );

    if (!Array.isArray(leases)) {
      console.error("Invalid DHCP leases response format");
      return [];
    }

    console.log(`Found ${leases.length} DHCP leases for device ${deviceId}`);

    // In ra thông tin chi tiết nếu có
    if (leases.length > 0) {
      console.log(`Sample DHCP lease: ${JSON.stringify(leases[0])}`);
    }

    return leases.map(
      (lease: any): DhcpLease => ({
        id: lease[".id"] || "",
        address: lease.address || "",
        macAddress: lease["mac-address"] || "",
        clientId: lease["client-id"] || "",
        hostName: lease["host-name"] || "",
        comment: lease.comment || "",
        status: lease.status || "unknown",
        server: lease.server || "",
        disabled: lease.disabled === "true",
        dynamic: lease.dynamic === "true",
        blocked: lease.blocked === "true",
        lastSeen: new Date(),
        deviceId: deviceId, // Thêm deviceId để biết thiết bị nguồn
      }),
    );
  } catch (error) {
    console.error(`Error getting DHCP leases from device ${deviceId}:`, error);
    return [];
  }
}

/**
 * Lấy danh sách DHCP leases từ thiết bị MikroTik (phiên bản cũ)
 */
export async function getDhcpLeasesFromDevice(deviceId: number) {
  try {
    // Sử dụng lại hàm getDhcpLeases đã được chuẩn hóa
    return await getDhcpLeases(deviceId);
  } catch (error) {
    console.error(`Error getting DHCP leases from device ${deviceId}:`, error);
    return [];
  }
}

// Lấy danh sách ARP từ thiết bị MikroTik
export async function getArpTable(deviceId: number) {
  try {
    const mikrotikService = new MikrotikService();

    // Kết nối đến thiết bị
    let connected = await mikrotikService.connectToDevice(deviceId);
    if (!connected) {
      console.error(`Could not connect to device ${deviceId}`);
      return [];
    }

    // Gửi lệnh để lấy bảng ARP
    const arpEntries = await mikrotikService.sendCommand(
      deviceId,
      "/ip/arp/print",
    );

    if (!Array.isArray(arpEntries)) {
      console.error("Invalid ARP entries response format");
      return [];
    }

    console.log(
      `Found ${arpEntries.length} ARP entries for device ${deviceId}`,
    );

    return arpEntries.map((entry: any) => ({
      id: entry[".id"] || "",
      address: entry["address"] || "",
      macAddress: entry["mac-address"] || "",
      interface: entry["interface"] || "",
      complete: entry["complete"] === "true",
      disabled: entry["disabled"] === "true",
      dynamic: entry["dynamic"] === "true",
      invalid: entry["invalid"] === "true",
      lastSeen: new Date(),
      deviceId: deviceId, // Thêm deviceId để biết thiết bị nguồn
    }));
  } catch (error) {
    console.error(`Error getting ARP table from device ${deviceId}:`, error);
    return [];
  }
}
