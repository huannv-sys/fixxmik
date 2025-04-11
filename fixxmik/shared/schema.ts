import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Phân quyền - xác định vai trò người dùng
export const roleEnum = pgEnum('role', ['admin', 'operator', 'viewer']);

// Users table - lưu thông tin người dùng
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // lưu password hash
  email: text("email").unique(),
  fullName: text("full_name"),
  role: roleEnum("role").notNull().default('viewer'),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Sessions table - lưu thông tin phiên đăng nhập
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(), // JWT token hoặc session token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// User Activity Logs - ghi lại hoạt động người dùng
export const userLogs = pgTable("user_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // LOGIN, LOGOUT, UPDATE, DELETE, etc.
  target: text("target"), // đối tượng tương tác - device, user, etc.
  targetId: integer("target_id"), // id của đối tượng
  details: text("details"), // chi tiết thêm
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: text("ip_address"),
});

// Define Zod schemas for user-related models
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserLogSchema = createInsertSchema(userLogs).omit({
  id: true,
  timestamp: true,
});

// Device table - stores information about Mikrotik devices
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  model: text("model"),
  serialNumber: text("serial_number"),
  routerOsVersion: text("router_os_version"),
  firmware: text("firmware"),
  cpu: text("cpu"),
  totalMemory: text("total_memory"),
  storage: text("storage"),
  lastSeen: timestamp("last_seen"),
  isOnline: boolean("is_online").default(false),
  uptime: text("uptime"),
  hasCAPsMAN: boolean("has_capsman").default(false),
  hasWireless: boolean("has_wireless").default(false),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
  isOnline: true,
  uptime: true,
  hasCAPsMAN: true,
  hasWireless: true,
});

// Metrics table - stores time-series performance metrics
export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  cpuLoad: real("cpu_load"),            // Renamed from cpuUsage to match router API
  memoryUsed: real("memory_used"),      // Renamed from memoryUsage to match router API
  uptime: text("uptime"),               // Added to store device uptime as text
  temperature: real("temperature"),
  totalMemory: real("total_memory"),
  uploadBandwidth: real("upload_bandwidth"),
  downloadBandwidth: real("download_bandwidth"),
  boardTemp: real("board_temp"),
  
  // Legacy fields for backward compatibility
  cpuUsage: real("cpu_usage"),
  memoryUsage: real("memory_usage"),
});

export const insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
});

// Interfaces table - stores information about network interfaces
export const interfaces = pgTable("interfaces", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  name: text("name").notNull(),
  type: text("type"),
  speed: text("speed"),
  isUp: boolean("is_up").default(false),
  running: boolean("running").default(false),
  disabled: boolean("disabled").default(false),
  macAddress: text("mac_address"),
  mtu: integer("mtu"),
  comment: text("comment"),
  txBytes: real("tx_bytes").default(0),
  rxBytes: real("rx_bytes").default(0),
  txPackets: integer("tx_packets").default(0),
  rxPackets: integer("rx_packets").default(0),
  txDrops: integer("tx_drops").default(0),
  rxDrops: integer("rx_drops").default(0),
  txErrors: integer("tx_errors").default(0),
  rxErrors: integer("rx_errors").default(0),
  linkDowns: integer("link_downs").default(0),
  healthScore: integer("health_score"),
  lastLinkUpTime: text("last_link_up_time"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertInterfaceSchema = createInsertSchema(interfaces).omit({
  id: true,
});

// Alerts table - stores system alerts
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  severity: text("severity").notNull(), // error, warning, info
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  acknowledged: boolean("acknowledged").default(false),
  source: text("source"),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  acknowledged: true,
});

// Alert Types (for frontend display)
export const alertSeverity = {
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
} as const;

// Wireless Interfaces table - stores information about wireless interfaces
export const wirelessInterfaces = pgTable("wireless_interfaces", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  interfaceId: integer("interface_id"),
  name: text("name").notNull(),
  macAddress: text("mac_address"),
  ssid: text("ssid"),
  band: text("band"), // 2ghz-b/g/n, 5ghz-a/n/ac
  channel: text("channel"),
  frequency: integer("frequency"),
  channelWidth: text("channel_width"),
  noiseFloor: integer("noise_floor"),
  txPower: real("tx_power"),
  signalStrength: real("signal_strength"),
  mode: text("mode"), // ap, station, bridge
  running: boolean("running").default(false),
  disabled: boolean("disabled").default(false),
  clients: integer("clients").default(0),
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertWirelessInterfaceSchema = createInsertSchema(wirelessInterfaces).omit({
  id: true,
  lastUpdated: true,
});

// CAPsMAN Access Points table - stores information about CAPsMAN managed APs
export const capsmanAPs = pgTable("capsman_aps", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(), // Controller device ID
  name: text("name").notNull(),
  macAddress: text("mac_address").notNull(),
  identity: text("identity"),
  model: text("model"),
  serialNumber: text("serial_number"),
  version: text("version"),
  radioName: text("radio_name"),
  radioMac: text("radio_mac"),
  state: text("state"), // running, disabled, etc.
  ipAddress: text("ip_address"),
  clients: integer("clients").default(0),
  uptime: text("uptime"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const insertCapsmanAPSchema = createInsertSchema(capsmanAPs).omit({
  id: true,
  lastSeen: true,
});

// CAPsMAN clients/wireless users
export const capsmanClients = pgTable("capsman_clients", {
  id: serial("id").primaryKey(),
  apId: integer("ap_id").notNull(),
  deviceId: integer("device_id").notNull(),
  macAddress: text("mac_address").notNull(),
  ipAddress: text("ip_address"),
  hostname: text("hostname"),
  signalStrength: real("signal_strength"),
  txRate: text("tx_rate"),
  rxRate: text("rx_rate"),
  connectedTime: text("connected_time"),
  username: text("username"),
  interface: text("interface"),
  lastActivity: timestamp("last_activity").defaultNow(),
});

export const insertCapsmanClientSchema = createInsertSchema(capsmanClients).omit({
  id: true,
  lastActivity: true,
});

// Network Discovery - lưu thông tin về các thiết bị được phát hiện
export const deviceRoleEnum = pgEnum('device_role', ['router', 'switch', 'access_point', 'storage', 'server', 'printer', 'camera', 'voice', 'endpoint', 'iot', 'unknown']);

export const networkDevices = pgTable("network_devices", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  macAddress: text("mac_address").notNull(),
  vendor: text("vendor"),
  hostname: text("hostname"),
  deviceType: text("device_type"),
  interface: text("interface"),
  deviceRole: deviceRoleEnum("device_role").default("unknown"),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  txBytes: integer("tx_bytes"),
  rxBytes: integer("rx_bytes"),
  txRate: integer("tx_rate"),
  rxRate: integer("rx_rate"),
  description: text("description"),
  lastUpdateMethod: text("last_update_method"), // 'arp', 'dhcp', 'snmp', 'lldp', 'manual'
  isIdentified: boolean("is_identified").default(false),
  identificationScore: integer("identification_score").default(0),
  deviceData: jsonb("device_data"), // Lưu dữ liệu bổ sung
  metadata: jsonb("metadata"), // Thông tin từ các nguồn khác nhau
  isManaged: boolean("is_managed").default(false), // Thiết bị có được quản lý bởi MMCS không
  isOnline: boolean("is_online").default(false), // Trạng thái online/offline của thiết bị
  managedDeviceId: integer("managed_device_id"), // ID tương ứng trong bảng devices nếu được quản lý
});

// Lưu thông tin về OUI (Organization Unique Identifier) cho nhận diện MAC Address
export const macVendors = pgTable("mac_vendors", {
  id: serial("id").primaryKey(),
  oui: text("oui").notNull().unique(), // 6 ký tự đầu của MAC address (không có dấu ':')
  vendor: text("vendor").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Lưu lịch sử phát hiện thiết bị mạng
export const deviceDiscoveryLog = pgTable("device_discovery_log", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id"), // ID từ bảng networkDevices
  timestamp: timestamp("timestamp").defaultNow(),
  method: text("method").notNull(), // 'arp', 'dhcp', 'snmp', 'scan', v.v.
  sourceIp: text("source_ip"), // IP của thiết bị gửi thông tin phát hiện (ví dụ: router)
  details: jsonb("details"), // Chi tiết về phát hiện
});

export const insertNetworkDeviceSchema = createInsertSchema(networkDevices).omit({
  id: true,
  firstSeen: true,
  lastSeen: true,
  identificationScore: true,
});

export const insertMacVendorSchema = createInsertSchema(macVendors).omit({
  id: true,
  lastUpdated: true,
});

export const insertDeviceDiscoveryLogSchema = createInsertSchema(deviceDiscoveryLog).omit({
  id: true,
  timestamp: true,
});

// Type definitions
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Interface = typeof interfaces.$inferSelect;
export type InsertInterface = z.infer<typeof insertInterfaceSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type WirelessInterface = typeof wirelessInterfaces.$inferSelect;
export type InsertWirelessInterface = z.infer<typeof insertWirelessInterfaceSchema>;
export type CapsmanAP = typeof capsmanAPs.$inferSelect;
export type InsertCapsmanAP = z.infer<typeof insertCapsmanAPSchema>;
export type CapsmanClient = typeof capsmanClients.$inferSelect;
export type InsertCapsmanClient = z.infer<typeof insertCapsmanClientSchema>;
export type AlertSeverity = typeof alertSeverity[keyof typeof alertSeverity];

// Network Discovery Types
export type NetworkDevice = typeof networkDevices.$inferSelect;
export type InsertNetworkDevice = z.infer<typeof insertNetworkDeviceSchema>;
export type MacVendor = typeof macVendors.$inferSelect;
export type InsertMacVendor = z.infer<typeof insertMacVendorSchema>;
export type DeviceDiscoveryLog = typeof deviceDiscoveryLog.$inferSelect;
export type InsertDeviceDiscoveryLog = z.infer<typeof insertDeviceDiscoveryLogSchema>;

// User related types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Login = z.infer<typeof loginUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type UserLog = typeof userLogs.$inferSelect;
export type InsertUserLog = z.infer<typeof insertUserLogSchema>;
export type Role = "admin" | "operator" | "viewer";

// Device Metrics table - lưu thông tin băng thông và hiệu suất thiết bị
export const deviceMetrics = pgTable("device_metrics", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  downloadSpeed: real("download_speed"), // tốc độ tải về (Mbps)
  uploadSpeed: real("upload_speed"), // tốc độ tải lên (Mbps)
  cpuLoad: real("cpu_load"), // % tải CPU
  memoryUsed: real("memory_used"), // % sử dụng bộ nhớ
  diskUsage: real("disk_usage"), // % sử dụng ổ đĩa
  temperature: real("temperature"), // nhiệt độ thiết bị nếu có
  activeSessions: integer("active_sessions"), // số phiên kết nối hoạt động
  metadata: jsonb("metadata"), // dữ liệu bổ sung
});

// Network Traffic Features - lưu thông tin về đặc điểm traffic để phân tích bất thường
export const networkTrafficFeatures = pgTable("network_traffic_features", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  sourceIp: text("source_ip").notNull(),
  destinationIp: text("destination_ip").notNull(),
  sourcePort: integer("source_port"),
  destinationPort: integer("destination_port"),
  protocol: text("protocol"), // TCP, UDP, ICMP, etc.
  bytes: integer("bytes"), // số bytes trong luồng
  packetCount: integer("packet_count"), // số gói tin
  flowDuration: integer("flow_duration"), // thời lượng luồng (ms)
  isAnomaly: boolean("is_anomaly").default(false), // có phải bất thường
  anomalyScore: real("anomaly_score"), // điểm bất thường (0-1)
  anomalyType: text("anomaly_type"), // loại bất thường nếu có
  featuresJson: jsonb("features_json"), // Thông tin đặc trưng cho dự đoán ML
  analyzedAt: timestamp("analyzed_at"),
  additionalFeatures: jsonb("additional_features"), // đặc điểm bổ sung
});

// Lịch sử phát hiện từ IDS
export const idsDetectionHistory = pgTable("ids_detection_history", {
  id: serial("id").primaryKey(),
  trafficFeatureId: integer("traffic_feature_id").references(() => networkTrafficFeatures.id, { onDelete: 'cascade' }),
  deviceId: integer("device_id").references(() => devices.id, { onDelete: 'cascade' }),
  timestamp: timestamp("timestamp").defaultNow(),
  isAnomaly: boolean("is_anomaly").notNull(),
  probability: real("probability").notNull(),
  alertId: integer("alert_id").references(() => alerts.id),
  details: jsonb("details"),
});

// Export IDS related schemas and types
export const insertNetworkTrafficFeaturesSchema = createInsertSchema(networkTrafficFeatures).omit({
  id: true,
  timestamp: true,
  analyzedAt: true,
});

export const insertIdsDetectionHistorySchema = createInsertSchema(idsDetectionHistory).omit({
  id: true,
  timestamp: true,
});

export type NetworkTrafficFeature = typeof networkTrafficFeatures.$inferSelect;
export type InsertNetworkTrafficFeature = z.infer<typeof insertNetworkTrafficFeaturesSchema>;
export type IdsDetectionHistory = typeof idsDetectionHistory.$inferSelect;
export type InsertIdsDetectionHistory = z.infer<typeof insertIdsDetectionHistorySchema>;

// WebSocket Message Types
export type WebSocketMessage = {
  type: 'FIREWALL_RULE_UPDATE' | 'DEVICE_STATUS_UPDATE' | 'TRAFFIC_UPDATE' | 'CONNECTION_ESTABLISHED' | 'ERROR' | 'SECURITY_ALERT';
  payload: any;
};
