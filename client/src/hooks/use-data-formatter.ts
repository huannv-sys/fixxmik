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
 * Chuyển đổi giá trị bytes (tổng số) sang đơn vị hợp lý (B, KB, MB, GB, TB)
 * Sử dụng luôn cho các giá trị tích lũy dạng bytes
 */
export function formatAccumulatedBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024; // Dùng 1024 cho đơn vị dữ liệu (bytes)
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Chuyển đổi giá trị bytes tổng cộng sang Mbps cho mục đích hiển thị
 * Công thức: bytes * 8 / 1024^2 để chuyển đổi chính xác từ bytes sang Mbps
 */
export function bytesToMbps(bytesPerSecond: number): number {
  if (bytesPerSecond <= 0) return 0;
  
  // Chuyển đổi bytes/giây thành megabits/giây
  // 1 Mbps = 1,048,576 bits/giây (1024*1024) 
  // Đầu tiên chuyển đổi bytes sang bits (nhân 8), sau đó chia cho 1024*1024
  return (bytesPerSecond * 8) / (1024 * 1024);
}

/**
 * Định dạng byte rate thành Mbps hoặc Gbps với định dạng đọc được
 */
export function formatBandwidth(bytesPerSecond: number, decimals = 2): string {
  // Đối với giá trị tích lũy lớn, sử dụng hàm bytesToMbps đã sửa
  const mbps = bytesToMbps(bytesPerSecond);
  
  // Giới hạn giá trị tối đa hiển thị để tránh biểu đồ quá lớn không hợp lý
  const cappedMbps = Math.min(mbps, 900); // Giới hạn tốc độ hiển thị tối đa ở 900 Mbps
  
  if (cappedMbps >= 100) {
    return `${(cappedMbps / 1000).toFixed(decimals)} Gbps`;
  } else {
    return `${cappedMbps.toFixed(decimals)} Mbps`;
  }
}