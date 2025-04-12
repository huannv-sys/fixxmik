/**
 * Model Loader for IDS Service
 * Loads and executes JavaScript-based rule engine for intrusion detection
 */

import { join } from 'path';

// Create a simple logger interface if the main logger is not available
const logger = (() => {
  try {
    const { logger } = require('../../logger');
    return logger;
  } catch (error) {
    return {
      info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => {
        if (process.env.DEBUG === 'true') {
          console.debug(`[DEBUG] ${message}`, ...args);
        }
      }
    };
  }
})();

// Interface for prediction results
export interface PredictionResult {
  isAnomaly: boolean;
  probability: number;
  timestamp: Date;
  features?: Record<string, any>;
  anomalyType?: string;
  description?: string;
  // Các trường mở rộng cho phân tích AI
  aiEnhanced?: boolean;  // Đánh dấu kết quả có được cải thiện bởi AI không
  aiDetails?: {
    severity?: 'low' | 'medium' | 'high';
    sourceIps?: string[];
    targetIps?: string[];
    recommendedAction?: string;
    modelVersion?: string;
    confidenceScore?: number;
  };
}

// Khai báo các ngưỡng cho các quy tắc phát hiện
const THRESHOLDS = {
  PORT_SCAN: {
    UNIQUE_PORTS: 15,         // Số lượng cổng khác nhau trong khoảng thời gian
    TIME_WINDOW_MS: 60000,    // Cửa sổ thời gian 60 giây
    MIN_PROBABILITY: 0.7      // Xác suất tối thiểu để đánh dấu là bất thường
  },
  DOS_ATTACK: {
    PACKET_RATE: 100,         // Số gói tin trên giây
    FLOW_BYTES_RATE: 10000,   // Số bytes trên giây
    TIME_WINDOW_MS: 10000,    // Cửa sổ thời gian 10 giây
    MIN_PROBABILITY: 0.8      // Xác suất tối thiểu để đánh dấu là bất thường
  },
  BRUTEFORCE: {
    CONNECTION_COUNT: 10,     // Số lần kết nối đến cùng một cổng
    COMMON_PORTS: [22, 23, 3389, 5900, 8291], // Các cổng thường bị tấn công brute force
    TIME_WINDOW_MS: 30000,    // Cửa sổ thời gian 30 giây
    MIN_PROBABILITY: 0.7      // Xác suất tối thiểu để đánh dấu là bất thường
  }
};

// Lưu trữ tạm thời các lưu lượng gần đây
interface TrafficMemory {
  portScanData: Map<string, Set<number>>;
  portScanTimestamps: Map<string, Date[]>;
  dosAttackData: Map<string, {packets: number, bytes: number, timestamps: Date[]}>;
  bruteforceData: Map<string, Map<number, {count: number, timestamps: Date[]}>>;
  cleanOldEntries(): void;
}

class ModelLoader {
  private modelReady = false;
  private trafficMemory: TrafficMemory;

  constructor() {
    // Khởi tạo trafficMemory trước
    this.trafficMemory = {
      portScanData: new Map(),
      portScanTimestamps: new Map(),
      dosAttackData: new Map(),
      bruteforceData: new Map(),
      cleanOldEntries: function() {
        // Sẽ được ghi đè sau
      }
    };
    
    // Sau đó gán phương thức cleanOldEntries
    this.trafficMemory.cleanOldEntries = this.cleanOldEntries.bind(this);
    
    // Khởi tạo engine
    this.initialize();
  }

  /**
   * Initialize the rule-based model loader
   */
  private async initialize(): Promise<void> {
    try {
      logger.info("Initializing rule-based IDS engine");
      this.modelReady = true;
      // Test the rule engine
      const testFeatures = this.getTestFeatures();
      await this.predict(testFeatures);
      logger.info("Rule-based IDS engine initialized successfully");
    } catch (error) {
      logger.error(`Error initializing rule-based IDS engine: ${error}`);
      this.modelReady = false;
    }
  }

  /**
   * Clean old entries from traffic memory
   */
  private cleanOldEntries(): void {
    const now = new Date();
    
    // Clean port scan data
    this.trafficMemory.portScanTimestamps.forEach((timestamps, key) => {
      const filteredTimestamps = timestamps.filter(
        ts => now.getTime() - ts.getTime() < THRESHOLDS.PORT_SCAN.TIME_WINDOW_MS
      );
      
      if (filteredTimestamps.length === 0) {
        this.trafficMemory.portScanData.delete(key);
        this.trafficMemory.portScanTimestamps.delete(key);
      } else {
        this.trafficMemory.portScanTimestamps.set(key, filteredTimestamps);
      }
    });
    
    // Clean DOS attack data
    this.trafficMemory.dosAttackData.forEach((data, key) => {
      const filteredTimestamps = data.timestamps.filter(
        ts => now.getTime() - ts.getTime() < THRESHOLDS.DOS_ATTACK.TIME_WINDOW_MS
      );
      
      if (filteredTimestamps.length === 0) {
        this.trafficMemory.dosAttackData.delete(key);
      } else {
        this.trafficMemory.dosAttackData.set(key, {
          ...data,
          timestamps: filteredTimestamps
        });
      }
    });
    
    // Clean bruteforce data
    this.trafficMemory.bruteforceData.forEach((portMap, sourceIp) => {
      let shouldDeleteSource = true;
      
      portMap.forEach((data, port) => {
        const filteredTimestamps = data.timestamps.filter(
          ts => now.getTime() - ts.getTime() < THRESHOLDS.BRUTEFORCE.TIME_WINDOW_MS
        );
        
        if (filteredTimestamps.length === 0) {
          portMap.delete(port);
        } else {
          portMap.set(port, {
            count: filteredTimestamps.length,
            timestamps: filteredTimestamps
          });
          shouldDeleteSource = false;
        }
      });
      
      if (shouldDeleteSource) {
        this.trafficMemory.bruteforceData.delete(sourceIp);
      }
    });
  }

  /**
   * Generate test features for model verification
   */
  private getTestFeatures(): Record<string, number> {
    return {
      'Destination Port': 80,
      'Flow Duration': 1000,
      'Total Fwd Packets': 10,
      'Total Backward Packets': 10,
      'Total Length of Fwd Packets': 1000,
      'Total Length of Bwd Packets': 1000,
      'Fwd Packet Length Max': 1500,
      'Fwd Packet Length Min': 64,
      'Fwd Packet Length Mean': 100,
      'Fwd Packet Length Std': 200,
      'Bwd Packet Length Max': 1500,
      'Bwd Packet Length Min': 64,
      'Bwd Packet Length Mean': 100,
      'Bwd Packet Length Std': 200,
      'Flow Bytes/s': 1000,
      'Flow Packets/s': 10,
      'Flow IAT Mean': 100,
      'Flow IAT Std': 100,
      'Flow IAT Max': 1000,
      'Flow IAT Min': 1,
      'Fwd IAT Total': 500,
      'Fwd IAT Mean': 100,
      'Fwd IAT Std': 50,
      'Fwd IAT Max': 500,
      'Fwd IAT Min': 1,
      'Bwd IAT Total': 500,
      'Bwd IAT Mean': 100,
      'Bwd IAT Std': 50,
      'Bwd IAT Max': 500,
      'Bwd IAT Min': 1,
      'Fwd PSH Flags': 1,
      'Bwd PSH Flags': 1,
      'Fwd URG Flags': 0,
      'Bwd URG Flags': 0,
      'Fwd Header Length': 200,
      'Bwd Header Length': 200,
      'Fwd Packets/s': 5,
      'Bwd Packets/s': 5,
      'Min Packet Length': 64,
      'Max Packet Length': 1500,
      'Packet Length Mean': 100,
      'Packet Length Std': 300,
      'Packet Length Variance': 90000,
      'FIN Flag Count': 1,
      'SYN Flag Count': 1,
      'RST Flag Count': 0,
      'PSH Flag Count': 2,
      'ACK Flag Count': 18,
      'URG Flag Count': 0,
      'CWE Flag Count': 0,
      'ECE Flag Count': 0,
      'Down/Up Ratio': 1,
      'Average Packet Size': 100,
      'Avg Fwd Segment Size': 100,
      'Avg Bwd Segment Size': 100
    };
  }

  /**
   * Check if the model is ready
   */
  public isModelReady(): boolean {
    return this.modelReady;
  }

  /**
   * Process traffic data for port scan detection
   */
  private detectPortScan(
    sourceIp: string, 
    destinationIp: string, 
    destinationPort: number
  ): {isAnomaly: boolean, probability: number} {
    const key = `${sourceIp}->${destinationIp}`;
    
    // Initialize data structures if needed
    if (!this.trafficMemory.portScanData.has(key)) {
      this.trafficMemory.portScanData.set(key, new Set());
      this.trafficMemory.portScanTimestamps.set(key, []);
    }
    
    // Add the port to the set and timestamp
    this.trafficMemory.portScanData.get(key)!.add(destinationPort);
    this.trafficMemory.portScanTimestamps.get(key)!.push(new Date());
    
    // Get port count and calculate probability
    const uniquePorts = this.trafficMemory.portScanData.get(key)!.size;
    const timestamps = this.trafficMemory.portScanTimestamps.get(key)!;
    
    // Only consider timestamps within the time window
    const now = new Date();
    const recentTimestamps = timestamps.filter(
      ts => now.getTime() - ts.getTime() < THRESHOLDS.PORT_SCAN.TIME_WINDOW_MS
    );
    
    // Calculate normalized probability (0 to 1)
    const portRatio = Math.min(1, uniquePorts / THRESHOLDS.PORT_SCAN.UNIQUE_PORTS);
    const probability = portRatio * 0.9; // Max probability of 0.9
    
    return {
      isAnomaly: uniquePorts >= THRESHOLDS.PORT_SCAN.UNIQUE_PORTS && 
                 probability >= THRESHOLDS.PORT_SCAN.MIN_PROBABILITY,
      probability
    };
  }
  
  /**
   * Process traffic data for DoS attack detection
   */
  private detectDosAttack(
    sourceIp: string, 
    destinationIp: string, 
    bytes: number,
    packetCount: number
  ): {isAnomaly: boolean, probability: number} {
    const key = `${sourceIp}->${destinationIp}`;
    
    // Initialize data structure if needed
    if (!this.trafficMemory.dosAttackData.has(key)) {
      this.trafficMemory.dosAttackData.set(key, {
        packets: 0,
        bytes: 0,
        timestamps: []
      });
    }
    
    // Update data
    const data = this.trafficMemory.dosAttackData.get(key)!;
    data.packets += packetCount;
    data.bytes += bytes;
    data.timestamps.push(new Date());
    
    // Only consider timestamps within the time window
    const now = new Date();
    const recentTimestamps = data.timestamps.filter(
      ts => now.getTime() - ts.getTime() < THRESHOLDS.DOS_ATTACK.TIME_WINDOW_MS
    );
    
    // If we have no recent timestamps, reset counters
    if (recentTimestamps.length === 0) {
      this.trafficMemory.dosAttackData.set(key, {
        packets: packetCount,
        bytes: bytes,
        timestamps: [now]
      });
      return { isAnomaly: false, probability: 0 };
    }
    
    // Calculate rates
    const timeWindowSeconds = THRESHOLDS.DOS_ATTACK.TIME_WINDOW_MS / 1000;
    const packetRate = data.packets / timeWindowSeconds;
    const byteRate = data.bytes / timeWindowSeconds;
    
    // Calculate normalized probabilities (0 to 1)
    const packetRatioProb = Math.min(1, packetRate / THRESHOLDS.DOS_ATTACK.PACKET_RATE);
    const byteRatioProb = Math.min(1, byteRate / THRESHOLDS.DOS_ATTACK.FLOW_BYTES_RATE);
    
    // Combined probability (weighted)
    const probability = (packetRatioProb * 0.7) + (byteRatioProb * 0.3);
    
    return {
      isAnomaly: probability >= THRESHOLDS.DOS_ATTACK.MIN_PROBABILITY,
      probability
    };
  }
  
  /**
   * Process traffic data for bruteforce attack detection
   */
  private detectBruteforce(
    sourceIp: string, 
    destinationIp: string, 
    destinationPort: number
  ): {isAnomaly: boolean, probability: number} {
    // Skip if not a common bruteforce port
    const isCommonPort = THRESHOLDS.BRUTEFORCE.COMMON_PORTS.includes(destinationPort);
    if (!isCommonPort) {
      return { isAnomaly: false, probability: 0 };
    }
    
    // Initialize data structures if needed
    if (!this.trafficMemory.bruteforceData.has(sourceIp)) {
      this.trafficMemory.bruteforceData.set(sourceIp, new Map());
    }
    
    const portMap = this.trafficMemory.bruteforceData.get(sourceIp)!;
    if (!portMap.has(destinationPort)) {
      portMap.set(destinationPort, { count: 0, timestamps: [] });
    }
    
    // Update data
    const data = portMap.get(destinationPort)!;
    data.count++;
    data.timestamps.push(new Date());
    
    // Only consider timestamps within the time window
    const now = new Date();
    const recentTimestamps = data.timestamps.filter(
      ts => now.getTime() - ts.getTime() < THRESHOLDS.BRUTEFORCE.TIME_WINDOW_MS
    );
    
    // Update with filtered data
    portMap.set(destinationPort, {
      count: recentTimestamps.length,
      timestamps: recentTimestamps
    });
    
    // Calculate probability
    const connectionRatio = Math.min(
      1, 
      recentTimestamps.length / THRESHOLDS.BRUTEFORCE.CONNECTION_COUNT
    );
    
    // Adjust probability based on port commonality
    const portAdjustment = isCommonPort ? 0.2 : 0;
    const probability = (connectionRatio * 0.8) + portAdjustment;
    
    return {
      isAnomaly: recentTimestamps.length >= THRESHOLDS.BRUTEFORCE.CONNECTION_COUNT && 
                 probability >= THRESHOLDS.BRUTEFORCE.MIN_PROBABILITY,
      probability
    };
  }

  /**
   * Make a prediction using the rule-based detection
   * @param features The features to use for prediction
   */
  public async predict(features: Record<string, number>): Promise<PredictionResult> {
    try {
      // Clean old entries
      this.trafficMemory.cleanOldEntries();
      
      // Extract necessary features for rule-based detection
      const destinationPort = features['Destination Port'] || 0;
      const flowDuration = features['Flow Duration'] || 0;
      const fwdPackets = features['Total Fwd Packets'] || 0;
      const bwdPackets = features['Total Backward Packets'] || 0;
      const totalPackets = fwdPackets + bwdPackets;
      const fwdBytes = features['Total Length of Fwd Packets'] || 0;
      const bwdBytes = features['Total Length of Bwd Packets'] || 0;
      const totalBytes = fwdBytes + bwdBytes;
      
      // Apply rule-based detection - use dummy IP addresses for testing
      const sourceIp = "192.168.1.100";
      const destinationIp = "192.168.1.1";
      
      // Anomaly results for each attack type
      const portScanResult = this.detectPortScan(sourceIp, destinationIp, destinationPort);
      const dosResult = this.detectDosAttack(sourceIp, destinationIp, totalBytes, totalPackets);
      const bruteforceResult = this.detectBruteforce(sourceIp, destinationIp, destinationPort);
      
      // Find the highest probability and corresponding attack type
      const results = [
        { type: 'PORT_SCAN', ...portScanResult },
        { type: 'DOS_ATTACK', ...dosResult },
        { type: 'BRUTEFORCE', ...bruteforceResult }
      ];
      
      // Sort by probability (descending)
      results.sort((a, b) => b.probability - a.probability);
      const highestResult = results[0];
      
      // Prepare detailed description based on attack type
      let description = "Normal traffic pattern";
      if (highestResult.isAnomaly) {
        switch (highestResult.type) {
          case 'PORT_SCAN':
            description = "Port scanning activity detected - multiple ports accessed within a short time window";
            break;
          case 'DOS_ATTACK':
            description = "Possible DoS attack - high rate of packets directed at the target";
            break;
          case 'BRUTEFORCE':
            description = "Possible brute force attack - repeated connection attempts to critical service";
            break;
        }
      }
      
      return {
        isAnomaly: highestResult.isAnomaly,
        probability: highestResult.probability,
        timestamp: new Date(),
        features,
        anomalyType: highestResult.isAnomaly ? highestResult.type : undefined,
        description: highestResult.isAnomaly ? description : undefined
      };
    } catch (error) {
      logger.error(`Error making rule-based prediction: ${error}`);
      
      // Return a default non-anomaly result in case of error
      return {
        isAnomaly: false,
        probability: 0,
        timestamp: new Date(),
        features
      };
    }
  }
}

// Export a singleton instance
export const modelLoader = new ModelLoader();