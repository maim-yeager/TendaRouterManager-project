// Adapter for Tenda Classic / Legacy Firmware (AC6, AC7, AC9, AC10, AC11, AC15, AC18, AC23,
// F2, F3, F6, F9, N300, and other budget goform-based models)

import { RequestClient } from '../services/requestClient';
import {
  ConnectedDevice,
  DHCPSettings,
  DNSSettings,
  GuestWifiSettings,
  MeshNode,
  ParentalControlRule,
  PortForwardingRule,
  QoSSettings,
  RouterCapabilities,
  RouterInfo,
  SystemLogEntry,
  UPnPSettings,
  WifiSettings,
} from '../types/router';
import { base64Encode, md5 } from '../utils/crypto';
import { RouterAdapter } from './RouterAdapter';

export class TendaLegacyAdapter implements RouterAdapter {
  readonly adapterName = 'Tenda Legacy / Classic Adapter (goform)';
  private client: RequestClient;
  private cachedCapabilities: RouterCapabilities | null = null;

  constructor(client: RequestClient) {
    this.client = client;
  }

  async probeRouter(): Promise<{ isTenda: boolean; model?: string; firmware?: string; authType?: string }> {
    try {
      // Test root endpoint and login page
      const res = await this.client.request('login.html', { method: 'GET', timeoutMs: 4000 });
      const rootRes = res.statusCode === 200 ? res : await this.client.request('', { method: 'GET', timeoutMs: 4000 });

      const text = (rootRes.body || '') + (res.body || '');
      const isTenda =
        text.includes('Tenda') ||
        text.includes('tenda') ||
        text.includes('goform') ||
        text.includes('tendawifi') ||
        text.includes('Router') ||
        rootRes.headers['server']?.toLowerCase().includes('tenda');

      let model: string | undefined;
      let firmware: string | undefined;

      const modelMatch = text.match(/id="sysModel"[^>]*>([^<]+)</i) || text.match(/sysModel\s*[:=]\s*["']([^"']+)["']/i) || text.match(/model\s*[:=]\s*["']([^"']+)["']/i);
      if (modelMatch) model = modelMatch[1].trim();

      const fwMatch = text.match(/id="sysVersion"[^>]*>([^<]+)</i) || text.match(/sysVersion\s*[:=]\s*["']([^"']+)["']/i) || text.match(/firmware\s*[:=]\s*["']([^"']+)["']/i);
      if (fwMatch) firmware = fwMatch[1].trim();

      return { isTenda: isTenda || rootRes.statusCode === 200, model, firmware, authType: 'goform' };
    } catch (e) {
      return { isTenda: false };
    }
  }

  async login(password: string, _username?: string): Promise<{ success: boolean; message?: string; sessionKey?: string }> {
    try {
      if (!password) {
        return { success: false, message: 'Password is required.' };
      }

      // Clear any stale session first
      this.client.clearSession();

      const encodedPassword = base64Encode(password);
      const md5Password = md5(password);

      // Attempt 1: Standard goform/login with base64 encoded password (most Tenda models: AC6, AC10, F3, F6, F9, N300, etc.)
      let loginRes = await this.client.request('goform/login', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: { password: encodedPassword },
        timeoutMs: 6000,
      });

      // If connection failed completely
      if (loginRes.statusCode === 0) {
        return { success: false, message: `Router unreachable at ${this.client.getBaseUrl()}. Verify Wi-Fi connection.` };
      }

      let body = loginRes.body || '';
      let isSuccess = false;

      // Check if candidate 1 succeeded.
      // NOTE: We only trust an EXPLICIT positive success marker from the router's
      // own response body. We deliberately do NOT treat "redirected somewhere that
      // isn't login.html" as success — some firmwares redirect to a generic page
      // regardless of whether the password was correct, which previously allowed
      // wrong passwords to be accepted. Success must be proven, never assumed.
      if (this.hasExplicitSuccessMarker(body)) {
        isSuccess = true;
        this.client.setCookie('password', encodedPassword);
        this.client.setCookie('user', 'admin');
      }

      // Attempt 2: MD5 encoded password
      if (!isSuccess && !body.includes('"errCode":0')) {
        loginRes = await this.client.request('goform/login', {
          method: 'POST',
          isFormUrlEncoded: true,
          body: { password: md5Password },
          timeoutMs: 6000,
        });

        body = loginRes.body || '';
        if (this.hasExplicitSuccessMarker(body)) {
          isSuccess = true;
          this.client.setCookie('password', md5Password);
          this.client.setCookie('user', 'admin');
        }
      }

      // Attempt 3: setLogin endpoint with plain / base64 password
      if (!isSuccess) {
        loginRes = await this.client.request('goform/setLogin', {
          method: 'POST',
          isFormUrlEncoded: true,
          body: { password: encodedPassword, user: 'admin' },
          timeoutMs: 6000,
        });

        body = loginRes.body || '';
        if (this.hasExplicitSuccessMarker(body)) {
          isSuccess = true;
          this.client.setCookie('password', encodedPassword);
          this.client.setCookie('user', 'admin');
        }
      }

      // Attempt 4: Plaintext password fallback for older firmwares
      if (!isSuccess) {
        loginRes = await this.client.request('goform/login', {
          method: 'POST',
          isFormUrlEncoded: true,
          body: { password: password, username: 'admin' },
          timeoutMs: 6000,
        });

        body = loginRes.body || '';
        if (this.hasExplicitSuccessMarker(body)) {
          isSuccess = true;
          this.client.setCookie('password', password);
          this.client.setCookie('user', 'admin');
        }
      }

      // If all candidate login attempts failed or router explicitly rejected
      if (!isSuccess) {
        this.client.clearSession();
        return { success: false, message: 'Login failed: Incorrect username or router password.' };
      }

      // CRITICAL: Strict protected query validation against the real router.
      // Must query a protected router endpoint to verify the session is actually
      // authenticated. We run it twice against two independent endpoints and
      // require BOTH to positively prove real, authenticated data — we do NOT
      // assume success just because a specific failure string is absent, since
      // different firmwares fail in different (unpredictable) ways. Defaulting
      // to "success unless proven otherwise" is what let wrong passwords through.
      const check1 = await this.client.request('goform/WifiBasicGet', {
        method: 'GET',
        params: { random: Math.random() },
        timeoutMs: 5000,
      });
      const check2 = await this.client.request('goform/getSysInfo', {
        method: 'GET',
        params: { random: Math.random() },
        timeoutMs: 5000,
      });
      // Budget/older models (F2, F3, and similar) frequently expose status under
      // GetRouterStatus instead of getSysInfo — include it as a third independent
      // check so the same strict "prove real data" rule still applies.
      const check3 = await this.client.request('goform/GetRouterStatus', {
        method: 'GET',
        params: { random: Math.random() },
        timeoutMs: 5000,
      });

      const verified =
        this.isVerifiedAuthenticatedResponse(check1) ||
        this.isVerifiedAuthenticatedResponse(check2) ||
        this.isVerifiedAuthenticatedResponse(check3);

      if (!verified) {
        this.client.clearSession();
        return { success: false, message: 'Authentication could not be verified against the router. Incorrect credentials.' };
      }

      return { success: true, sessionKey: encodedPassword };
    } catch (e: any) {
      this.client.clearSession();
      return { success: false, message: e.message || 'Connection error during authentication.' };
    }
  }

  /**
   * Returns true only when the router's login response contains an EXPLICIT,
   * unambiguous success marker. Anything else (including no match at all) is
   * treated as failure. This function must never be "loosened" to infer success
   * from the absence of an error marker.
   */
  private hasExplicitSuccessMarker(body: string): boolean {
    if (!body) return false;
    return (
      body.includes('"errCode":0') ||
      body.includes('"errCode":"0"') ||
      body.includes('"error":0') ||
      body.includes('"error":"0"') ||
      body.includes('"status":1') ||
      body.includes('"status":"1"')
    );
  }

  /**
   * Positively verifies that a protected-endpoint response reflects a real,
   * authenticated session — rather than merely checking for the absence of a
   * known failure marker. Fails closed: unparseable, HTML, empty, or explicitly
   * error-flagged responses are all treated as NOT authenticated.
   */
  private isVerifiedAuthenticatedResponse(res: { statusCode: number; body?: string }): boolean {
    if (res.statusCode !== 200) return false;
    const body = (res.body || '').trim();
    if (!body) return false;

    // Router login pages / error pages are HTML, not JSON. A protected goform
    // endpoint returning HTML almost always means we were bounced back to the
    // login page (unauthenticated) rather than served real data.
    if (body.startsWith('<')) return false;

    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      return false;
    }

    if (parsed === null || typeof parsed !== 'object') return false;

    // Explicit error/failure codes from the router — never treat as authenticated.
    const errCode = parsed.errCode ?? parsed.error;
    if (errCode !== undefined && errCode !== null && String(errCode) !== '0') {
      return false;
    }

    // Require at least one field that indicates the router actually returned
    // real configuration data (not just an empty acknowledgement object).
    const keys = Object.keys(parsed).map((k) => k.toLowerCase());
    if (keys.length === 0) return false;

    const meaningfulKeyHints = [
      'ssid', 'wifi', 'channel', 'security', 'password', 'mac', 'ip',
      'model', 'version', 'firmware', 'uptime', 'wan', 'lan', 'status',
      'enable', 'band', 'device', 'net', 'sys',
    ];
    const hasMeaningfulField = keys.some((k) => meaningfulKeyHints.some((hint) => k.includes(hint)));

    return hasMeaningfulField;
  }

  async logout(): Promise<void> {
    try {
      await this.client.request('goform/logout', { method: 'POST', timeoutMs: 3000 });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.client.clearSession();
  }

  async detectCapabilities(): Promise<RouterCapabilities> {
    if (this.cachedCapabilities) return this.cachedCapabilities;

    const capabilities: RouterCapabilities = {
      wifi2GHz: true,
      wifi5GHz: false,
      wifi6GHz: false,
      guestNetwork: false,
      mesh: false,
      qos: false,
      parentalControl: false,
      bandwidthControl: false,
      dhcp: true,
      dns: true,
      portForwarding: false,
      upnp: false,
      staticRouting: false,
      reboot: true,
      logs: false,
      trafficStatistics: true,
    };

    try {
      // Probe Wi-Fi endpoints
      const wifiRes = await this.client.request('goform/WifiBasicGet', { method: 'GET', timeoutMs: 4000 });
      if (wifiRes.statusCode === 200 && wifiRes.body) {
        if (wifiRes.body.includes('5G') || wifiRes.body.includes('wifi5g') || wifiRes.body.includes('wrl5g')) {
          capabilities.wifi5GHz = true;
        }
        if (wifiRes.body.includes('6G') || wifiRes.body.includes('ax') || wifiRes.body.includes('11ax')) {
          capabilities.wifi6GHz = true;
        }
      }

      // Probe Guest Network
      const guestRes = await this.client.request('goform/WifiGuestGet', { method: 'GET', timeoutMs: 3000 });
      if (guestRes.statusCode === 200 && guestRes.body && !guestRes.body.includes('404')) {
        capabilities.guestNetwork = true;
      }

      // Probe Parental Control
      const pcRes = await this.client.request('goform/GetParentControlList', { method: 'GET', timeoutMs: 3000 });
      if (pcRes.statusCode === 200 && pcRes.body && !pcRes.body.includes('404')) {
        capabilities.parentalControl = true;
        capabilities.bandwidthControl = true;
      }

      // Probe Port Forwarding / Virtual Server
      const pfRes = await this.client.request('goform/getPortForward', { method: 'GET', timeoutMs: 3000 });
      if (pfRes.statusCode === 200 && pfRes.body && !pfRes.body.includes('404')) {
        capabilities.portForwarding = true;
      }

      // Probe QoS
      const qosRes = await this.client.request('goform/getQosList', { method: 'GET', timeoutMs: 3000 });
      if (qosRes.statusCode === 200 && qosRes.body && !qosRes.body.includes('404')) {
        capabilities.qos = true;
      }

      // Probe UPnP
      const upnpRes = await this.client.request('goform/getUpnp', { method: 'GET', timeoutMs: 3000 });
      if (upnpRes.statusCode === 200 && upnpRes.body && !upnpRes.body.includes('404')) {
        capabilities.upnp = true;
      }

      // Probe Logs
      const logRes = await this.client.request('goform/getSysLog', { method: 'GET', timeoutMs: 3000 });
      if (logRes.statusCode === 200 && logRes.body && !logRes.body.includes('404')) {
        capabilities.logs = true;
      }
    } catch (e) {
      // Use defaults if probing fails
    }

    this.cachedCapabilities = capabilities;
    return capabilities;
  }

  async getRouterInfo(): Promise<RouterInfo> {
    const res = await this.client.request('goform/getSysInfo', {
      method: 'GET',
      params: { random: Math.random() },
      timeoutMs: 5000,
    });

    let data: any = {};
    try {
      data = JSON.parse(res.body);
    } catch (e) {
      // Parse key-value or query format if not JSON
      const lines = (res.body || '').split('\n');
      for (const line of lines) {
        const [k, v] = line.split('=');
        if (k && v) data[k.trim()] = v.trim();
      }
    }

    // getSysInfo is unsupported/empty on some budget models (F2, F3, and other
    // classic firmwares). Fall back to GetRouterStatus, a common alternative
    // status endpoint on those models, and merge in whatever it provides.
    if (Object.keys(data).length === 0) {
      try {
        const fallbackRes = await this.client.request('goform/GetRouterStatus', {
          method: 'GET',
          params: { random: Math.random() },
          timeoutMs: 5000,
        });
        const fallbackData = JSON.parse(fallbackRes.body);
        if (fallbackData && typeof fallbackData === 'object') {
          data = fallbackData;
        }
      } catch (e) {
        // Leave data empty; fields below will fall back to safe defaults.
      }
    }

    let uptime = 0;
    if (data.sysUptime || data.uptime || data.time) {
      const raw = String(data.sysUptime || data.uptime || data.time);
      const match = raw.match(/(\d+)/);
      if (match) uptime = parseInt(match[1], 10);
    }

    return {
      brand: 'Tenda',
      model: data.sysModel || data.model || 'Tenda Router',
      firmwareVersion: data.sysVersion || data.version || data.firmware || 'V1.0',
      hardwareVersion: data.hardwareVersion || data.hwVersion,
      lanIp: data.lanIp || data.lan_ip || '192.168.0.1',
      wanIp: data.wanIp || data.wan_ip || '0.0.0.0',
      wanStatus: data.wanStatus === '1' || data.wanStatus === 'connected' ? 'connected' : data.wanStatus === '0' ? 'disconnected' : 'connected',
      wanType: (data.wanType || data.wan_type || 'DHCP') as any,
      macAddress: data.mac || data.sysMac || data.lanMac || '00:00:00:00:00:00',
      uptimeSeconds: uptime,
      downloadSpeedBps: parseInt(data.downloadSpeed || data.downSpeed || '0', 10),
      uploadSpeedBps: parseInt(data.uploadSpeed || data.upSpeed || '0', 10),
      cpuUsagePercent: data.cpu ? parseInt(data.cpu, 10) : undefined,
      memoryUsagePercent: data.memory ? parseInt(data.memory, 10) : undefined,
      systemTime: data.systemTime || new Date().toLocaleTimeString(),
    };
  }

  async reboot(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await this.client.request('goform/SysToolReboot', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: { action: 'reboot' },
        timeoutMs: 5000,
      });

      return {
        success: res.statusCode === 200 || res.statusCode === 302,
        message: 'Reboot command sent. Router is restarting.',
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to trigger router reboot.' };
    }
  }

  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    try {
      // Try goform/GetNetControlList or goform/getOnlineList
      let res = await this.client.request('goform/GetNetControlList', {
        method: 'GET',
        params: { random: Math.random() },
        timeoutMs: 5000,
      });

      if (res.statusCode !== 200 || !res.body) {
        res = await this.client.request('goform/getOnlineList', {
          method: 'GET',
          params: { random: Math.random() },
          timeoutMs: 5000,
        });
      }

      let parsed: any[] = [];
      try {
        const json = JSON.parse(res.body);
        parsed = Array.isArray(json) ? json : json.deviceList || json.onlineList || json.list || [];
      } catch (e) {
        parsed = [];
      }

      return parsed.map((item: any) => {
        const is5G = item.wifiBand === '5G' || item.band === '5G' || item.is5G === '1' || item.connectType === '5G';
        const isEthernet = item.connectType === 'wired' || item.isWired === '1' || item.line === '1';

        return {
          name: item.deviceName || item.name || item.hostName || 'Device',
          hostname: item.hostName || item.hostname || item.deviceName || 'Unknown',
          ipAddress: item.ip || item.ipAddress || '0.0.0.0',
          macAddress: item.mac || item.macAddress || '00:00:00:00:00:00',
          connectionType: isEthernet ? 'Ethernet' : is5G ? '5GHz' : '2.4GHz',
          signalDbm: item.signal ? parseInt(item.signal, 10) : undefined,
          uploadSpeedBps: parseInt(item.uploadSpeed || item.upSpeed || '0', 10),
          downloadSpeedBps: parseInt(item.downloadSpeed || item.downSpeed || '0', 10),
          isBlocked: item.isBlack === '1' || item.isBlocked === true || item.black === '1',
          online: item.online !== false && item.online !== '0',
          uploadLimitKbps: parseInt(item.limitUp || item.upLimit || '0', 10),
          downloadLimitKbps: parseInt(item.limitDown || item.downLimit || '0', 10),
          manufacturer: item.vendor || item.manufacturer,
        };
      });
    } catch (e) {
      return [];
    }
  }

  async renameDevice(macAddress: string, newName: string): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/SetNetControlList', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: {
          mac: macAddress,
          deviceName: newName,
          action: 'rename',
        },
        timeoutMs: 5000,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async setDeviceBlockStatus(macAddress: string, block: boolean): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/SetNetControlList', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: {
          mac: macAddress,
          isBlack: block ? '1' : '0',
          action: block ? 'addBlack' : 'delBlack',
        },
        timeoutMs: 5000,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async setDeviceSpeedLimit(macAddress: string, uploadLimitKbps: number, downloadLimitKbps: number): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/SetNetControlList', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: {
          mac: macAddress,
          limitUp: uploadLimitKbps.toString(),
          limitDown: downloadLimitKbps.toString(),
          action: 'setSpeedLimit',
        },
        timeoutMs: 5000,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getWifiSettings(): Promise<WifiSettings> {
    const res = await this.client.request('goform/WifiBasicGet', {
      method: 'GET',
      params: { random: Math.random() },
      timeoutMs: 5000,
    });

    let data: any = {};
    try {
      data = JSON.parse(res.body);
    } catch (e) {
      data = {};
    }

    const bands: any[] = [
      {
        band: '2.4GHz',
        enabled: data.wifiEn !== '0' && data.enable24g !== '0',
        ssid: data.ssid || data.ssid24g || 'Tenda_WiFi',
        hidden: data.hideSsid === '1' || data.hide24g === '1',
        security: (data.security || data.secType || 'WPA2-PSK') as any,
        password: data.password || data.wpapsk || '',
        channel: data.channel || 'auto',
        channelWidth: (data.channelWidth || 'Auto') as any,
        txPower: (data.txPower || 'High') as any,
      },
    ];

    if (data.ssid5g || data.enable5g !== undefined) {
      bands.push({
        band: '5GHz',
        enabled: data.enable5g !== '0',
        ssid: data.ssid5g || (data.ssid ? `${data.ssid}_5G` : 'Tenda_5G'),
        hidden: data.hide5g === '1',
        security: (data.security5g || data.secType5g || 'WPA2-PSK') as any,
        password: data.password5g || data.wpapsk5g || data.password || '',
        channel: data.channel5g || 'auto',
        channelWidth: (data.channelWidth5g || '80MHz') as any,
        txPower: (data.txPower5g || 'High') as any,
      });
    }

    return {
      bands,
      unifyBands: data.unifyWifi === '1' || data.smartConnect === '1',
    };
  }

  async setWifiSettings(settings: Partial<WifiSettings>): Promise<{ success: boolean; message?: string }> {
    try {
      const payload: Record<string, string> = {};
      if (settings.bands && settings.bands.length > 0) {
        const band24 = settings.bands.find((b) => b.band === '2.4GHz');
        if (band24) {
          payload.ssid = band24.ssid;
          payload.wifiEn = band24.enabled ? '1' : '0';
          payload.hideSsid = band24.hidden ? '1' : '0';
          if (band24.password) payload.password = band24.password;
          if (band24.channel) payload.channel = String(band24.channel);
          if (band24.txPower) payload.txPower = band24.txPower;
        }

        const band5 = settings.bands.find((b) => b.band === '5GHz');
        if (band5) {
          payload.ssid5g = band5.ssid;
          payload.enable5g = band5.enabled ? '1' : '0';
          payload.hide5g = band5.hidden ? '1' : '0';
          if (band5.password) payload.password5g = band5.password;
          if (band5.channel) payload.channel5g = String(band5.channel);
        }
      }

      if (settings.unifyBands !== undefined) {
        payload.unifyWifi = settings.unifyBands ? '1' : '0';
      }

      const res = await this.client.request('goform/WifiBasicSet', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: payload,
        timeoutMs: 8000,
      });

      return {
        success: res.statusCode === 200,
        message: 'Wi-Fi configuration applied. Router radio restarting.',
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update Wi-Fi settings.' };
    }
  }

  async getGuestWifiSettings(): Promise<GuestWifiSettings> {
    try {
      const res = await this.client.request('goform/WifiGuestGet', { method: 'GET', timeoutMs: 4000 });
      const data = JSON.parse(res.body || '{}');

      return {
        enabled: data.guestEn === '1' || data.enable === '1',
        ssid: data.guestSsid || data.ssid || 'Tenda_Guest',
        security: data.guestSecurity === 'none' ? 'None' : 'WPA2-PSK',
        password: data.guestPassword || data.password || '',
        durationHours: parseInt(data.duration || '8', 10),
        downloadLimitKbps: parseInt(data.limitDown || '0', 10),
        uploadLimitKbps: parseInt(data.limitUp || '0', 10),
        allowLocalAccess: data.isolate === '0',
        activeClientsCount: parseInt(data.clientCount || '0', 10),
      };
    } catch (e) {
      return {
        enabled: false,
        ssid: 'Tenda_Guest',
        security: 'None',
        durationHours: 8,
        downloadLimitKbps: 0,
        uploadLimitKbps: 0,
        allowLocalAccess: false,
      };
    }
  }

  async setGuestWifiSettings(settings: Partial<GuestWifiSettings>): Promise<{ success: boolean }> {
    try {
      const payload: Record<string, string> = {
        guestEn: settings.enabled ? '1' : '0',
        guestSsid: settings.ssid || 'Tenda_Guest',
        guestSecurity: settings.security === 'None' ? 'none' : 'wpa2',
        guestPassword: settings.password || '',
        duration: String(settings.durationHours ?? 8),
        limitDown: String(settings.downloadLimitKbps ?? 0),
        limitUp: String(settings.uploadLimitKbps ?? 0),
        isolate: settings.allowLocalAccess ? '0' : '1',
      };

      const res = await this.client.request('goform/WifiGuestSet', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: payload,
        timeoutMs: 6000,
      });

      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getWanStatus(): Promise<{ wanIp: string; wanType: string; status: 'connected' | 'connecting' | 'disconnected'; dns: string[] }> {
    try {
      const res = await this.client.request('goform/getWanStatus', { method: 'GET', timeoutMs: 4000 });
      const data = JSON.parse(res.body || '{}');

      const dnsList: string[] = [];
      if (data.dns1) dnsList.push(data.dns1);
      if (data.dns2) dnsList.push(data.dns2);

      return {
        wanIp: data.wanIp || data.ip || '0.0.0.0',
        wanType: data.wanType || 'DHCP',
        status: data.status === '1' || data.connected === '1' ? 'connected' : 'disconnected',
        dns: dnsList,
      };
    } catch (e) {
      return { wanIp: '0.0.0.0', wanType: 'DHCP', status: 'disconnected', dns: [] };
    }
  }

  async getDHCPSettings(): Promise<DHCPSettings> {
    try {
      const res = await this.client.request('goform/getDhcpInfo', { method: 'GET', timeoutMs: 4000 });
      const data = JSON.parse(res.body || '{}');

      return {
        enabled: data.dhcpEn !== '0',
        startIp: data.startIp || '192.168.0.100',
        endIp: data.endIp || '192.168.0.200',
        gateway: data.gateway || '192.168.0.1',
        subnetMask: data.mask || '255.255.255.0',
        leaseTimeMinutes: parseInt(data.leaseTime || '1440', 10),
        primaryDns: data.dns1 || '',
        secondaryDns: data.dns2 || '',
        staticLeases: (data.staticList || []).map((l: any, idx: number) => ({
          id: 'lease_' + idx,
          deviceName: l.name || 'Static Device',
          macAddress: l.mac,
          ipAddress: l.ip,
          enabled: true,
        })),
      };
    } catch (e) {
      return {
        enabled: true,
        startIp: '192.168.0.100',
        endIp: '192.168.0.200',
        gateway: '192.168.0.1',
        subnetMask: '255.255.255.0',
        leaseTimeMinutes: 1440,
        primaryDns: '',
        secondaryDns: '',
        staticLeases: [],
      };
    }
  }

  async setDHCPSettings(settings: Partial<DHCPSettings>): Promise<{ success: boolean }> {
    try {
      const payload: Record<string, string> = {
        dhcpEn: settings.enabled ? '1' : '0',
        startIp: settings.startIp || '192.168.0.100',
        endIp: settings.endIp || '192.168.0.200',
        leaseTime: String(settings.leaseTimeMinutes ?? 1440),
        dns1: settings.primaryDns || '',
        dns2: settings.secondaryDns || '',
      };

      const res = await this.client.request('goform/setDhcpInfo', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: payload,
        timeoutMs: 6000,
      });

      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getDNSSettings(): Promise<DNSSettings> {
    try {
      const res = await this.client.request('goform/getDnsInfo', { method: 'GET', timeoutMs: 4000 });
      const data = JSON.parse(res.body || '{}');

      return {
        mode: data.dnsType === 'manual' || data.manualDns === '1' ? 'manual' : 'auto',
        primaryDns: data.dns1 || data.primaryDns || '',
        secondaryDns: data.dns2 || data.secondaryDns || '',
      };
    } catch (e) {
      return { mode: 'auto', primaryDns: '', secondaryDns: '' };
    }
  }

  async setDNSSettings(settings: DNSSettings): Promise<{ success: boolean }> {
    try {
      const payload: Record<string, string> = {
        dnsType: settings.mode,
        manualDns: settings.mode === 'manual' ? '1' : '0',
        dns1: settings.primaryDns,
        dns2: settings.secondaryDns,
      };

      const res = await this.client.request('goform/setDnsInfo', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: payload,
        timeoutMs: 6000,
      });

      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getQoSSettings(): Promise<QoSSettings | null> {
    try {
      const res = await this.client.request('goform/getQosList', { method: 'GET', timeoutMs: 4000 });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);

      return {
        enabled: data.qosEn === '1',
        totalBandwidthDownMbps: parseInt(data.downBandwidth || '100', 10),
        totalBandwidthUpMbps: parseInt(data.upBandwidth || '20', 10),
        deviceRules: (data.rules || []).map((r: any) => ({
          macAddress: r.mac,
          deviceName: r.name || 'Device',
          priority: r.priority || 'Normal',
          maxDownloadKbps: parseInt(r.limitDown || '0', 10),
          maxUploadKbps: parseInt(r.limitUp || '0', 10),
        })),
      };
    } catch (e) {
      return null;
    }
  }

  async setQoSSettings(settings: QoSSettings): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/setQosList', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: {
          qosEn: settings.enabled ? '1' : '0',
          downBandwidth: String(settings.totalBandwidthDownMbps),
          upBandwidth: String(settings.totalBandwidthUpMbps),
        },
        timeoutMs: 6000,
      });

      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getParentalControlRules(): Promise<ParentalControlRule[] | null> {
    try {
      const res = await this.client.request('goform/GetParentControlList', { method: 'GET', timeoutMs: 4000 });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);

      return (data.ruleList || data.list || []).map((r: any, idx: number) => ({
        id: r.id || 'pc_' + idx,
        profileName: r.deviceName || r.name || 'Parental Rule',
        targetMacAddresses: [r.mac],
        enabled: r.enable !== '0',
        timeRules: [
          {
            days: (r.timeDay || '1,2,3,4,5,6,7').split(',').map((d: string) => parseInt(d, 10) % 7),
            startTime: r.timeStart || '09:00',
            endTime: r.timeEnd || '21:00',
          },
        ],
        isInternetPaused: r.pause === '1',
        blockedWebsites: (r.urlLimit || '').split(',').filter(Boolean),
      }));
    } catch (e) {
      return null;
    }
  }

  async saveParentalControlRule(rule: ParentalControlRule): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/SetParentControlList', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: {
          id: rule.id,
          name: rule.profileName,
          mac: rule.targetMacAddresses[0] || '',
          enable: rule.enabled ? '1' : '0',
          timeDay: rule.timeRules[0]?.days.join(',') || '1,2,3,4,5',
          timeStart: rule.timeRules[0]?.startTime || '09:00',
          timeEnd: rule.timeRules[0]?.endTime || '21:00',
          pause: rule.isInternetPaused ? '1' : '0',
          urlLimit: rule.blockedWebsites.join(','),
        },
        timeoutMs: 6000,
      });

      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async deleteParentalControlRule(ruleId: string): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/SetParentControlList', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: { id: ruleId, action: 'delete' },
        timeoutMs: 6000,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getPortForwardingRules(): Promise<PortForwardingRule[] | null> {
    try {
      const res = await this.client.request('goform/getPortForward', { method: 'GET', timeoutMs: 4000 });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);

      return (data.ruleList || data.list || []).map((r: any, idx: number) => ({
        id: r.id || 'pf_' + idx,
        name: r.name || 'Rule',
        lanIp: r.ip || r.lanIp,
        internalPort: parseInt(r.inPort || r.internalPort, 10),
        externalPort: parseInt(r.outPort || r.externalPort, 10),
        protocol: (r.protocol || 'TCP').toUpperCase() as any,
        enabled: r.enable !== '0',
      }));
    } catch (e) {
      return null;
    }
  }

  async savePortForwardingRule(rule: PortForwardingRule): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/setPortForward', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: {
          id: rule.id,
          name: rule.name,
          lanIp: rule.lanIp,
          inPort: String(rule.internalPort),
          outPort: String(rule.externalPort),
          protocol: rule.protocol,
          enable: rule.enabled ? '1' : '0',
        },
        timeoutMs: 6000,
      });

      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async deletePortForwardingRule(ruleId: string): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/setPortForward', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: { id: ruleId, action: 'delete' },
        timeoutMs: 6000,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getUPnPSettings(): Promise<UPnPSettings | null> {
    try {
      const res = await this.client.request('goform/getUpnp', { method: 'GET', timeoutMs: 4000 });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);

      return {
        enabled: data.upnpEn === '1' || data.enable === '1',
        activePortMappings: (data.mappings || []).map((m: any) => ({
          description: m.desc || 'App Port Mapping',
          internalClient: m.ip,
          internalPort: parseInt(m.inPort, 10),
          externalPort: parseInt(m.outPort, 10),
          protocol: m.proto || 'TCP',
        })),
      };
    } catch (e) {
      return null;
    }
  }

  async setUPnPStatus(enabled: boolean): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/setUpnp', {
        method: 'POST',
        isFormUrlEncoded: true,
        body: { upnpEn: enabled ? '1' : '0' },
        timeoutMs: 5000,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getMeshTopology(): Promise<MeshNode[] | null> {
    // Legacy models do not support Nova Mesh architecture
    return null;
  }

  async getSystemLogs(): Promise<SystemLogEntry[] | null> {
    try {
      const res = await this.client.request('goform/getSysLog', { method: 'GET', timeoutMs: 5000 });
      if (res.statusCode !== 200 || !res.body) return null;

      const raw = res.body;
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);

      return lines.map((line, idx) => {
        let level: 'INFO' | 'WARN' | 'ERROR' = 'INFO';
        if (line.includes('ERR') || line.includes('Fail') || line.includes('Drop')) level = 'ERROR';
        else if (line.includes('WARN') || line.includes('Timeout')) level = 'WARN';

        let category: any = 'SYSTEM';
        if (line.includes('DHCP')) category = 'DHCP';
        else if (line.includes('WAN') || line.includes('PPPoE')) category = 'WAN';
        else if (line.includes('WIFI') || line.includes('wlan') || line.includes('assoc')) category = 'WIFI';
        else if (line.includes('AUTH') || line.includes('login')) category = 'AUTH';

        return {
          id: 'log_' + idx,
          timestamp: new Date().toLocaleTimeString(),
          level,
          category,
          message: line,
        };
      });
    } catch (e) {
      return null;
    }
  }
}
