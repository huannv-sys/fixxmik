// Export tất cả các services từ thư mục traffic-analyzer
export * from './parser';
export * from './visualizer';

// Tạo lớp traffic analyzer service
import { TrafficData, parseMikrotikLogs, processTrafficData } from './parser';
import * as visualizer from './visualizer';
import fs from 'fs/promises';
import path from 'path';

class TrafficAnalyzerService {
  // Phân tích dữ liệu từ nội dung file log
  async analyzeLogContent(content: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      trafficData: TrafficData[];
      stats: Record<string, any>;
    }
  }> {
    try {
      // Phân tích log để nhận dữ liệu có cấu trúc
      const trafficData = parseMikrotikLogs(content);
      
      if (!trafficData || trafficData.length === 0) {
        return {
          success: false,
          message: "Không thể phân tích dữ liệu log. Định dạng không được hỗ trợ."
        };
      }
      
      // Xử lý dữ liệu để tính toán thống kê
      const stats = processTrafficData(trafficData);
      
      return {
        success: true,
        message: `Đã phân tích thành công ${trafficData.length} bản ghi.`,
        data: {
          trafficData,
          stats
        }
      };
    } catch (error) {
      console.error("Lỗi khi phân tích log:", error);
      return {
        success: false,
        message: `Lỗi khi phân tích log: ${error.message}`
      };
    }
  }
  
  // Phân tích từ tệp log
  async analyzeLogFile(filePath: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      trafficData: TrafficData[];
      stats: Record<string, any>;
    }
  }> {
    try {
      // Đọc nội dung file
      const content = await fs.readFile(filePath, 'utf-8');
      return this.analyzeLogContent(content);
    } catch (error) {
      console.error("Lỗi khi đọc tệp log:", error);
      return {
        success: false,
        message: `Lỗi khi đọc tệp log: ${error.message}`
      };
    }
  }
  
  // Tạo dữ liệu biểu đồ bandwidth theo thời gian
  createBandwidthChartData(
    trafficData: TrafficData[],
    resampleRule: 'hourly' | 'daily' | 'weekly' = 'hourly'
  ): {timestamp: Date, megabytes: number}[] {
    return visualizer.calculateBandwidthOverTime(trafficData, resampleRule);
  }
  
  // Tạo dữ liệu biểu đồ kết nối theo thời gian
  createConnectionChartData(
    trafficData: TrafficData[],
    resampleRule: 'hourly' | 'daily' | 'weekly' = 'hourly'
  ): {timestamp: Date, count: number}[] {
    return visualizer.calculateConnectionsOverTime(trafficData, resampleRule);
  }
  
  // Tạo dữ liệu biểu đồ phân phối protocol
  createProtocolDistributionData(trafficData: TrafficData[]): {protocol: string, count: number}[] {
    return visualizer.calculateProtocolDistribution(trafficData);
  }
  
  // Tạo dữ liệu biểu đồ nhiệt trafic theo giờ
  createHourlyTrafficHeatmapData(trafficData: TrafficData[]): {dayOfWeek: number, hour: number, value: number}[] {
    return visualizer.calculateHourlyTrafficHeatmap(trafficData);
  }
  
  // Tạo dữ liệu biểu đồ top IPs theo lưu lượng
  createTopIpsByTrafficData(
    trafficData: TrafficData[],
    ipColumn: 'src_ip' | 'dst_ip',
    topN: number = 10
  ): {ip: string, megabytes: number}[] {
    return visualizer.calculateTopIpsByTraffic(trafficData, ipColumn, topN);
  }
  
  // Tạo dữ liệu biểu đồ top ports
  createTopPortsData(
    trafficData: TrafficData[],
    metric: 'traffic' | 'connections' = 'connections',
    topN: number = 10
  ): {port: number, value: number}[] {
    return visualizer.calculateTopPorts(trafficData, metric, topN);
  }
}

export const trafficAnalyzerService = new TrafficAnalyzerService();