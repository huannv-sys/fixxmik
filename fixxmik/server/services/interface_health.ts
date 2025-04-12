import { Interface } from "@shared/schema";

/**
 * Interface Health Score definition
 * 100 - Perfect: No errors, connection is up, optimal performance
 * 90-99 - Good: Minor issues, negligible errors, connection stable
 * 70-89 - Moderate: Some packet drops or minor errors, connection stable
 * 50-69 - Concerning: Significant errors or packet drops
 * 20-49 - Poor: High error rate, connection unstable but functioning
 * 0-19 - Critical: Connection down or extremely unstable
 */
export interface InterfaceHealth {
  score: number;
  status: "perfect" | "good" | "moderate" | "concerning" | "poor" | "critical";
  details: string[];
}

export class InterfaceHealthService {
  /**
   * Calculate a health score for an interface based on its performance metrics
   */
  calculateHealthScore(iface: Interface): InterfaceHealth {
    // Initialize with perfect score
    let score = 100;
    const details: string[] = [];

    // Check if interface is up
    if (iface.isUp !== true) {
      score = 0;
      details.push("Interface is down");
      return {
        score,
        status: "critical",
        details,
      };
    }

    // Check for errors and reduce score accordingly
    if (iface.txErrors != null && iface.txErrors > 0) {
      const reduction = Math.min(30, iface.txErrors * 2); // Max reduction of 30 points
      score -= reduction;
      details.push(`Transmit errors: ${iface.txErrors}`);
    }

    if (iface.rxErrors != null && iface.rxErrors > 0) {
      const reduction = Math.min(30, iface.rxErrors * 2); // Max reduction of 30 points
      score -= reduction;
      details.push(`Receive errors: ${iface.rxErrors}`);
    }

    // Check for packet drops
    if (iface.txDrops != null && iface.txDrops > 0) {
      const reduction = Math.min(20, iface.txDrops); // Max reduction of 20 points
      score -= reduction;
      details.push(`Transmit drops: ${iface.txDrops}`);
    }

    if (iface.rxDrops != null && iface.rxDrops > 0) {
      const reduction = Math.min(20, iface.rxDrops); // Max reduction of 20 points
      score -= reduction;
      details.push(`Receive drops: ${iface.rxDrops}`);
    }

    // Check for link stability
    if (iface.linkDowns != null && iface.linkDowns > 0) {
      const reduction = Math.min(40, iface.linkDowns * 10); // Max reduction of 40 points
      score -= reduction;
      details.push(`Link down events: ${iface.linkDowns}`);
    }

    // If there are no detected issues, add a positive note
    if (details.length === 0) {
      details.push("No issues detected");
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Determine status based on score
    let status:
      | "perfect"
      | "good"
      | "moderate"
      | "concerning"
      | "poor"
      | "critical";
    if (score === 100) status = "perfect";
    else if (score >= 90) status = "good";
    else if (score >= 70) status = "moderate";
    else if (score >= 50) status = "concerning";
    else if (score >= 20) status = "poor";
    else status = "critical";

    return {
      score,
      status,
      details,
    };
  }

  /**
   * Get the color class based on health score
   */
  getHealthScoreColorClass(score: number): string {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-yellow-500";
    if (score >= 20) return "text-orange-500";
    return "text-red-500";
  }

  /**
   * Get the background color class based on health score
   */
  getHealthScoreBackgroundClass(score: number): string {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-yellow-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
  }
}

export const interfaceHealthService = new InterfaceHealthService();
