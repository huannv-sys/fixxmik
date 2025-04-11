/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format number with commas for thousands separator
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format a date in a friendly manner
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  
  if (diffMin < 1) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} min ago`;
  } else if (diffMin < 1440) {
    const hours = Math.floor(diffMin / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleString();
  }
}

/**
 * Truncate a string if it's too long
 */
export function truncate(str: string, length = 20): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}
