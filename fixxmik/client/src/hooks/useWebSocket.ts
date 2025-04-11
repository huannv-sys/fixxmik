import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket connection statuses
export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

// WebSocket event handler type
type EventHandler = (data: any) => void;

// WebSocket hook for managing connections
export const useWebSocket = () => {
  const [status, setStatus] = useState<WebSocketStatus>('CLOSED');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Event subscribers
  const eventSubscribersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  
  // Function to create a WebSocket connection
  const connect = useCallback(() => {
    // Close any existing connection
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
    
    // Create WebSocket URL - handle both HTTP and HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Update status and create new connection
    setStatus('CONNECTING');
    const socket = new WebSocket(wsUrl);
    webSocketRef.current = socket;
    
    // Event handlers
    socket.onopen = () => {
      setStatus('OPEN');
      console.log('WebSocket connection established');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        
        // Notify subscribers if event type is present
        if (data && data.type && eventSubscribersRef.current.has(data.type)) {
          const handlers = eventSubscribersRef.current.get(data.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data.payload);
              } catch (error) {
                console.error(`Error in event handler for ${data.type}:`, error);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onclose = (event) => {
      setStatus('CLOSED');
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        setStatus('RECONNECTING');
        connect();
      }, 3000); // 3 second delay
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return socket;
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const socket = connect();
    
    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [connect]);
  
  // Function to send a message through the WebSocket
  const sendMessage = useCallback((data: string | ArrayBufferView | ArrayBufferLike | Blob) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(data);
      return true;
    }
    return false;
  }, []);
  
  // Function to subscribe to specific event types
  const subscribe = useCallback((eventType: string, handler: EventHandler) => {
    if (!eventSubscribersRef.current.has(eventType)) {
      eventSubscribersRef.current.set(eventType, new Set());
    }
    
    const handlers = eventSubscribersRef.current.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }
    
    // Return unsubscribe function
    return () => {
      const handlers = eventSubscribersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);
  
  // Function to unsubscribe from specific event types
  const unsubscribe = useCallback((eventType: string, handler?: EventHandler) => {
    if (!eventSubscribersRef.current.has(eventType)) {
      return;
    }
    
    const handlers = eventSubscribersRef.current.get(eventType);
    if (!handlers) return;
    
    if (handler) {
      // Remove specific handler
      handlers.delete(handler);
    } else {
      // Remove all handlers for this event type
      eventSubscribersRef.current.delete(eventType);
    }
  }, []);
  
  // Function to manually reconnect
  const reconnect = useCallback(() => {
    setStatus('RECONNECTING');
    connect();
  }, [connect]);
  
  // Function to manually disconnect
  const disconnect = useCallback(() => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
  }, []);
  
  return {
    status,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    reconnect,
    disconnect,
    webSocket: webSocketRef.current
  };
};

export default useWebSocket;