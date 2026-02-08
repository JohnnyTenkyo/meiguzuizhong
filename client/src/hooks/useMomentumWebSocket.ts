import { useEffect, useRef, useState, useCallback } from 'react';

interface MomentumData {
  buyLine: number;
  sellLine: number;
  diffBar: number;
  trend: string;
  timestamp: number;
}

interface MomentumMessage {
  type: string;
  symbol: string;
  data?: MomentumData;
  error?: string;
}

export function useMomentumWebSocket(symbol: string) {
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // 构建WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/momentum`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MomentumWS] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // 订阅股票动能数据
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbol: symbol,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: MomentumMessage = JSON.parse(event.data);
          
          if (message.type === 'momentum' && message.symbol === symbol) {
            if (message.error) {
              setError(message.error);
            } else if (message.data) {
              setMomentum(message.data);
              setError(null);
            }
          }
        } catch (err) {
          console.error('[MomentumWS] Error parsing message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[MomentumWS] Error:', event);
        setError('WebSocket连接错误');
      };

      ws.onclose = () => {
        console.log('[MomentumWS] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // 自动重连（最多尝试5次）
        if (reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          console.log(`[MomentumWS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('WebSocket连接失败，已达到最大重试次数');
        }
      };
    } catch (err) {
      console.error('[MomentumWS] Connection error:', err);
      setError('无法建立WebSocket连接');
    }
  }, [symbol]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // 取消订阅
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          symbol: symbol,
        }));
      }
      
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [symbol]);

  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'refresh',
        symbol: symbol,
      }));
    }
  }, [symbol]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    momentum,
    isConnected,
    error,
    refresh,
    connect,
    disconnect,
  };
}
