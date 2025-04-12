import { format } from "date-fns";

// Interface for traffic data
export interface TrafficData {
  timestamp: Date;
  src_ip?: string;
  dst_ip?: string;
  protocol?: string;
  src_port?: number;
  dst_port?: number;
  bytes?: number;
}

/**
 * Parse Mikrotik log file content and convert it to structured data.
 * Handles various common Mikrotik log formats.
 *
 * @param logContent The content of the log file
 * @returns Array of TrafficData objects
 */
export function parseMikrotikLogs(logContent: string): TrafficData[] {
  // Skip empty lines and comments
  const lines = logContent
    .trim()
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"));

  if (!lines.length) {
    return [];
  }

  // Try to determine the log format and parse accordingly
  if (lines[0].includes("=")) {
    return parseKeyValueFormat(lines);
  } else if (lines[0].includes(",")) {
    return parseCsvFormat(logContent);
  } else {
    return parseSpaceDelimitedFormat(lines);
  }
}

/**
 * Parse logs in key-value format (e.g., src-ip=192.168.1.1 dst-ip=8.8.8.8)
 */
function parseKeyValueFormat(lines: string[]): TrafficData[] {
  const result: TrafficData[] = [];

  // Regular expressions for parsing
  const timestampPatterns = [
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/, // 2023-10-05 08:23:45
    /(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/, // Oct  5 08:23:45
    /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/, // 10/5/2023 08:23:45
  ];

  const kvPattern = /([a-zA-Z0-9_-]+)=([^"\s]+|"[^"]*")/g;

  for (const line of lines) {
    const entry: Partial<TrafficData> = {};

    // Try to extract timestamp
    for (const pattern of timestampPatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const dateStr = match[1];
          let timestamp: Date | null = null;

          // Try different date formats
          const formats = [
            "yyyy-MM-dd HH:mm:ss",
            "MMM d HH:mm:ss",
            "M/d/yyyy HH:mm:ss",
          ];

          for (const dateFormat of formats) {
            try {
              timestamp = new Date(dateStr);
              if (!isNaN(timestamp.getTime())) {
                break;
              }
            } catch {
              continue;
            }
          }

          if (timestamp && !isNaN(timestamp.getTime())) {
            entry.timestamp = timestamp;
          }
        } catch (e) {
          console.error("Error parsing timestamp:", e);
        }
        break;
      }
    }

    // Extract key-value pairs
    let match;
    while ((match = kvPattern.exec(line)) !== null) {
      const [, key, value] = match;

      // Remove quotes if present
      let cleanValue = value;
      if (value.startsWith('"') && value.endsWith('"')) {
        cleanValue = value.slice(1, -1);
      }

      const keyName = standardizeKeyName(key);

      if (
        keyName === "bytes" ||
        keyName === "src_port" ||
        keyName === "dst_port"
      ) {
        entry[keyName] = parseInt(cleanValue, 10);
      } else {
        entry[keyName] = cleanValue;
      }
    }

    // Only add if we have at least a timestamp
    if (entry.timestamp) {
      result.push(entry as TrafficData);
    }
  }

  return result;
}

/**
 * Parse logs in CSV format
 */
function parseCsvFormat(content: string): TrafficData[] {
  const result: TrafficData[] = [];

  // Basic CSV parsing - split by commas and process
  const lines = content.trim().split("\n");

  // Extract headers from first line
  const headers = lines[0].split(",").map((h) => standardizeKeyName(h.trim()));

  // Process data lines
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());

    if (values.length !== headers.length) {
      continue; // Skip malformed lines
    }

    const entry: Partial<TrafficData> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j];

      if (header === "timestamp" || header === "time") {
        try {
          const timestamp = new Date(value);
          if (!isNaN(timestamp.getTime())) {
            entry.timestamp = timestamp;
          }
        } catch (e) {
          console.error("Error parsing CSV timestamp:", e);
        }
      } else if (
        header === "bytes" ||
        header === "src_port" ||
        header === "dst_port"
      ) {
        entry[header] = parseInt(value, 10);
      } else if (Object.keys(TrafficData).includes(header)) {
        entry[header] = value;
      }
    }

    // Only add if we have at least a timestamp
    if (entry.timestamp) {
      result.push(entry as TrafficData);
    }
  }

  return result;
}

/**
 * Parse logs in space-delimited format
 */
function parseSpaceDelimitedFormat(lines: string[]): TrafficData[] {
  const result: TrafficData[] = [];

  for (const line of lines) {
    try {
      const parts = line.trim().split(/\s+/);

      // Need at least a few parts to be valid
      if (parts.length < 3) {
        continue;
      }

      const entry: Partial<TrafficData> = {};

      // First try to extract timestamp (usually first 1-2 fields)
      let timestampStr = parts[0];
      if (!timestampStr.includes(":") && parts[1] && parts[1].includes(":")) {
        timestampStr = `${parts[0]} ${parts[1]}`;
        parts.splice(0, 2);
      } else {
        parts.splice(0, 1);
      }

      try {
        const timestamp = new Date(timestampStr);
        if (!isNaN(timestamp.getTime())) {
          entry.timestamp = timestamp;
        }
      } catch (e) {
        console.error("Error parsing space-delimited timestamp:", e);
        continue; // Skip if we can't parse the timestamp
      }

      // Process remaining fields as key-value pairs where possible
      for (let i = 0; i < parts.length - 1; i += 2) {
        let key = parts[i].toLowerCase();
        const value = parts[i + 1];

        // Handle field names that might have colons
        if (key.endsWith(":")) {
          key = key.slice(0, -1);
        }

        const keyName = standardizeKeyName(key);

        if (
          keyName === "bytes" ||
          keyName === "src_port" ||
          keyName === "dst_port"
        ) {
          entry[keyName] = parseInt(value, 10);
        } else {
          entry[keyName] = value;
        }
      }

      // Only add if we have at least a timestamp
      if (entry.timestamp) {
        result.push(entry as TrafficData);
      }
    } catch (e) {
      console.error("Error parsing line:", e);
    }
  }

  return result;
}

/**
 * Standardize key names to match our data structure
 */
function standardizeKeyName(key: string): string {
  key = key.toLowerCase().trim();

  // Map common field variations to our standard names
  const fieldMappings: Record<string, string> = {
    source_ip: "src_ip",
    "source-ip": "src_ip",
    "src-ip": "src_ip",
    destination_ip: "dst_ip",
    "destination-ip": "dst_ip",
    "dst-ip": "dst_ip",
    source_port: "src_port",
    "source-port": "src_port",
    "src-port": "src_port",
    destination_port: "dst_port",
    "destination-port": "dst_port",
    "dst-port": "dst_port",
    proto: "protocol",
    byte: "bytes",
    time: "timestamp",
  };

  return fieldMappings[key] || key;
}

/**
 * Process traffic data to compute various statistics
 */
export function processTrafficData(data: TrafficData[]): Record<string, any> {
  const stats: Record<string, any> = {};

  // Basic statistics
  stats.total_records = data.length;

  // Bytes statistics
  if (data.some((entry) => entry.bytes !== undefined)) {
    const totalBytes = data.reduce((sum, entry) => sum + (entry.bytes || 0), 0);
    stats.total_bytes = totalBytes;
    stats.total_mb = totalBytes / 1024 ** 2;
    stats.total_gb = totalBytes / 1024 ** 3;
    stats.avg_bytes_per_record = totalBytes / data.length;
  }

  // IP statistics
  if (data.some((entry) => entry.src_ip)) {
    const srcIps = data
      .map((entry) => entry.src_ip)
      .filter(Boolean) as string[];
    const uniqueSources = [...new Set(srcIps)];
    stats.unique_sources = uniqueSources.length;

    // Count occurrences of each source IP
    const srcIpCounts = srcIps.reduce(
      (counts, ip) => {
        counts[ip] = (counts[ip] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    // Get top 10 source IPs by occurrence
    stats.top_sources = Object.entries(srcIpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get top sources by traffic volume
    if (data.some((entry) => entry.bytes !== undefined)) {
      const ipTraffic: Record<string, number> = {};

      for (const entry of data) {
        if (entry.src_ip && entry.bytes) {
          ipTraffic[entry.src_ip] =
            (ipTraffic[entry.src_ip] || 0) + entry.bytes;
        }
      }

      stats.top_sources_by_traffic = Object.entries(ipTraffic)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }
  }

  // Destination IP statistics
  if (data.some((entry) => entry.dst_ip)) {
    const dstIps = data
      .map((entry) => entry.dst_ip)
      .filter(Boolean) as string[];
    const uniqueDestinations = [...new Set(dstIps)];
    stats.unique_destinations = uniqueDestinations.length;

    // Count occurrences of each destination IP
    const dstIpCounts = dstIps.reduce(
      (counts, ip) => {
        counts[ip] = (counts[ip] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    // Get top 10 destination IPs by occurrence
    stats.top_destinations = Object.entries(dstIpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get top destinations by traffic volume
    if (data.some((entry) => entry.bytes !== undefined)) {
      const ipTraffic: Record<string, number> = {};

      for (const entry of data) {
        if (entry.dst_ip && entry.bytes) {
          ipTraffic[entry.dst_ip] =
            (ipTraffic[entry.dst_ip] || 0) + entry.bytes;
        }
      }

      stats.top_destinations_by_traffic = Object.entries(ipTraffic)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }
  }

  // Protocol statistics
  if (data.some((entry) => entry.protocol)) {
    const protocols = data
      .map((entry) => entry.protocol)
      .filter(Boolean) as string[];

    // Count occurrences of each protocol
    const protocolCounts = protocols.reduce(
      (counts, protocol) => {
        counts[protocol] = (counts[protocol] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    stats.protocol_distribution = Object.entries(protocolCounts).sort(
      (a, b) => b[1] - a[1],
    );
  }

  // Time-based statistics
  if (data.length > 0) {
    const timestamps = data.map((entry) => entry.timestamp);

    stats.timespan = {
      start: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
      end: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
    };

    // Duration in hours
    stats.timespan.duration_hours =
      (stats.timespan.end.getTime() - stats.timespan.start.getTime()) /
      (1000 * 60 * 60);

    // Traffic by hour of day
    const hourlyTraffic: Record<number, number> = {};
    const hourlyConnections: Record<number, number> = {};

    for (const entry of data) {
      const hour = entry.timestamp.getHours();

      hourlyConnections[hour] = (hourlyConnections[hour] || 0) + 1;

      if (entry.bytes) {
        hourlyTraffic[hour] = (hourlyTraffic[hour] || 0) + entry.bytes;
      }
    }

    stats.traffic_by_hour = Object.entries(hourlyTraffic)
      .map(([hour, bytes]) => ({ hour: parseInt(hour), bytes }))
      .sort((a, b) => a.hour - b.hour);

    stats.connections_by_hour = Object.entries(hourlyConnections)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour);

    // Traffic by day of week
    const dailyTraffic: Record<string, number> = {};
    const dailyConnections: Record<string, number> = {};

    for (const entry of data) {
      const day = entry.timestamp.toLocaleDateString("en-US", {
        weekday: "long",
      });

      dailyConnections[day] = (dailyConnections[day] || 0) + 1;

      if (entry.bytes) {
        dailyTraffic[day] = (dailyTraffic[day] || 0) + entry.bytes;
      }
    }

    stats.traffic_by_day = Object.entries(dailyTraffic).map(([day, bytes]) => ({
      day,
      bytes,
    }));

    stats.connections_by_day = Object.entries(dailyConnections).map(
      ([day, count]) => ({ day, count }),
    );
  }

  // Port statistics
  if (data.some((entry) => entry.dst_port)) {
    const dstPorts = data
      .map((entry) => entry.dst_port)
      .filter(Boolean) as number[];

    // Count occurrences of each port
    const portCounts = dstPorts.reduce(
      (counts, port) => {
        counts[port] = (counts[port] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    // Get top 10 destination ports by occurrence
    stats.top_destination_ports = Object.entries(portCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([port, count]) => ({ port: parseInt(port), count }));

    // Get top ports by traffic volume
    if (data.some((entry) => entry.bytes !== undefined)) {
      const portTraffic: Record<number, number> = {};

      for (const entry of data) {
        if (entry.dst_port !== undefined && entry.bytes) {
          portTraffic[entry.dst_port] =
            (portTraffic[entry.dst_port] || 0) + entry.bytes;
        }
      }

      stats.top_ports_by_traffic = Object.entries(portTraffic)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([port, bytes]) => ({ port: parseInt(port), bytes }));
    }
  }

  return stats;
}
