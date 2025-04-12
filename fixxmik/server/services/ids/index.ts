/**
 * IDS Service
 * Advanced Intrusion Detection System for MikroTik devices
 * Combines rule-based detection with AI-powered analysis
 */

import { modelLoader, PredictionResult } from "./model_loader";
import { openaiIDSAdapter } from "./openai_adapter";

// Create a simple logger interface if the main logger is not available
const logger = (() => {
  try {
    const { logger } = require("../../logger");
    return logger;
  } catch (error) {
    return {
      info: (message: string, ...args: any[]) =>
        console.log(`[INFO] ${message}`, ...args),
      warn: (message: string, ...args: any[]) =>
        console.warn(`[WARN] ${message}`, ...args),
      error: (message: string, ...args: any[]) =>
        console.error(`[ERROR] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => {
        if (process.env.DEBUG === "true") {
          console.debug(`[DEBUG] ${message}`, ...args);
        }
      },
    };
  }
})();
import { db } from "../../db";
import {
  networkTrafficFeatures,
  alerts,
  idsDetectionHistory,
} from "../../../shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// Kiểm tra xem có thể sử dụng OpenAI không
const useOpenAI = Boolean(process.env.OPENAI_API_KEY);

// Interface for traffic data to analyze
export interface TrafficData {
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  bytes: number;
  packetCount: number;
  flowDuration: number;
  timestamp: Date;
  deviceId: number;
}

/**
 * IDS service for detecting intrusions using rule-based system
 */
export class IDSService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the IDS service
   */
  private async initialize(): Promise<void> {
    try {
      // Check if the model is ready
      if (modelLoader.isModelReady()) {
        this.isInitialized = true;
        logger.info("IDS Service initialized successfully");
      } else {
        logger.error(
          "IDS Service initialization failed: Rule engine not ready",
        );
      }
    } catch (error) {
      logger.error(`IDS Service initialization error: ${error}`);
      this.isInitialized = false;
    }
  }

  /**
   * Process network traffic data for intrusion detection
   * @param trafficData The network traffic data to analyze
   */
  public async analyzeTraffic(
    trafficData: TrafficData,
  ): Promise<PredictionResult | null> {
    if (!this.isInitialized) {
      logger.warn("IDS Service not initialized, analyzing with basic rules");
      // Continue with analysis even if not fully initialized
    }

    try {
      // Extract features from traffic data
      const features = this.extractFeatures(trafficData);

      // Save traffic features to the database
      await this.saveTrafficFeatures(features, trafficData);

      // Make prediction with rule-based engine first
      const result = await modelLoader.predict(features);

      // If OpenAI is available, enhance with AI analysis
      if (useOpenAI) {
        try {
          logger.info(
            `Enhancing analysis with OpenAI: ${trafficData.sourceIp}:${trafficData.sourcePort} -> ${trafficData.destinationIp}:${trafficData.destinationPort}`,
          );

          // Prepare data for OpenAI analysis
          const trafficAnalysisData = {
            sourceIp: trafficData.sourceIp,
            destinationIp: trafficData.destinationIp,
            sourcePort: trafficData.sourcePort,
            destinationPort: trafficData.destinationPort,
            protocol: trafficData.protocol,
            bytes: trafficData.bytes,
            packetCount: trafficData.packetCount,
            flowDuration: trafficData.flowDuration,
            timestamp: trafficData.timestamp.toISOString(),
            features: features,
          };

          // Get enhanced analysis from OpenAI
          const openaiResult =
            await openaiIDSAdapter.analyzeTrafficPatterns(trafficAnalysisData);

          // If OpenAI detected an anomaly and the rule-based system didn't, or if it has higher confidence,
          // use the OpenAI result to update our prediction
          if (
            openaiResult.anomaly_detected &&
            (!result.isAnomaly || openaiResult.confidence > result.probability)
          ) {
            logger.info(
              `OpenAI detected anomaly with confidence ${openaiResult.confidence}: ${openaiResult.anomaly_type || "Unknown type"}`,
            );

            // Update the prediction result with OpenAI's findings
            result.isAnomaly = true;
            result.probability = openaiResult.confidence;
            result.anomalyType =
              openaiResult.anomaly_type || result.anomalyType;
            result.description = openaiResult.description || result.description;

            // Add additional OpenAI-specific details
            result.aiEnhanced = true;
            result.aiDetails = {
              severity: openaiResult.severity,
              sourceIps: openaiResult.source_ips,
              targetIps: openaiResult.target_ips,
              recommendedAction: openaiResult.recommended_action,
            };
          }
        } catch (aiError) {
          // Log error but continue with rule-based result
          logger.error(`Error in OpenAI analysis: ${aiError}`);
        }
      }

      // If it's an anomaly, create an alert
      if (result.isAnomaly) {
        await this.createAlert(result, trafficData);
      }

      return result;
    } catch (error) {
      logger.error(`Error analyzing traffic: ${error}`);
      return null;
    }
  }

  /**
   * Extract features from traffic data
   * @param trafficData The traffic data
   */
  private extractFeatures(trafficData: TrafficData): Record<string, number> {
    // Calculate derived features to help with detection
    const bytesPerPacket =
      trafficData.packetCount > 0
        ? trafficData.bytes / trafficData.packetCount
        : 0;
    const packetsPerSecond =
      trafficData.flowDuration > 0
        ? trafficData.packetCount / (trafficData.flowDuration / 1000)
        : 0;
    const bytesPerSecond =
      trafficData.flowDuration > 0
        ? trafficData.bytes / (trafficData.flowDuration / 1000)
        : 0;

    // Map from traffic data to the features required by the rule engine
    const features: Record<string, number> = {
      "Destination Port": trafficData.destinationPort,
      "Flow Duration": trafficData.flowDuration,
      "Total Fwd Packets": Math.floor(trafficData.packetCount / 2), // Approximation
      "Total Backward Packets": Math.floor(trafficData.packetCount / 2), // Approximation
      "Total Length of Fwd Packets": Math.floor(trafficData.bytes / 2), // Approximation
      "Total Length of Bwd Packets": Math.floor(trafficData.bytes / 2), // Approximation
      "Fwd Packet Length Max": 1500, // Default MTU
      "Fwd Packet Length Min": 64, // Minimum Ethernet frame
      "Fwd Packet Length Mean": bytesPerPacket / 2, // Approximation
      "Fwd Packet Length Std": 200, // Approximation
      "Bwd Packet Length Max": 1500, // Default MTU
      "Bwd Packet Length Min": 64, // Minimum Ethernet frame
      "Bwd Packet Length Mean": bytesPerPacket / 2, // Approximation
      "Bwd Packet Length Std": 200, // Approximation
      "Flow Bytes/s": bytesPerSecond,
      "Flow Packets/s": packetsPerSecond,
      "Flow IAT Mean":
        trafficData.packetCount > 1
          ? trafficData.flowDuration / (trafficData.packetCount - 1)
          : trafficData.flowDuration,
      "Flow IAT Std": 100, // Approximation
      "Flow IAT Max": trafficData.flowDuration,
      "Flow IAT Min": 1,
      "Fwd IAT Total": trafficData.flowDuration / 2, // Approximation
      "Fwd IAT Mean":
        trafficData.packetCount > 1
          ? trafficData.flowDuration / (trafficData.packetCount - 1)
          : trafficData.flowDuration,
      "Fwd IAT Std": 50, // Approximation
      "Fwd IAT Max": trafficData.flowDuration / 2,
      "Fwd IAT Min": 1,
      "Bwd IAT Total": trafficData.flowDuration / 2, // Approximation
      "Bwd IAT Mean":
        trafficData.packetCount > 1
          ? trafficData.flowDuration / (trafficData.packetCount - 1)
          : trafficData.flowDuration,
      "Bwd IAT Std": 50, // Approximation
      "Bwd IAT Max": trafficData.flowDuration / 2,
      "Bwd IAT Min": 1,
      // TCP flags - default values assuming a typical TCP connection
      "Fwd PSH Flags": trafficData.protocol === "tcp" ? 1 : 0,
      "Bwd PSH Flags": trafficData.protocol === "tcp" ? 1 : 0,
      "Fwd URG Flags": 0,
      "Bwd URG Flags": 0,
      "Fwd Header Length":
        trafficData.protocol === "tcp" ? 20 * (trafficData.packetCount / 2) : 0,
      "Bwd Header Length":
        trafficData.protocol === "tcp" ? 20 * (trafficData.packetCount / 2) : 0,
      "Fwd Packets/s": packetsPerSecond / 2,
      "Bwd Packets/s": packetsPerSecond / 2,
      "Min Packet Length": 64,
      "Max Packet Length": 1500,
      "Packet Length Mean": bytesPerPacket,
      "Packet Length Std": 300, // Approximation
      "Packet Length Variance": 90000, // Approximation (300^2)
      // TCP flags for classification
      "FIN Flag Count": trafficData.protocol === "tcp" ? 1 : 0,
      "SYN Flag Count": trafficData.protocol === "tcp" ? 1 : 0,
      "RST Flag Count": 0,
      "PSH Flag Count": trafficData.protocol === "tcp" ? 2 : 0,
      "ACK Flag Count":
        trafficData.protocol === "tcp" ? trafficData.packetCount - 2 : 0,
      "URG Flag Count": 0,
      "CWE Flag Count": 0,
      "ECE Flag Count": 0,
      "Down/Up Ratio": 1, // Assuming symmetric traffic
      "Average Packet Size": bytesPerPacket,
      "Avg Fwd Segment Size": bytesPerPacket / 2,
      "Avg Bwd Segment Size": bytesPerPacket / 2,

      // Additional calculated metrics for rule-based system
      "Total Packets": trafficData.packetCount,
      "Total Bytes": trafficData.bytes,
      "Bytes Per Second": bytesPerSecond,
      "Packets Per Second": packetsPerSecond,
      "Bytes Per Packet": bytesPerPacket,
    };

    return features;
  }

  /**
   * Save traffic features to database
   * @param features The extracted features
   * @param trafficData The original traffic data
   */
  private async saveTrafficFeatures(
    features: Record<string, number>,
    trafficData: TrafficData,
  ): Promise<void> {
    try {
      await db.insert(networkTrafficFeatures).values({
        sourceIp: trafficData.sourceIp,
        destinationIp: trafficData.destinationIp,
        sourcePort: trafficData.sourcePort,
        destinationPort: trafficData.destinationPort,
        protocol: trafficData.protocol,
        bytes: trafficData.bytes,
        packetCount: trafficData.packetCount,
        deviceId: trafficData.deviceId,
        featuresJson: features,
        timestamp: trafficData.timestamp,
        analyzedAt: new Date(),
      });

      logger.debug(
        `Saved traffic features for ${trafficData.sourceIp}:${trafficData.sourcePort} -> ${trafficData.destinationIp}:${trafficData.destinationPort}`,
      );
    } catch (error) {
      logger.error(`Error saving traffic features: ${error}`);
    }
  }

  /**
   * Create an alert for detected anomaly
   * @param result The prediction result
   * @param trafficData The original traffic data
   */
  private async createAlert(
    result: PredictionResult,
    trafficData: TrafficData,
  ): Promise<void> {
    try {
      // Create a more detailed message if we have anomaly type information
      let alertMessage = `Possible intrusion detected: ${trafficData.sourceIp}:${trafficData.sourcePort} -> ${trafficData.destinationIp}:${trafficData.destinationPort} (${trafficData.protocol.toUpperCase()})`;

      if (result.anomalyType) {
        alertMessage = `${result.anomalyType}: ${result.description || alertMessage}`;
      }

      const alertResult = await db
        .insert(alerts)
        .values({
          deviceId: trafficData.deviceId,
          severity: "error",
          message: alertMessage,
          acknowledged: false,
          timestamp: new Date(),
          source: "ids",
        })
        .returning();

      // If alert was created, also store in IDS detection history
      if (alertResult && alertResult.length > 0) {
        const alertId = alertResult[0].id;

        // Get the latest traffic feature record
        const trafficFeatureResult = await db
          .select()
          .from(networkTrafficFeatures)
          .where(
            and(
              eq(networkTrafficFeatures.sourceIp, trafficData.sourceIp),
              eq(
                networkTrafficFeatures.destinationIp,
                trafficData.destinationIp,
              ),
              eq(networkTrafficFeatures.sourcePort, trafficData.sourcePort),
              eq(
                networkTrafficFeatures.destinationPort,
                trafficData.destinationPort,
              ),
            ),
          )
          .orderBy(sql`${networkTrafficFeatures.timestamp} DESC`)
          .limit(1);

        if (trafficFeatureResult && trafficFeatureResult.length > 0) {
          await db.insert(idsDetectionHistory).values({
            trafficFeatureId: trafficFeatureResult[0].id,
            deviceId: trafficData.deviceId,
            isAnomaly: true,
            probability: result.probability,
            alertId: alertId,
            details: {
              sourceIp: trafficData.sourceIp,
              destinationIp: trafficData.destinationIp,
              sourcePort: trafficData.sourcePort,
              destinationPort: trafficData.destinationPort,
              protocol: trafficData.protocol,
              flowDuration: trafficData.flowDuration,
              bytes: trafficData.bytes,
              packetCount: trafficData.packetCount,
              anomalyType: result.anomalyType || "UNKNOWN",
              description: result.description || "Unknown anomaly detected",
            },
          });

          // Send security alert via WebSocket
          if (typeof (global as any).broadcastToTopic === "function") {
            const securityAlert = {
              type: "SECURITY_ALERT",
              payload: {
                alertId: alertId,
                deviceId: trafficData.deviceId,
                message: alertMessage,
                severity: "error",
                source: "ids",
                details: {
                  sourceIp: trafficData.sourceIp,
                  destinationIp: trafficData.destinationIp,
                  probability: result.probability,
                  timestamp: new Date().toISOString(),
                  anomalyType: result.anomalyType || "UNKNOWN",
                  description: result.description || "Unknown anomaly",
                },
              },
            };

            // Broadcast to all clients
            (global as any).broadcastToTopic("all_alerts", securityAlert);
            // Broadcast to device-specific topic
            (global as any).broadcastToTopic(
              `device_alerts_${trafficData.deviceId}`,
              securityAlert,
            );
          }
        }
      }

      logger.warn(alertMessage);
    } catch (error) {
      logger.error(`Error creating alert: ${error}`);
    }
  }

  /**
   * Get all anomalies detected within a time range
   * @param startTime Start of time range
   * @param endTime End of time range
   */
  public async getAnomalies(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      const anomalies = await db
        .select()
        .from(idsDetectionHistory)
        .where(
          and(
            gte(idsDetectionHistory.timestamp, startTime),
            lte(idsDetectionHistory.timestamp, endTime),
            eq(idsDetectionHistory.isAnomaly, true),
          ),
        );

      return anomalies;
    } catch (error) {
      logger.error(`Error getting anomalies: ${error}`);
      return [];
    }
  }
}

// Export a singleton instance
export const idsService = new IDSService();
