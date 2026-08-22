// Unified Request Client managing router communication

import { NativeBridge } from '../security/nativeBridge';
import { NativeRequestConfig, NativeResponse } from '../types/router';

export class RequestClient {
  private baseUrl: string;
  private cookieJar: Record<string, string> = {};
  private authToken: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl: string) {
    // Normalize base URL e.g. "192.168.0.1" -> "http://192.168.0.1"
    let clean = baseUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    this.baseUrl = clean;
  }

  setBaseUrl(url: string) {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    this.baseUrl = clean;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setCookie(name: string, value: string) {
    this.cookieJar[name] = value;
  }

  getCookie(name: string): string | undefined {
    return this.cookieJar[name];
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setCsrfToken(token: string | null) {
    this.csrfToken = token;
  }

  clearSession() {
    this.cookieJar = {};
    this.authToken = null;
    this.csrfToken = null;
  }

  private buildCookieHeader(): string {
    return Object.entries(this.cookieJar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private parseCookiesFromHeaders(headers: Record<string, string>) {
    const setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'];
    if (setCookieHeader) {
      // Split on comma or newline if multiple
      const parts = setCookieHeader.split(/,(?=[^;]+=[^;]+)/);
      for (const part of parts) {
        const match = part.trim().match(/^([^=;]+)=([^;]*)/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          if (key && !key.toLowerCase().startsWith('expires') && !key.toLowerCase().startsWith('path') && !key.toLowerCase().startsWith('samesite')) {
            this.cookieJar[key] = val;
          }
        }
      }
    }
  }

  /**
   * Performs an authenticated or unauthenticated HTTP request
   */
  async request(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      params?: Record<string, string | number | boolean>;
      body?: string | Record<string, any>;
      headers?: Record<string, string>;
      timeoutMs?: number;
      isFormUrlEncoded?: boolean;
    } = {}
  ): Promise<NativeResponse> {
    const method = options.method || (options.body ? 'POST' : 'GET');
    let url = path.startsWith('http') ? path : `${this.baseUrl}/${path.replace(/^\//, '')}`;

    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.params)) {
        searchParams.append(k, String(v));
      }
      url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'Tenda-Manager-Android/1.0',
      ...options.headers,
    };

    const cookieHeader = this.buildCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    if (this.authToken) {
      headers['Authorization'] = this.authToken;
      headers['token'] = this.authToken;
    }

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    let payload: string | undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        payload = options.body;
      } else if (options.isFormUrlEncoded) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(options.body)) {
          params.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
        payload = params.toString();
      } else {
        headers['Content-Type'] = 'application/json; charset=UTF-8';
        payload = JSON.stringify(options.body);
      }
    }

    const requestConfig: NativeRequestConfig = {
      url,
      method,
      headers,
      body: payload,
      timeoutMs: options.timeoutMs || 8000,
    };

    const response = await NativeBridge.executeRouterRequest(requestConfig);

    if (response.headers) {
      this.parseCookiesFromHeaders(response.headers);
    }

    return response;
  }
}
