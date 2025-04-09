/**
 * Các hàm tiện ích để định dạng dữ liệu
 */

/**
 * Chuyển đổi bytes sang dạng đơn vị đọc được (KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Chuyển đổi bits per second (bps) sang đơn vị mạng đọc được
 */
export function formatBitrate(bitsPerSecond: number, decimals = 2): string {
  if (bitsPerSecond === 0) return '0 bps';
  
  const k = 1000; // Sử dụng 1000 thay vì 1024 cho đơn vị mạng
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  const i = Math.floor(Math.log(bitsPerSecond) / Math.log(k));
  
  return parseFloat((bitsPerSecond / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Chuyển đổi bytes per second sang Mbps
 * 1 Byte = 8 bits, 1 Mbps = 1,000,000 bits per second
 * Vì vậy, 1 Mbps = 125,000 bytes per second
 */
export function bytesToMbps(bytesPerSecond: number): number {
  return bytesPerSecond / 125000;
}

/**
 * Định dạng byte rate thành Mbps hoặc Gbps với định dạng đọc được
 */
export function formatBandwidth(bytesPerSecond: number, decimals = 2): string {
  const mbps = bytesToMbps(bytesPerSecond);
  
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(decimals)} Gbps`;
  } else {
    return `${mbps.toFixed(decimals)} Mbps`;
  }
}