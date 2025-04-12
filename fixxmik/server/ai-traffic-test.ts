/**
 * Script đơn giản để kiểm tra chức năng phân tích OpenAI
 * Chạy: npx tsx server/ai-traffic-test.ts
 */

import { openaiIDSAdapter } from "./services/ids/openai_adapter";

async function testOpenAITrafficAnalysis() {
  console.log("Testing OpenAI traffic analysis...");

  // Tạo mẫu dữ liệu để phân tích
  const trafficData = {
    sourceIp: "192.168.1.100",
    destinationIp: "103.15.51.235", // IP đáng ngờ
    sourcePort: 36258,
    destinationPort: 443,
    protocol: "tcp",
    bytes: 36548,
    packetCount: 82,
    flowDuration: 1500,
    timestamp: new Date().toISOString(),
    // Thêm dữ liệu mẫu cho phân tích tiên tiến
    features: {
      "Flow Packets/s": 54.67,
      "Flow Bytes/s": 24365.33,
      "Destination Port": 443,
      Protocol: "TCP",
      "Total Fwd Packets": 42,
      "Total Backward Packets": 40,
      "Average Packet Size": 445.71,
    },
  };

  try {
    // Gọi phương thức phân tích OpenAI
    console.log("Sending traffic data to OpenAI analyzer...");
    const result = await openaiIDSAdapter.analyzeTrafficPatterns(trafficData);

    // Hiển thị kết quả
    console.log("\nOpenAI Analysis Results:");
    console.log("------------------------");
    console.log(`Anomaly Detected: ${result.anomaly_detected}`);
    console.log(`Confidence: ${result.confidence}`);

    if (result.anomaly_detected) {
      console.log(`Anomaly Type: ${result.anomaly_type || "Unknown"}`);
      console.log(
        `Description: ${result.description || "No description provided"}`,
      );
      console.log(`Severity: ${result.severity || "Unknown"}`);
      console.log(
        `Source IPs: ${result.source_ips ? result.source_ips.join(", ") : "None"}`,
      );
      console.log(
        `Target IPs: ${result.target_ips ? result.target_ips.join(", ") : "None"}`,
      );
      console.log(
        `Recommended Action: ${result.recommended_action || "No recommendation provided"}`,
      );
    }

    console.log("\nRaw Response:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error testing OpenAI traffic analysis:", error);
  }
}

// Chạy test
testOpenAITrafficAnalysis();
