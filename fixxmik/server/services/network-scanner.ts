import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface NetworkScanOptions {
  networks?: string[];
  autoDetect?: boolean;
  concurrent?: number;
}

interface MikrotikDevice {
  ip: string;
  hostname?: string;
  api_port?: number;
  web_port?: number;
  is_mikrotik: boolean;
  description: string;
}

/**
 * Chạy quét mạng để tìm các thiết bị MikroTik
 * 
 * @param options Các tùy chọn quét
 * @returns Danh sách các thiết bị MikroTik được tìm thấy
 */
export async function scanForMikrotikDevices(options: NetworkScanOptions = {}): Promise<MikrotikDevice[]> {
  return new Promise((resolve, reject) => {
    // Tạo một file tạm để lưu kết quả
    const tempOutputFile = path.join(__dirname, '..', '..', 'temp', `scan_result_${Date.now()}.json`);
    
    // Đảm bảo thư mục temp tồn tại
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Chuẩn bị lệnh và các tham số
    const scriptPath = path.join(__dirname, '..', '..', 'scraper', 'network_scanner.py');
    const args: string[] = ['--output', tempOutputFile];
    
    // Thêm các tùy chọn
    if (options.networks && options.networks.length > 0) {
      args.push('--networks');
      args.push(...options.networks);
    }
    
    if (options.autoDetect) {
      args.push('--auto');
    }
    
    if (options.concurrent) {
      args.push('--concurrent');
      args.push(options.concurrent.toString());
    }
    
    console.log(`[NetworkScanner] Running scan with command: python ${scriptPath} ${args.join(' ')}`);
    
    // Chạy script Python
    const scanProcess = spawn('python3', [scriptPath, ...args]);
    
    let logOutput = '';
    let errorOutput = '';
    
    // Ghi lại output
    scanProcess.stdout.on('data', (data) => {
      const output = data.toString();
      logOutput += output;
      console.log(`[NetworkScanner] ${output.trim()}`);
    });
    
    scanProcess.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      console.error(`[NetworkScanner] Error: ${output.trim()}`);
    });
    
    // Xử lý khi quá trình hoàn tất
    scanProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[NetworkScanner] Process exited with code ${code}`);
        console.error(`[NetworkScanner] Error output: ${errorOutput}`);
        return reject(new Error(`Network scan failed with exit code ${code}: ${errorOutput}`));
      }
      
      try {
        // Đọc file kết quả
        if (fs.existsSync(tempOutputFile)) {
          const resultData = fs.readFileSync(tempOutputFile, 'utf8');
          const devices = JSON.parse(resultData) as MikrotikDevice[];
          
          // Xóa file tạm
          fs.unlinkSync(tempOutputFile);
          
          console.log(`[NetworkScanner] Scan completed successfully. Found ${devices.length} MikroTik devices.`);
          resolve(devices);
        } else {
          reject(new Error('Output file not found after scan completed'));
        }
      } catch (error) {
        console.error('[NetworkScanner] Error parsing scan results:', error);
        reject(error);
      }
    });
    
    // Xử lý lỗi của quá trình
    scanProcess.on('error', (error) => {
      console.error('[NetworkScanner] Failed to start scan process:', error);
      reject(error);
    });
  });
}

/**
 * Quét nhiều dải mạng
 * 
 * @param networks Danh sách các dải mạng theo định dạng CIDR
 * @param concurrent Số lượng quá trình đồng thời tối đa
 * @returns Danh sách các thiết bị MikroTik được tìm thấy
 */
export async function scanNetworks(networks: string[], concurrent = 20): Promise<MikrotikDevice[]> {
  return scanForMikrotikDevices({
    networks,
    concurrent
  });
}

/**
 * Tự động phát hiện và quét các dải mạng cục bộ
 * 
 * @param concurrent Số lượng quá trình đồng thời tối đa
 * @returns Danh sách các thiết bị MikroTik được tìm thấy
 */
export async function autoDetectAndScan(concurrent = 20): Promise<MikrotikDevice[]> {
  return scanForMikrotikDevices({
    autoDetect: true,
    concurrent
  });
}

/**
 * Quét một IP cụ thể
 * 
 * @param ip Địa chỉ IP cần quét
 * @returns Danh sách các thiết bị MikroTik được tìm thấy (có thể rỗng hoặc có 1 phần tử)
 */
export async function scanSingleIp(ip: string): Promise<MikrotikDevice[]> {
  // Chuyển đổi IP đơn thành dải mạng gồm 1 địa chỉ
  const network = `${ip}/32`;
  return scanNetworks([network]);
}

// Xuất các hàm
export const networkScannerService = {
  scanNetworks,
  autoDetectAndScan,
  scanSingleIp,
  scanForMikrotikDevices
};