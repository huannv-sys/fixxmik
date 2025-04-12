// Tệp này liên kết Zod với Drizzle để sử dụng trong schema
import { z } from "zod";

// Define WebSocket message types
export const WebSocketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("FIREWALL_RULE_UPDATE"),
    payload: z.object({
      deviceId: z.number(),
      ruleId: z.string().optional(),
      action: z.enum(["add", "update", "delete"]),
    }),
  }),
  z.object({
    type: z.literal("DEVICE_STATUS_UPDATE"),
    payload: z.object({
      deviceId: z.number(),
      status: z.enum(["online", "offline"]),
      lastSeen: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("TRAFFIC_UPDATE"),
    payload: z.object({
      deviceId: z.number(),
      downloadBandwidth: z.number(),
      uploadBandwidth: z.number(),
      timestamp: z.string(),
    }),
  }),
  z.object({
    type: z.literal("SECURITY_ALERT"),
    payload: z.object({
      alertId: z.number(),
      deviceId: z.number(),
      message: z.string(),
      severity: z.string(),
      source: z.string(),
      details: z
        .object({
          sourceIp: z.string(),
          destinationIp: z.string(),
          probability: z.number(),
          timestamp: z.string(),
        })
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("CONNECTION_ESTABLISHED"),
    payload: z.object({
      timestamp: z.string(),
    }),
  }),
  z.object({
    type: z.literal("ERROR"),
    payload: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  }),
]);

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

export { z };
