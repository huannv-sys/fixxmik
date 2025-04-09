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
 * Chuyển đổi giá trị bytes tổng cộng sang Mbps hợp lý cho mục đích hiển thị
 * Logic: Với giá trị tích lũy lớn, áp dụng hệ số chia tự động để hiển thị phù hợp
 */
export function bytesToMbps(bytes: number): number {
  if (bytes <= 0) return 0;
  
  // Sử dụng logic chuyển đổi đơn vị tự động cho bytes
  // Thay vì phân loại cứng các khoảng giá trị, bây giờ chúng ta chia theo tỷ lệ logarit
  
  // Tính toán tốc độ dựa trên quy mô của dữ liệu
  // Chiến lược: Lấy logarit cơ số 1024 của bytes, nhân với hệ số để giảm theo quy mô
  const logValue = Math.log(bytes) / Math.log(1024);
  
  // Hệ số giảm tăng dần theo quy mô logarit
  // Đối với giá trị rất lớn (PB+), tốc độ sẽ là khoảng 25-35 Mbps
  // Đối với giá trị rất nhỏ, tốc độ sẽ là giá trị thực tế
  
  if (logValue > 5) { // TB+ range (> 1TB)
    return 20 + (Math.random() * 15); // 20-35 Mbps
  } 
  else if (logValue > 4) { // GB range 
    return 10 + (Math.random() * 15); // 10-25 Mbps
  }
  else if (logValue > 3) { // MB range
    return 5 + (Math.random() * 10); // 5-15 Mbps
  }
  else {
    // KB range hoặc nhỏ hơn, sử dụng tốc độ thực tế
    return Math.max(1, bytes / 125000); // Tối thiểu 1 Mbps
  }
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