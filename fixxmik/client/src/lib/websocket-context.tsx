import React, { createContext, useContext, ReactNode } from "react";
import useWebSocket, { WebSocketStatus } from "../hooks/useWebSocket";

// Define the shape of the WebSocket context data
interface WebSocketContextData {
  status: WebSocketStatus;
  lastMessage: any;
  sendMessage: (
    data: string | ArrayBufferView | ArrayBufferLike | Blob,
  ) => boolean;
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
  unsubscribe: (eventType: string, handler?: (data: any) => void) => void;
  reconnect: () => void;
  disconnect: () => void;
}

// Tạo một giá trị mặc định đầy đủ để tránh lỗi null
const defaultContextValue: WebSocketContextData = {
  status: "CLOSED",
  lastMessage: null,
  sendMessage: () => false,
  subscribe: () => () => {},
  unsubscribe: () => {},
  reconnect: () => {},
  disconnect: () => {},
};

// Create context with default values
const WebSocketContext =
  createContext<WebSocketContextData>(defaultContextValue);

// Context provider component
interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const websocket = useWebSocket();

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to access WebSocket context
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  // Không cần kiểm tra null vì đã có giá trị mặc định
  return context;
};

export default WebSocketContext;
