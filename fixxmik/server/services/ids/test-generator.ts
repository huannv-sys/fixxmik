/**
 * Trình tạo dữ liệu kiểm tra IDS
 * Tạo dữ liệu lưu lượng giả định để kiểm tra hệ thống phát hiện xâm nhập
 */

import { TrafficData } from './index';

// Interface cho các tham số tạo dữ liệu kiểm tra
interface TestGeneratorParams {
  deviceId: number;
  type: 'port_scan' | 'dos_attack' | 'bruteforce';
  sourceIp?: string;
  destinationIp?: string;
}

// Tạo dữ liệu lưu lượng để kiểm tra hệ thống phát hiện xâm nhập
export function generateTestTrafficData(params: TestGeneratorParams): TrafficData[] {
  const { deviceId, type, sourceIp = '192.168.1.100', destinationIp = '192.168.1.1' } = params;
  const timestamp = new Date();
  const trafficData: TrafficData[] = [];

  switch (type) {
    case 'port_scan':
      // Mô phỏng quét cổng - nhiều kết nối ngắn đến nhiều cổng khác nhau
      for (let port = 1; port <= 100; port++) {
        trafficData.push({
          sourceIp,
          destinationIp,
          sourcePort: 50000 + Math.floor(Math.random() * 10000),
          destinationPort: port,
          protocol: Math.random() > 0.5 ? 'tcp' : 'udp',
          bytes: 64 + Math.floor(Math.random() * 100),
          packetCount: 1 + Math.floor(Math.random() * 3),
          flowDuration: 100 + Math.floor(Math.random() * 500),
          timestamp: new Date(timestamp.getTime() + port * 10),
          deviceId
        });
      }
      break;

    case 'dos_attack':
      // Mô phỏng tấn công từ chối dịch vụ - Khối lượng lớn gói tin đến cùng một cổng
      for (let i = 0; i < 50; i++) {
        trafficData.push({
          sourceIp,
          destinationIp,
          sourcePort: 50000 + Math.floor(Math.random() * 100),
          destinationPort: 80, // Tập trung vào cổng web
          protocol: 'tcp',
          bytes: 1000 + Math.floor(Math.random() * 1000),
          packetCount: 100 + Math.floor(Math.random() * 900),
          flowDuration: 100 + Math.floor(Math.random() * 200),
          timestamp: new Date(timestamp.getTime() + i * 20),
          deviceId
        });
      }
      break;

    case 'bruteforce':
      // Mô phỏng tấn công brute force - Nhiều kết nối đến cùng một cổng với kích thước tương tự nhau
      for (let i = 0; i < 30; i++) {
        trafficData.push({
          sourceIp,
          destinationIp,
          sourcePort: 50000 + Math.floor(Math.random() * 1000),
          destinationPort: 22, // SSH port
          protocol: 'tcp',
          bytes: 200 + Math.floor(Math.random() * 100),
          packetCount: 5 + Math.floor(Math.random() * 5),
          flowDuration: 1000 + Math.floor(Math.random() * 1000),
          timestamp: new Date(timestamp.getTime() + i * 1000),
          deviceId
        });
      }
      break;
  }

  return trafficData;
}