// type-safe runtime messenger
// discriminated union wrapper for chrome.runtime messaging

import type { MessageType, RuntimeMessage, Hit, Config } from '@/types/schemas';

/**
 * log entry payload for remote logging
 */
export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  source: 'content' | 'offscreen' | 'popup';
  message: string;
  context?: unknown;
  timestamp: number;
}

/**
 * message payload map
 * maps message types to their expected payloads
 */
export interface MessagePayloadMap {
  START_SCAN: undefined;
  STOP_SCAN: undefined;
  UPDATE_CONFIG: Config;
  NEW_HIT: Hit;
  PLAY_SOUND: { soundId: string };
  KEEP_ALIVE: { timestamp: number };
  LOG_ENTRY: LogEntry;
}

/**
 * message response map
 * maps message types to their expected return values
 */
export interface MessageResponseMap {
  START_SCAN: void;
  STOP_SCAN: void;
  UPDATE_CONFIG: void;
  NEW_HIT: void;
  PLAY_SOUND: void;
  KEEP_ALIVE: void;
  LOG_ENTRY: void;
}

/**
 * typed message structure
 */
export type TypedMessage<T extends MessageType = MessageType> = {
  type: T;
  payload: MessagePayloadMap[T];
};

/**
 * sends typed message to runtime
 * enforces payload and return type based on message type
 */
export async function sendMessage<T extends MessageType>(
  type: T,
  payload?: MessagePayloadMap[T]
): Promise<MessageResponseMap[T]> {
  const message: RuntimeMessage = { type, payload };
  return chrome.runtime.sendMessage(message);
}

/**
 * sends typed message to specific tab
 */
export async function sendTabMessage<T extends MessageType>(
  tabId: number,
  type: T,
  payload?: MessagePayloadMap[T]
): Promise<MessageResponseMap[T]> {
  const message: RuntimeMessage = { type, payload };
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * typed message handler
 */
export type MessageHandler<T extends MessageType> = (
  payload: MessagePayloadMap[T],
  sender: chrome.runtime.MessageSender
) => MessageResponseMap[T] | Promise<MessageResponseMap[T]>;

/**
 * registers typed message listener
 * returns cleanup function
 */
export function onMessage<T extends MessageType>(
  type: T,
  handler: MessageHandler<T>
): () => void {
  const listener = (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponseMap[T]) => void
  ) => {
    if (message.type !== type) return false;

    const result = handler(message.payload as MessagePayloadMap[T], sender);

    if (result instanceof Promise) {
      result.then(sendResponse);
      return true; // async response
    }

    return false;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/**
 * safe json stringify - handles circular refs
 */
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
}

/**
 * sends remote log to service worker
 * for centralized debugging
 */
export function remoteLog(
  level: LogEntry['level'],
  source: LogEntry['source'],
  message: string,
  context?: unknown
): void {
  const entry: LogEntry = {
    level,
    source,
    message,
    context: context ? JSON.parse(safeStringify(context)) : undefined,
    timestamp: Date.now()
  };

  sendMessage('LOG_ENTRY', entry).catch(() => {
    // silent fail if sw not available
  });
}
