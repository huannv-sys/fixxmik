import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, alertSeverity, Device } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AlertsPage = () => {
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [showAcknowledged, setShowAcknowledged] = useState<boolean>(false);

  const handleDeviceChange = (value: string) => {
    setSelectedDeviceId(value === "all" ? null : parseInt(value));
  };

  const { data: devices } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: [
      "/api/alerts",
      { deviceId: selectedDeviceId, acknowledged: showAcknowledged },
    ],
  });

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been acknowledged successfully.",
      });
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      toast({
        title: "Error",
        description: "Failed to acknowledge the alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      const queryParams = selectedDeviceId
        ? `?deviceId=${selectedDeviceId}`
        : "";
      await apiRequest("POST", `/api/alerts/acknowledge-all${queryParams}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alerts Acknowledged",
        description: "All alerts have been acknowledged successfully.",
      });
    } catch (error) {
      console.error("Failed to acknowledge alerts:", error);
      toast({
        title: "Error",
        description: "Failed to acknowledge the alerts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatAlertTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case alertSeverity.ERROR:
        return "bg-red-900 border-red-700 text-red-50";
      case alertSeverity.WARNING:
        return "bg-amber-900 border-amber-700 text-amber-50";
      case alertSeverity.INFO:
      default:
        return "bg-blue-900 border-blue-700 text-blue-50";
    }
  };

  const getAlertIconColor = (severity: string) => {
    switch (severity) {
      case alertSeverity.ERROR:
        return "text-red-300";
      case alertSeverity.WARNING:
        return "text-amber-300";
      case alertSeverity.INFO:
      default:
        return "text-blue-300";
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case alertSeverity.ERROR:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case alertSeverity.WARNING:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case alertSeverity.INFO:
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  const getDeviceName = (deviceId: number) => {
    if (!devices) return "Unknown Device";
    const device = devices.find((d) => d.id === deviceId);
    return device?.name || "Unknown Device";
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Select
              value={selectedDeviceId?.toString() || "all"}
              onValueChange={handleDeviceChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices?.map((device) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
              className={
                showAcknowledged
                  ? "bg-primary text-white hover:bg-primary/90"
                  : ""
              }
            >
              {showAcknowledged ? "Show Active" : "Show Acknowledged"}
            </Button>
            {!showAcknowledged && (
              <Button onClick={handleAcknowledgeAll}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Acknowledge All
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`${getAlertColor(alert.severity)} border`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`${getAlertIconColor(alert.severity)} mt-1 sm:mt-0`}
                    >
                      {getAlertIcon(alert.severity)}
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <h3 className="font-medium text-white">
                          {alert.message}
                        </h3>
                        <span className="text-sm text-gray-200">
                          {getDeviceName(alert.deviceId)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        {alert.source}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatAlertTime(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                  {!showAcknowledged && (
                    <div className="mt-3 sm:mt-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-white"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Acknowledge
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No alerts found
            </h3>
            <p className="text-sm text-gray-500 text-center">
              {showAcknowledged
                ? "There are no acknowledged alerts at this time."
                : "There are no active alerts at this time. Everything is running smoothly!"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlertsPage;
