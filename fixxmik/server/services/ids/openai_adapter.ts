import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../../logger";

// Định nghĩa kiểu dữ liệu cho kết quả phân tích
interface OpenAIAnalysisResult {
  anomaly_detected: boolean;
  confidence: number;
  anomaly_type?: string;
  description?: string;
  severity?: "low" | "medium" | "high";
  source_ips?: string[];
  target_ips?: string[];
  recommended_action?: string;
  error?: string;
}

// Định nghĩa kiểu dữ liệu cho báo cáo đe dọa
interface ThreatReport {
  summary: string;
  risk_level: string;
  detailed_findings: Array<{
    finding: string;
    severity: string;
    impact: string;
  }>;
  remediation_steps: string[];
  prevention_guidance: string[];
  error?: string;
}

// Định nghĩa kiểu dữ liệu cho kết quả phân loại hoạt động mạng
interface NetworkActivityClassification {
  classification: string;
  anomaly_detected: boolean;
  pattern_description: string;
  severity: string;
  recommended_action: string;
  confidence: number;
  error?: string;
}

/**
 * Adapter để kết nối với bộ phân tích OpenAI thông qua Python script
 */
export class OpenAIIDSAdapter {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Đường dẫn đến Python script
    this.pythonPath = "python3";
    // Fix cho ES Modules: Dùng URL và fileURLToPath thay cho __dirname
    const moduleURL = new URL(import.meta.url);
    const modulePath = path.dirname(moduleURL.pathname);
    this.scriptPath = path.resolve(modulePath, "openai_analyzer.py");

    logger.info(
      `OpenAI IDS Adapter initialized with script at ${this.scriptPath}`,
    );
  }

  /**
   * Thực thi lệnh Python với dữ liệu đầu vào
   */
  private async executePythonScript(
    functionName: string,
    data: any,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Chuẩn bị dữ liệu đầu vào
      const inputData = JSON.stringify({
        function: functionName,
        data: data,
      });

      // Tạo child process để chạy Python script
      const pythonProcess = spawn(this.pythonPath, [
        "-c",
        `
import sys
import json
import asyncio
sys.path.append('${path.dirname(this.scriptPath)}')
from openai_analyzer import create_openai_analyzer

async def main():
    input_data = json.loads('''${inputData}''')
    analyzer = create_openai_analyzer()
    if not analyzer:
        print(json.dumps({"error": "Failed to create OpenAI analyzer"}))
        return
    
    function_name = input_data['function']
    data = input_data['data']
    
    if function_name == 'analyze_traffic_patterns':
        result = await analyzer.analyze_traffic_patterns(data)
    elif function_name == 'classify_network_activity':
        result = await analyzer.classify_network_activity(data)
    elif function_name == 'analyze_packet_capture':
        result = await analyzer.analyze_packet_capture(data)
    elif function_name == 'generate_threat_report':
        result = await analyzer.generate_threat_report(data)
    else:
        result = {"error": f"Unknown function: {function_name}"}
    
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())
      `,
      ]);

      let stdout = "";
      let stderr = "";

      // Lắng nghe output từ Python script
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // Xử lý kết quả
      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}`);
          logger.error(`Error: ${stderr}`);
          reject(new Error(`Python process failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          logger.error(`Failed to parse Python output: ${stdout}`);
          reject(new Error(`Failed to parse Python output: ${error.message}`));
        }
      });
    });
  }

  /**
   * Phân tích dữ liệu lưu lượng mạng bằng OpenAI
   */
  async analyzeTrafficPatterns(
    trafficData: any,
  ): Promise<OpenAIAnalysisResult> {
    try {
      logger.info("Analyzing traffic patterns with OpenAI...");
      const result = await this.executePythonScript(
        "analyze_traffic_patterns",
        trafficData,
      );
      logger.info(
        `OpenAI analysis complete. Anomaly detected: ${result.anomaly_detected}`,
      );
      return result as OpenAIAnalysisResult;
    } catch (error) {
      logger.error(`Failed to analyze traffic patterns: ${error.message}`);
      return {
        anomaly_detected: false,
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * Phân loại hoạt động mạng
   */
  async classifyNetworkActivity(
    connectionData: any[],
  ): Promise<NetworkActivityClassification> {
    try {
      logger.info(
        `Classifying network activity with ${connectionData.length} connections...`,
      );
      const result = await this.executePythonScript(
        "classify_network_activity",
        connectionData,
      );
      logger.info(
        `OpenAI classification complete. Result: ${result.classification}`,
      );
      return result as NetworkActivityClassification;
    } catch (error) {
      logger.error(`Failed to classify network activity: ${error.message}`);
      return {
        classification: "error",
        anomaly_detected: false,
        pattern_description: `Error: ${error.message}`,
        severity: "unknown",
        recommended_action: "review_manually",
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * Phân tích dữ liệu bắt gói tin
   */
  async analyzePacketCapture(packetData: any[]): Promise<any> {
    try {
      logger.info(
        `Analyzing packet capture with ${packetData.length} packets...`,
      );
      const result = await this.executePythonScript(
        "analyze_packet_capture",
        packetData,
      );
      return result;
    } catch (error) {
      logger.error(`Failed to analyze packet capture: ${error.message}`);
      return {
        threats_detected: false,
        error: error.message,
      };
    }
  }

  /**
   * Tạo báo cáo đe dọa
   */
  async generateThreatReport(analysisData: any): Promise<ThreatReport> {
    try {
      logger.info("Generating threat report with OpenAI...");
      const result = await this.executePythonScript(
        "generate_threat_report",
        analysisData,
      );
      logger.info("Threat report generation complete");
      return result as ThreatReport;
    } catch (error) {
      logger.error(`Failed to generate threat report: ${error.message}`);
      return {
        summary: `Error generating report: ${error.message}`,
        risk_level: "unknown",
        detailed_findings: [],
        remediation_steps: [],
        prevention_guidance: [],
        error: error.message,
      };
    }
  }
}

// Singleton instance
export const openaiIDSAdapter = new OpenAIIDSAdapter();
