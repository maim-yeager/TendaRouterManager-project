// Native bridge interface for communicating with the Android host APK wrapper

import { NativeRequestConfig, NativeResponse, NetworkStateInfo } from '../types/router';

declare global {
  interface Window {
    TendaNative?: {
      detectGateway: () => string; // returns JSON string
      routerRequest: (requestId: string, configJson: string) => void;
      getNetworkState: () => string; // returns JSON string
      secureStore: (key: string, value: string) => boolean;
      secureRetrieve: (key: string) => string | null;
      deleteSecureData: (key: string) => boolean;
      getAppInfo: () => string; // returns JSON string
      copyToClipboard: (text: string) => boolean;
      showToast: (message: string) => void;
    };
    // Callback handler called by native Kotlin when async routerRequest completes
    __tendaNativeRequestCallback?: (requestId: string, responseJson: string) => void;
  }
}

// Map of pending async requests
const pendingRequests = new Map<
  string,
  {
    resolve: (res: NativeResponse) => void;
    reject: (err: Error) => void;
    timer: number;
  }
>();

// Register global native callback listener once
if (typeof window !== 'undefined') {
  window.__tendaNativeRequestCallback = (requestId: string, responseJson: string) => {
    const pending = pendingRequests.get(requestId);
    if (!pending) return;

    window.clearTimeout(pending.timer);
    pendingRequests.delete(requestId);

    try {
      const parsed: NativeResponse = JSON.parse(responseJson);
      pending.resolve(parsed);
    } catch (e) {
      pending.reject(new Error('Failed to parse native network response: ' + responseJson));
    }
  };
}

export class NativeBridge {
  static isNativeAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.TendaNative;
  }

  /**
   * Automatically detect gateway IP from active Android WiFi / DHCP info
   */
  static async detectGateway(): Promise<{
    gatewayIp: string;
    ssid: string;
    bssid: string;
    ipAddress: string;
    isWifi: boolean;
  }> {
    if (this.isNativeAvailable() && window.TendaNative?.detectGateway) {
      try {
        const raw = window.TendaNative.detectGateway();
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            gatewayIp: parsed.gatewayIp || '192.168.0.1',
            ssid: parsed.ssid || '',
            bssid: parsed.bssid || '',
            ipAddress: parsed.ipAddress || '',
            isWifi: parsed.isWifi ?? true,
          };
        }
      } catch (e) {
        console.warn('Native gateway detection failed:', e);
      }
    }

    // Default fallback
    return {
      gatewayIp: '192.168.0.1',
      ssid: 'Tenda_Router',
      bssid: '',
      ipAddress: '192.168.0.100',
      isWifi: true,
    };
  }

  /**
   * Execute an HTTP request through Android Native OkHttp engine to completely bypass
   * CORS, Mixed-Content, and Chrome Private Network Access restrictions for local routers.
   */
  static async executeRouterRequest(config: NativeRequestConfig): Promise<NativeResponse> {
    if (this.isNativeAvailable() && window.TendaNative?.routerRequest) {
      return new Promise<NativeResponse>((resolve, reject) => {
        const requestId = 'req_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        const timeoutMs = config.timeoutMs || 10000;

        const timer = window.setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            reject(new Error(`Native router request timed out after ${timeoutMs}ms: ${config.url}`));
          }
        }, timeoutMs + 2000);

        pendingRequests.set(requestId, { resolve, reject, timer });

        try {
          window.TendaNative!.routerRequest(requestId, JSON.stringify(config));
        } catch (err: any) {
          window.clearTimeout(timer);
          pendingRequests.delete(requestId);
          reject(new Error('Native bridge invocation failed: ' + (err.message || err)));
        }
      });
    }

    // Browser fallback (for preview/development testing)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 10000);

      const fetchOptions: RequestInit = {
        method: config.method,
        headers: config.headers,
        signal: controller.signal,
      };

      if (config.body && config.method !== 'GET') {
        fetchOptions.body = config.body;
      }

      const res = await fetch(config.url, fetchOptions);
      clearTimeout(timeoutId);

      const bodyText = await res.text();
      const headersObj: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headersObj[key.toLowerCase()] = value;
      });

      return {
        statusCode: res.status,
        statusText: res.statusText,
        headers: headersObj,
        body: bodyText,
      };
    } catch (e: any) {
      return {
        statusCode: 0,
        statusText: 'Network Error',
        headers: {},
        body: '',
        error: e.message || 'Request failed',
      };
    }
  }

  /**
   * Query native Android network connectivity
   */
  static async getNetworkState(): Promise<NetworkStateInfo> {
    if (this.isNativeAvailable() && window.TendaNative?.getNetworkState) {
      try {
        const raw = window.TendaNative.getNetworkState();
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Failed to get network state:', e);
      }
    }

    return {
      isConnected: navigator.onLine,
      isWifi: true,
      type: 'WIFI',
      wifiSsid: 'Wi-Fi Network',
      gatewayIp: '192.168.0.1',
    };
  }

  /**
   * Secure credential storage using Android Keystore / EncryptedSharedPreferences
   */
  static async secureStore(key: string, value: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.TendaNative?.secureStore) {
      return window.TendaNative.secureStore(key, value);
    }
    try {
      sessionStorage.setItem('sec_' + key, btoa(encodeURIComponent(value)));
      return true;
    } catch (e) {
      return false;
    }
  }

  static async secureRetrieve(key: string): Promise<string | null> {
    if (this.isNativeAvailable() && window.TendaNative?.secureRetrieve) {
      return window.TendaNative.secureRetrieve(key);
    }
    try {
      const item = sessionStorage.getItem('sec_' + key);
      return item ? decodeURIComponent(atob(item)) : null;
    } catch (e) {
      return null;
    }
  }

  static async deleteSecureData(key: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.TendaNative?.deleteSecureData) {
      return window.TendaNative.deleteSecureData(key);
    }
    try {
      sessionStorage.removeItem('sec_' + key);
      return true;
    } catch (e) {
      return false;
    }
  }

  static async getAppInfo(): Promise<{
    appName: string;
    version: string;
    author: string;
    isNativeBridge: boolean;
  }> {
    if (this.isNativeAvailable() && window.TendaNative?.getAppInfo) {
      try {
        const raw = window.TendaNative.getAppInfo();
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...parsed, isNativeBridge: true };
        }
      } catch (e) {}
    }

    return {
      appName: 'Tenda Router Manager',
      version: '1.0.0 (Release)',
      author: 'NH MAIM',
      isNativeBridge: this.isNativeAvailable(),
    };
  }

  static showToast(message: string) {
    if (this.isNativeAvailable() && window.TendaNative?.showToast) {
      window.TendaNative.showToast(message);
    } else {
      console.log('[Toast]:', message);
    }
  }

  static async copyToClipboard(text: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.TendaNative?.copyToClipboard) {
      return window.TendaNative.copyToClipboard(text);
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }
}
