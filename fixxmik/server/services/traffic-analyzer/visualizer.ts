import { TrafficData } from "./parser";

/**
 * Resamples time-series traffic data to a specified time interval
 *
 * @param data Array of traffic data
 * @param resampleRule Time interval for resampling (hourly, daily, etc.)
 * @param valueField Field to sum during resampling
 * @returns Resampled data with timestamps and values
 */
export function resampleTrafficData(
  data: TrafficData[],
  resampleRule: "hourly" | "daily" | "weekly" = "hourly",
  valueField: "bytes" = "bytes",
): { timestamp: Date; value: number }[] {
  if (!data.length) return [];

  // Sort data by timestamp
  const sortedData = [...data].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  // Get min and max timestamps
  const minTime = sortedData[0].timestamp;
  const maxTime = sortedData[sortedData.length - 1].timestamp;

  // Create time buckets based on resample rule
  const buckets = new Map<string, number>();

  // Helper function to get bucket key based on timestamp and rule
  const getBucketKey = (
    date: Date,
    rule: "hourly" | "daily" | "weekly",
  ): string => {
    if (rule === "hourly") {
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
    } else if (rule === "daily") {
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    } else {
      // weekly
      // Get the week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear =
        (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil(
        (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7,
      );
      return `${date.getFullYear()}-W${weekNum}`;
    }
  };

  // Group data into buckets
  for (const entry of sortedData) {
    const key = getBucketKey(entry.timestamp, resampleRule);
    const value = entry[valueField] || 0;
    buckets.set(key, (buckets.get(key) || 0) + value);
  }

  // Convert buckets back to array with proper timestamps
  const result = Array.from(buckets.entries())
    .map(([key, value]) => {
      let timestamp: Date;

      if (resampleRule === "hourly") {
        const [year, month, day, hour] = key.split("-").map(Number);
        timestamp = new Date(year, month - 1, day, hour);
      } else if (resampleRule === "daily") {
        const [year, month, day] = key.split("-").map(Number);
        timestamp = new Date(year, month - 1, day);
      } else {
        // Parse week format (e.g., 2023-W1)
        const [year, weekPart] = key.split("-");
        const weekNum = parseInt(weekPart.substring(1));

        // Calculate the date of the first day of the week
        const firstDayOfYear = new Date(Number(year), 0, 1);
        const daysOffset = 1 - firstDayOfYear.getDay(); // Adjust to start from Monday
        const firstMonday = new Date(Number(year), 0, daysOffset);

        timestamp = new Date(firstMonday);
        timestamp.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
      }

      return { timestamp, value };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return result;
}

/**
 * Calculate bandwidth usage over time
 */
export function calculateBandwidthOverTime(
  data: TrafficData[],
  resampleRule: "hourly" | "daily" | "weekly" = "hourly",
): { timestamp: Date; megabytes: number }[] {
  const resampled = resampleTrafficData(data, resampleRule, "bytes");

  // Convert bytes to megabytes
  return resampled.map((item) => ({
    timestamp: item.timestamp,
    megabytes: item.value / (1024 * 1024),
  }));
}

/**
 * Calculate connections over time
 */
export function calculateConnectionsOverTime(
  data: TrafficData[],
  resampleRule: "hourly" | "daily" | "weekly" = "hourly",
): { timestamp: Date; count: number }[] {
  // Sort data by timestamp
  const sortedData = [...data].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  // Create time buckets based on resample rule
  const buckets = new Map<string, number>();

  // Helper function to get bucket key based on timestamp and rule
  const getBucketKey = (
    date: Date,
    rule: "hourly" | "daily" | "weekly",
  ): string => {
    if (rule === "hourly") {
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
    } else if (rule === "daily") {
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    } else {
      // weekly
      // Get the week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear =
        (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil(
        (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7,
      );
      return `${date.getFullYear()}-W${weekNum}`;
    }
  };

  // Count connections in each bucket
  for (const entry of sortedData) {
    const key = getBucketKey(entry.timestamp, resampleRule);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  // Convert buckets back to array with proper timestamps
  const result = Array.from(buckets.entries())
    .map(([key, count]) => {
      let timestamp: Date;

      if (resampleRule === "hourly") {
        const [year, month, day, hour] = key.split("-").map(Number);
        timestamp = new Date(year, month - 1, day, hour);
      } else if (resampleRule === "daily") {
        const [year, month, day] = key.split("-").map(Number);
        timestamp = new Date(year, month - 1, day);
      } else {
        // Parse week format (e.g., 2023-W1)
        const [year, weekPart] = key.split("-");
        const weekNum = parseInt(weekPart.substring(1));

        // Calculate the date of the first day of the week
        const firstDayOfYear = new Date(Number(year), 0, 1);
        const daysOffset = 1 - firstDayOfYear.getDay(); // Adjust to start from Monday
        const firstMonday = new Date(Number(year), 0, daysOffset);

        timestamp = new Date(firstMonday);
        timestamp.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
      }

      return { timestamp, count };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return result;
}

/**
 * Calculate protocol distribution
 */
export function calculateProtocolDistribution(
  data: TrafficData[],
): { protocol: string; count: number }[] {
  const protocols = new Map<string, number>();

  for (const entry of data) {
    if (entry.protocol) {
      protocols.set(entry.protocol, (protocols.get(entry.protocol) || 0) + 1);
    }
  }

  return Array.from(protocols.entries())
    .map(([protocol, count]) => ({ protocol, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate hourly traffic heatmap data
 */
export function calculateHourlyTrafficHeatmap(
  data: TrafficData[],
): { dayOfWeek: number; hour: number; value: number }[] {
  const heatmapData = new Map<string, number>();

  // Initialize all hour and day combinations
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmapData.set(`${day}-${hour}`, 0);
    }
  }

  // Aggregate traffic by day of week and hour
  for (const entry of data) {
    const dayOfWeek = entry.timestamp.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = entry.timestamp.getHours();
    const key = `${dayOfWeek}-${hour}`;

    if (entry.bytes) {
      heatmapData.set(key, (heatmapData.get(key) || 0) + entry.bytes);
    } else {
      // If no bytes data, just count occurrences
      heatmapData.set(key, (heatmapData.get(key) || 0) + 1);
    }
  }

  // Convert to array format
  return Array.from(heatmapData.entries()).map(([key, value]) => {
    const [day, hour] = key.split("-").map(Number);
    return {
      dayOfWeek: day,
      hour,
      value: entry.bytes ? value / (1024 * 1024) : value, // Convert to MB if bytes
    };
  });
}

/**
 * Calculate top IPs by traffic volume
 */
export function calculateTopIpsByTraffic(
  data: TrafficData[],
  ipColumn: "src_ip" | "dst_ip",
  topN: number = 10,
): { ip: string; megabytes: number }[] {
  const ipTraffic = new Map<string, number>();

  for (const entry of data) {
    const ip = entry[ipColumn];
    if (ip && entry.bytes) {
      ipTraffic.set(ip, (ipTraffic.get(ip) || 0) + entry.bytes);
    }
  }

  return Array.from(ipTraffic.entries())
    .map(([ip, bytes]) => ({ ip, megabytes: bytes / (1024 * 1024) }))
    .sort((a, b) => b.megabytes - a.megabytes)
    .slice(0, topN);
}

/**
 * Calculate top ports by traffic or connection count
 */
export function calculateTopPorts(
  data: TrafficData[],
  metric: "traffic" | "connections" = "connections",
  topN: number = 10,
): { port: number; value: number }[] {
  const portMetrics = new Map<number, number>();

  for (const entry of data) {
    if (entry.dst_port !== undefined) {
      if (metric === "traffic" && entry.bytes) {
        portMetrics.set(
          entry.dst_port,
          (portMetrics.get(entry.dst_port) || 0) + entry.bytes,
        );
      } else {
        portMetrics.set(
          entry.dst_port,
          (portMetrics.get(entry.dst_port) || 0) + 1,
        );
      }
    }
  }

  return Array.from(portMetrics.entries())
    .map(([port, value]) => ({
      port,
      value: metric === "traffic" ? value / (1024 * 1024) : value, // Convert to MB if traffic
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}
