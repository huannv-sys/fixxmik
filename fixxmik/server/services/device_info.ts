import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

interface MikrotikDeviceInfo {
  model: string;
  url: string;
  description?: string;
  cpu?: string;
  memory?: string;
  storage?: string;
  specifications?: Record<string, string>;
  error?: string;
}

interface RouterOSVersionInfo {
  version: string;
  release_date: string;
  error?: string;
}

/**
 * DeviceInfoService - Dịch vụ lấy thông tin thiết bị và phiên bản RouterOS từ nguồn chính thức
 */
export class DeviceInfoService {
  private scriptPath: string;

  constructor() {
    // Đường dẫn tới script Python
    this.scriptPath = path.resolve(__dirname, '../../scraper/mikrotik_scraper.py');

    // Kiểm tra script tồn tại không
    if (!fs.existsSync(this.scriptPath)) {
      console.error(`Script không tồn tại tại đường dẫn: ${this.scriptPath}`);
    } else {
      console.log(`Đã tìm thấy script tại: ${this.scriptPath}`);
    }
  }

  /**
   * Lấy thông tin thiết bị MikroTik từ trang web chính thức
   * @param modelName Tên model của thiết bị (ví dụ: "RB4011", "CCR2004")
   * @returns Thông tin chi tiết về thiết bị
   */
  async getDeviceInfo(modelName: string): Promise<MikrotikDeviceInfo> {
    try {
      // Tránh lỗi shell injection bằng cách lọc tên model
      const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '');
      
      const { stdout, stderr } = await execPromise(`python3 ${this.scriptPath} --model ${sanitizedModelName}`);
      
      if (stderr) {
        console.error(`Lỗi khi lấy thông tin thiết bị: ${stderr}`);
        return { 
          model: sanitizedModelName, 
          url: '', 
          error: 'Lỗi khi lấy thông tin thiết bị' 
        };
      }
      
      const result = JSON.parse(stdout);
      
      if (result.device?.error) {
        return { 
          model: sanitizedModelName, 
          url: '',
          error: result.device.error 
        };
      }
      
      return result.device;
    } catch (error) {
      console.error('Lỗi khi thực thi script lấy thông tin thiết bị:', error);
      return { 
        model: modelName, 
        url: '', 
        error: 'Lỗi khi thực thi script lấy thông tin thiết bị' 
      };
    }
  }

  /**
   * Lấy thông tin về phiên bản RouterOS
   * @param version Phiên bản RouterOS cụ thể (tùy chọn)
   * @returns Thông tin về phiên bản RouterOS
   */
  async getRouterOSInfo(version?: string): Promise<RouterOSVersionInfo | Record<string, RouterOSVersionInfo>> {
    try {
      let command = `python3 ${this.scriptPath} --routeros`;
      
      if (version) {
        // Tránh lỗi shell injection bằng cách lọc phiên bản
        const sanitizedVersion = version.replace(/[^0-9.]/g, '');
        command += ` ${sanitizedVersion}`;
      }
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr) {
        console.error(`Lỗi khi lấy thông tin RouterOS: ${stderr}`);
        return { 
          version: version || 'unknown', 
          release_date: '',
          error: 'Lỗi khi lấy thông tin RouterOS' 
        };
      }
      
      const result = JSON.parse(stdout);
      
      if (version) {
        if (result.routeros?.error) {
          return {
            version: version,
            release_date: '',
            error: result.routeros.error
          };
        }
        return result.routeros;
      } else {
        return result.routeros_versions;
      }
    } catch (error) {
      console.error('Lỗi khi thực thi script lấy thông tin RouterOS:', error);
      return { 
        version: version || 'unknown', 
        release_date: '',
        error: 'Lỗi khi thực thi script lấy thông tin RouterOS' 
      };
    }
  }

  /**
   * Cập nhật thông tin thiết bị từ trang web chính thức
   * @param device Thiết bị cần cập nhật thông tin
   */
  async enrichDeviceInfo(device: any): Promise<any> {
    try {
      if (!device || !device.model) {
        return device;
      }

      // Lấy thông tin chi tiết từ trang web
      const deviceInfo = await this.getDeviceInfo(device.model);
      
      if (deviceInfo.error) {
        console.warn(`Không thể lấy thêm thông tin cho thiết bị ${device.model}: ${deviceInfo.error}`);
        return device;
      }

      // Cập nhật thông tin thiết bị từ dữ liệu lấy được
      const updatedDevice = { ...device };
      
      // Cập nhật các trường cụ thể nếu chưa có
      if (!updatedDevice.cpu && deviceInfo.cpu) {
        updatedDevice.cpu = deviceInfo.cpu;
      }
      
      if (!updatedDevice.totalMemory && deviceInfo.memory) {
        updatedDevice.totalMemory = deviceInfo.memory;
      }
      
      if (!updatedDevice.storage && deviceInfo.storage) {
        updatedDevice.storage = deviceInfo.storage;
      }
      
      return updatedDevice;
    } catch (error) {
      console.error('Lỗi khi làm phong phú thông tin thiết bị:', error);
      return device;
    }
  }
}

// Tạo instance để sử dụng trong ứng dụng
export const deviceInfoService = new DeviceInfoService();