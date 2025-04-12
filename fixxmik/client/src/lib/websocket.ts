import { queryClient } from "./queryClient";
import { WebSocketMessage } from "@shared/zod";

let socket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

export function connectWebSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  // Close existing socket if there is one
  if (socket) {
    socket.close();
  }

  // Create WebSocket URL
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  // Create new WebSocket connection
  socket = new WebSocket(wsUrl);

  // Event handlers
  socket.onopen = () => {
    console.log("WebSocket connection established");
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      handleWebSocketMessage(message);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");

    // Attempt to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        console.log(
          `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
        );
        connectWebSocket();
      }, RECONNECT_DELAY);
    } else {
      console.error(
        "Maximum reconnect attempts reached. WebSocket connection failed.",
      );
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
}

function handleWebSocketMessage(message: WebSocketMessage) {
  switch (message.type) {
    case "FIREWALL_RULE_UPDATE":
      // Invalidate firewall rules query for the specific device
      const deviceId = message.payload.deviceId;
      queryClient.invalidateQueries({
        queryKey: ["/api/devices", deviceId, "firewall-rules"],
      });
      break;

    case "DEVICE_STATUS_UPDATE":
      // Invalidate devices query
      queryClient.invalidateQueries({
        queryKey: ["/api/devices"],
      });
      break;

    case "TRAFFIC_UPDATE":
      // Invalidate metrics query for the specific device
      queryClient.invalidateQueries({
        queryKey: ["/api/devices", message.payload.deviceId, "metrics"],
      });
      break;

    case "SECURITY_ALERT":
      // Invalidate alerts query when new security alert detected
      queryClient.invalidateQueries({
        queryKey: ["/api/alerts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/security/anomalies"],
      });

      // También se podría mostrar una notificación al usuario
      console.warn("Security alert detected:", message.payload);
      break;

    case "CONNECTION_ESTABLISHED":
      console.log(
        "WebSocket connection established at:",
        message.payload.timestamp,
      );
      break;

    case "ERROR":
      console.error("WebSocket error message:", message.payload);
      break;
  }
}

export function sendWebSocketMessage(message: any): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.error("WebSocket not connected. Cannot send message.");
  }
}

export function closeWebSocket(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }
}
