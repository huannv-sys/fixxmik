/**
 * Thư viện tiện ích để định dạng dữ liệu trong ứng dụng
 */

/**
 * Chuyển đổi giá trị byte sang đơn vị đọc được (KB, MB, GB, TB)
 * @param bytes Số byte cần chuyển đổi
 * @param toUnit Đơn vị đích (nếu không cung cấp, sẽ tự động chọn đơn vị phù hợp)
 * @param decimals Số lượng chữ số thập phân
 * @returns Giá trị đã được định dạng
 */
export const formatByteValue = (
  bytes: number,
  toUnit?: string,
  decimals = 2,
): string => {
  if (bytes === 0) return "0";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  if (toUnit) {
    const targetUnitIndex = sizes.indexOf(toUnit);
    if (targetUnitIndex !== -1) {
      return (bytes / Math.pow(k, targetUnitIndex)).toFixed(decimals);
    }
  }

  // Tự động xác định đơn vị phù hợp
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

  return value.toString();
};

/**
 * Xác định đơn vị phù hợp cho một giá trị byte
 * @param bytes Số byte cần xác định đơn vị
 * @param preferredIndex Chỉ số đơn vị ưu tiên (-1 để tự động xác định)
 * @returns Đơn vị phù hợp (Bytes, KB, MB, GB, TB, PB)
 */
export const formatUnit = (bytes: number, preferredIndex = -1): string => {
  if (bytes === 0) return "Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  // Nếu chỉ định một đơn vị (index) ưu tiên, sử dụng đơn vị đó nếu hợp lệ
  if (preferredIndex >= 0 && preferredIndex < sizes.length) {
    return sizes[preferredIndex];
  }

  // Nếu không, xác định đơn vị phù hợp nhất
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Đảm bảo index không vượt quá mảng sizes
  return sizes[Math.min(i, sizes.length - 1)];
};

/**
 * Chuyển đổi giá trị byte sang chuỗi đọc được với đơn vị phù hợp
 * @param bytes Số byte cần chuyển đổi
 * @param decimals Số lượng chữ số thập phân
 * @param spaceBeforeUnit Có thêm khoảng trắng trước đơn vị không
 * @returns Chuỗi đã được định dạng với đơn vị (ví dụ: "1.5 GB")
 */
export const formatBytes = (
  bytes: number,
  decimals = 2,
  spaceBeforeUnit = true,
): string => {
  if (bytes === 0) return "0 Bytes";

  const unit = formatUnit(bytes);
  const value = formatByteValue(bytes, unit, decimals);

  return `${value}${spaceBeforeUnit ? " " : ""}${unit}`;
};

/**
 * Chuyển đổi giá trị byte/giây sang chuỗi đọc được với đơn vị tốc độ phù hợp
 * @param bytesPerSec Số byte/giây cần chuyển đổi
 * @param decimals Số lượng chữ số thập phân
 * @param spaceBeforeUnit Có thêm khoảng trắng trước đơn vị không
 * @returns Chuỗi đã được định dạng với đơn vị tốc độ (ví dụ: "1.5 MB/s")
 */
export const formatBytesPerSecond = (
  bytesPerSec: number,
  decimals = 2,
  spaceBeforeUnit = true,
): string => {
  if (bytesPerSec === 0) return "0 Bytes/s";

  const unit = formatUnit(bytesPerSec);
  const value = formatByteValue(bytesPerSec, unit, decimals);

  return `${value}${spaceBeforeUnit ? " " : ""}${unit}/s`;
};
