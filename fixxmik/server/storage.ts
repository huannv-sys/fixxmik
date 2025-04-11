import {
  type Device,
  type InsertDevice,
  type Metric,
  type InsertMetric,
  type Interface,
  type InsertInterface,
  type Alert,
  type InsertAlert,
  type WirelessInterface,
  type InsertWirelessInterface,
  type CapsmanAP,
  type InsertCapsmanAP,
  type CapsmanClient,
  type InsertCapsmanClient,
  type User,
  type InsertUser, 
  type Session,
  type InsertSession,
  type UserLog,
  type InsertUserLog,
  devices,
  metrics,
  interfaces,
  alerts,
  wirelessInterfaces,
  capsmanAPs,
  capsmanClients,
  users,
  sessions,
  userLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, isNull } from "drizzle-orm";

export interface IStorage {
  // Device operations
  getAllDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByIp(ipAddress: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;

  // Metric operations
  getMetrics(deviceId: number, limit?: number): Promise<Metric[]>;
  createMetric(metric: InsertMetric): Promise<Metric>;

  // Interface operations
  getInterfaces(deviceId: number): Promise<Interface[]>;
  getInterface(id: number): Promise<Interface | undefined>;
  createInterface(iface: InsertInterface): Promise<Interface>;
  updateInterface(id: number, iface: Partial<Interface>): Promise<Interface | undefined>;

  // Alert operations
  getAlerts(deviceId?: number, acknowledged?: boolean, limit?: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: number): Promise<Alert | undefined>;
  acknowledgeAllAlerts(deviceId?: number): Promise<number>;
  
  // Wireless Interface operations
  getWirelessInterfaces(deviceId: number): Promise<WirelessInterface[]>;
  getWirelessInterface(id: number): Promise<WirelessInterface | undefined>;
  createWirelessInterface(wireless: InsertWirelessInterface): Promise<WirelessInterface>;
  updateWirelessInterface(id: number, wireless: Partial<WirelessInterface>): Promise<WirelessInterface | undefined>;
  deleteWirelessInterface(id: number): Promise<boolean>;
  
  // CAPsMAN AP operations
  getCapsmanAPs(deviceId: number): Promise<CapsmanAP[]>;
  getCapsmanAP(id: number): Promise<CapsmanAP | undefined>;
  createCapsmanAP(ap: InsertCapsmanAP): Promise<CapsmanAP>;
  updateCapsmanAP(id: number, ap: Partial<CapsmanAP>): Promise<CapsmanAP | undefined>;
  deleteCapsmanAP(id: number): Promise<boolean>;
  
  // CAPsMAN Client operations
  getCapsmanClients(apId: number): Promise<CapsmanClient[]>;
  getCapsmanClientsByDevice(deviceId: number): Promise<CapsmanClient[]>;
  getCapsmanClient(id: number): Promise<CapsmanClient | undefined>;
  createCapsmanClient(client: InsertCapsmanClient): Promise<CapsmanClient>;
  updateCapsmanClient(id: number, client: Partial<CapsmanClient>): Promise<CapsmanClient | undefined>;
  deleteCapsmanClient(id: number): Promise<boolean>;
  
  // User management operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Session management operations
  getSession(id: number): Promise<Session | undefined>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  deleteSession(token: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<number>;
  
  // User activity log operations
  getUserLogs(userId: number, limit?: number): Promise<UserLog[]>;
  createUserLog(log: InsertUserLog): Promise<UserLog>;
}

export class DatabaseStorage implements IStorage {
  // Device operations
  async getAllDevices(): Promise<Device[]> {
    const allDevices = await db.select().from(devices);
    return allDevices;
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getDeviceByIp(ipAddress: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.ipAddress, ipAddress));
    return device;
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const now = new Date();
    const [device] = await db.insert(devices).values({
      ...insertDevice,
      lastSeen: now,
      isOnline: false,
      uptime: "0d 0h 0m",
      hasCAPsMAN: false,
      hasWireless: false
    }).returning();
    
    return device;
  }

  async updateDevice(id: number, updateDevice: Partial<Device>): Promise<Device | undefined> {
    const [device] = await db.update(devices)
      .set(updateDevice)
      .where(eq(devices.id, id))
      .returning();
    
    return device;
  }

  async deleteDevice(id: number): Promise<boolean> {
    try {
      await db.delete(devices).where(eq(devices.id, id));
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa thiết bị:", error);
      return false;
    }
  }

  // Metric operations
  async getMetrics(deviceId: number, limit?: number): Promise<Metric[]> {
    let query = db.select()
      .from(metrics)
      .where(eq(metrics.deviceId, deviceId))
      .orderBy(desc(metrics.timestamp));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createMetric(insertMetric: InsertMetric): Promise<Metric> {
    const [metric] = await db.insert(metrics).values({
      ...insertMetric,
      // Các trường tương thích ngược
      cpuUsage: insertMetric.cpuUsage || insertMetric.cpuLoad || null,
      memoryUsage: insertMetric.memoryUsage || insertMetric.memoryUsed || null
    }).returning();
    
    return metric;
  }

  // Interface operations
  async getInterfaces(deviceId: number): Promise<Interface[]> {
    return await db.select()
      .from(interfaces)
      .where(eq(interfaces.deviceId, deviceId));
  }

  async getInterface(id: number): Promise<Interface | undefined> {
    const [interface_] = await db.select()
      .from(interfaces)
      .where(eq(interfaces.id, id));
    
    return interface_;
  }

  async createInterface(insertInterface: InsertInterface): Promise<Interface> {
    const [interface_] = await db.insert(interfaces).values({
      ...insertInterface,
      lastUpdated: new Date()
    }).returning();
    
    return interface_;
  }

  async updateInterface(id: number, updateInterface: Partial<Interface>): Promise<Interface | undefined> {
    const [interface_] = await db.update(interfaces)
      .set(updateInterface)
      .where(eq(interfaces.id, id))
      .returning();
    
    return interface_;
  }

  // Alert operations
  async getAlerts(deviceId?: number, acknowledged?: boolean, limit?: number): Promise<Alert[]> {
    let query = db.select().from(alerts);
    const conditions = [];
    
    if (deviceId !== undefined) {
      conditions.push(eq(alerts.deviceId, deviceId));
    }
    
    if (acknowledged !== undefined) {
      conditions.push(eq(alerts.acknowledged, acknowledged));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(alerts.timestamp));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values({
      ...insertAlert,
      acknowledged: false,
      timestamp: insertAlert.timestamp || new Date()
    }).returning();
    
    return alert;
  }

  async acknowledgeAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db.update(alerts)
      .set({ acknowledged: true })
      .where(eq(alerts.id, id))
      .returning();
    
    return alert;
  }

  async acknowledgeAllAlerts(deviceId?: number): Promise<number> {
    let query = db.update(alerts).set({ acknowledged: true });
    
    if (deviceId !== undefined) {
      query = query.where(and(
        eq(alerts.deviceId, deviceId),
        eq(alerts.acknowledged, false)
      ));
    } else {
      query = query.where(eq(alerts.acknowledged, false));
    }
    
    const result = await query.returning();
    return result.length;
  }

  // Wireless Interface operations
  async getWirelessInterfaces(deviceId: number): Promise<WirelessInterface[]> {
    return await db.select()
      .from(wirelessInterfaces)
      .where(eq(wirelessInterfaces.deviceId, deviceId));
  }

  async getWirelessInterface(id: number): Promise<WirelessInterface | undefined> {
    const [wirelessInterface] = await db.select()
      .from(wirelessInterfaces)
      .where(eq(wirelessInterfaces.id, id));
    
    return wirelessInterface;
  }

  async createWirelessInterface(insertWirelessInterface: InsertWirelessInterface): Promise<WirelessInterface> {
    const [wirelessInterface] = await db.insert(wirelessInterfaces).values({
      ...insertWirelessInterface,
      clients: insertWirelessInterface.clients || 0,
      isActive: insertWirelessInterface.isActive !== undefined ? insertWirelessInterface.isActive : true,
      lastUpdated: new Date()
    }).returning();
    
    return wirelessInterface;
  }

  async updateWirelessInterface(id: number, updateInterface: Partial<WirelessInterface>): Promise<WirelessInterface | undefined> {
    const [wirelessInterface] = await db.update(wirelessInterfaces)
      .set(updateInterface)
      .where(eq(wirelessInterfaces.id, id))
      .returning();
    
    return wirelessInterface;
  }

  async deleteWirelessInterface(id: number): Promise<boolean> {
    try {
      await db.delete(wirelessInterfaces).where(eq(wirelessInterfaces.id, id));
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa giao diện không dây:", error);
      return false;
    }
  }

  // CAPsMAN AP operations
  async getCapsmanAPs(deviceId: number): Promise<CapsmanAP[]> {
    return await db.select()
      .from(capsmanAPs)
      .where(eq(capsmanAPs.deviceId, deviceId));
  }

  async getCapsmanAP(id: number): Promise<CapsmanAP | undefined> {
    const [capsmanAP] = await db.select()
      .from(capsmanAPs)
      .where(eq(capsmanAPs.id, id));
    
    return capsmanAP;
  }

  async createCapsmanAP(insertCapsmanAP: InsertCapsmanAP): Promise<CapsmanAP> {
    const [capsmanAP] = await db.insert(capsmanAPs).values({
      ...insertCapsmanAP,
      clients: insertCapsmanAP.clients || 0,
      lastSeen: new Date()
    }).returning();
    
    return capsmanAP;
  }

  async updateCapsmanAP(id: number, updateAP: Partial<CapsmanAP>): Promise<CapsmanAP | undefined> {
    const [capsmanAP] = await db.update(capsmanAPs)
      .set(updateAP)
      .where(eq(capsmanAPs.id, id))
      .returning();
    
    return capsmanAP;
  }

  async deleteCapsmanAP(id: number): Promise<boolean> {
    try {
      await db.delete(capsmanAPs).where(eq(capsmanAPs.id, id));
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa AP CAPsMAN:", error);
      return false;
    }
  }
  
  // CAPsMAN Client operations
  async getCapsmanClients(apId: number): Promise<CapsmanClient[]> {
    return await db.select()
      .from(capsmanClients)
      .where(eq(capsmanClients.apId, apId));
  }

  async getCapsmanClientsByDevice(deviceId: number): Promise<CapsmanClient[]> {
    return await db.select()
      .from(capsmanClients)
      .where(eq(capsmanClients.deviceId, deviceId));
  }

  async getCapsmanClient(id: number): Promise<CapsmanClient | undefined> {
    const [client] = await db.select()
      .from(capsmanClients)
      .where(eq(capsmanClients.id, id));
    
    return client;
  }

  async createCapsmanClient(insertCapsmanClient: InsertCapsmanClient): Promise<CapsmanClient> {
    const [capsmanClient] = await db.insert(capsmanClients).values({
      ...insertCapsmanClient,
      lastActivity: new Date()
    }).returning();
    
    return capsmanClient;
  }

  async updateCapsmanClient(id: number, updateClient: Partial<CapsmanClient>): Promise<CapsmanClient | undefined> {
    const [capsmanClient] = await db.update(capsmanClients)
      .set(updateClient)
      .where(eq(capsmanClients.id, id))
      .returning();
    
    return capsmanClient;
  }

  async deleteCapsmanClient(id: number): Promise<boolean> {
    try {
      await db.delete(capsmanClients).where(eq(capsmanClients.id, id));
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa Client CAPsMAN:", error);
      return false;
    }
  }
  
  // User management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id));
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username));
    
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date();
    const [user] = await db.insert(users).values({
      ...insertUser,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return user;
  }

  async updateUser(id: number, updateUser: Partial<User>): Promise<User | undefined> {
    const updatedValues = {
      ...updateUser,
      updatedAt: new Date()
    };
    
    const [user] = await db.update(users)
      .set(updatedValues)
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      return false;
    }
  }

  // Session management operations
  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select()
      .from(sessions)
      .where(eq(sessions.id, id));
    
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db.select()
      .from(sessions)
      .where(eq(sessions.token, token));
    
    return session;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values({
      ...insertSession,
      createdAt: new Date()
    }).returning();
    
    return session;
  }

  async deleteSession(token: string): Promise<boolean> {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa phiên:", error);
      return false;
    }
  }

  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db.delete(sessions)
      .where(eq(sessions.expiresAt, now)) // Sửa lỗi LSP
      .returning();
    
    return result.length;
  }

  // User activity log operations
  async getUserLogs(userId: number, limit?: number): Promise<UserLog[]> {
    let query = db.select()
      .from(userLogs)
      .where(eq(userLogs.userId, userId))
      .orderBy(desc(userLogs.timestamp));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createUserLog(insertUserLog: InsertUserLog): Promise<UserLog> {
    const [userLog] = await db.insert(userLogs).values({
      ...insertUserLog,
      timestamp: new Date()
    }).returning();
    
    return userLog;
  }
}

export const storage = new DatabaseStorage();

// Khởi tạo người dùng admin mặc định
(async () => {
  try {
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      await storage.createUser({
        username: "admin",
        password: "$2b$10$mLHY3.Zr/lpl7Q1XAtJ1h.JODLkOGPJHLYpZP3pxTQ5GZdqcU4l1m", // "admin123"
        fullName: "Administrator",
        email: "admin@example.com",
        role: "admin"
      });
      console.log("Đã tạo người dùng admin mặc định");
    }
  } catch (error) {
    console.error("Lỗi khi tạo người dùng admin mặc định:", error);
  }
})();
