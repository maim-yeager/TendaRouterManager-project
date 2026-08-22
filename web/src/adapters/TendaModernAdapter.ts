// Adapter for Tenda Modern / Wi-Fi 6 / Nova Mesh Firmware (TX series, RX series, Nova MW series, AX12, AX1800, AX3000)

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
import { md5 } from '../utils/crypto';
import { RouterAdapter } from './RouterAdapter';

export class TendaModernAdapter implements RouterAdapter {
  readonly adapterName = 'Tenda Modern / Mesh / Wi-Fi 6 Adapter (module RPC)';
  private client: RequestClient;
  private cachedCapabilities: RouterCapabilities | null = null;
  private sessionToken: string | null = null;

  constructor(client: RequestClient) {
    this.client = client;
  }

  async probeRouter(): Promise<{ isTenda: boolean; model?: string; firmware?: string; authType?: string }> {
    try {
      // Modern Tenda routers expose module probe or index.html with meta
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'system.getQuickInfo' },
        timeoutMs: 4000,
      });

      if (res.statusCode === 200 && res.body && !res.body.includes('404')) {
        try {
          const json = JSON.parse(res.body);
          return {
            isTenda: true,
            model: json.model || json.sysModel || 'Tenda Nova/AX',
            firmware: json.firmware || json.version,
            authType: 'token',
          };
        } catch (e) {
          return { isTenda: true, authType: 'token' };
        }
      }

      // Fallback check
      const rootRes = await this.client.request('', { method: 'GET', timeoutMs: 3000 });
      if (rootRes.body && (rootRes.body.includes('Tenda') || rootRes.body.includes('tendawifi'))) {
        return { isTenda: true, authType: 'token' };
      }

      return { isTenda: false };
    } catch (e) {
      return { isTenda: false };
    }
  }

  async login(password: string, _username?: string): Promise<{ success: boolean; message?: string; sessionKey?: string }> {
    try {
      if (!password) {
        return { success: false, message: 'Password is required.' };
      }

      this.client.clearSession();
      this.sessionToken = null;

      // Modern Tenda routers (Nova, TX, RX series) use MD5 challenge or token login
      const md5Pass = md5(password);

      let res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'system.login' },
        body: { password: md5Pass },
        timeoutMs: 6000,
      });

      if (res.statusCode === 0) {
        return { success: false, message: `Router unreachable at ${this.client.getBaseUrl()}` };
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(res.body);
      } catch (e) {
        parsed = {};
      }

      // Try alternative login endpoint if not recognized
      if (res.statusCode !== 200 || (parsed.errCode !== 0 && parsed.error !== 0 && !parsed.token)) {
        res = await this.client.request('goform/login', {
          method: 'POST',
          isFormUrlEncoded: true,
          body: { password: md5Pass },
          timeoutMs: 6000,
        });

        try {
          parsed = JSON.parse(res.body);
        } catch (e) {
          parsed = {};
        }
      }

      const hasValidCode = parsed.errCode === 0 || parsed.errCode === '0' || parsed.error === 0;
      const token = parsed.token || parsed.sessionToken || (res.headers['set-cookie'] ? 'cookie_session' : null);

      if (!hasValidCode && !parsed.token) {
        return { success: false, message: parsed.message || 'Invalid router password or authentication rejected.' };
      }

      if (token) {
        this.sessionToken = token;
        this.client.setAuthToken(token);
        this.client.setCookie('token', token);
      }

      // Verify authenticated session against protected module commands.
      // We require POSITIVE proof of real data from the router, not just the
      // absence of a specific error string — different firmwares fail in
      // different, unpredictable ways, and assuming success by default is what
      // previously let a wrong password through.
      const verifyRes = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'system.getInfo', random: Math.random() },
        timeoutMs: 5000,
      });
      const verifyRes2 = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'wifi.get', random: Math.random() },
        timeoutMs: 5000,
      });

      const verified = this.isVerifiedAuthenticatedResponse(verifyRes) || this.isVerifiedAuthenticatedResponse(verifyRes2);

      if (!verified) {
        this.client.clearSession();
        this.sessionToken = null;
        return { success: false, message: 'Authentication could not be verified against the router. Incorrect credentials.' };
      }

      return { success: true, sessionKey: token || 'authenticated' };
    } catch (e: any) {
      this.client.clearSession();
      this.sessionToken = null;
      return { success: false, message: e.message || 'Failed to authenticate with Tenda router.' };
    }
  }

  /**
   * Positively verifies that a protected-endpoint response reflects a real,
   * authenticated session, rather than merely checking for the absence of a
   * known failure marker. Fails closed: unparseable, HTML, empty, or
   * explicitly error-flagged responses are all treated as NOT authenticated.
   */
  private isVerifiedAuthenticatedResponse(res: { statusCode: number; body?: string }): boolean {
    if (res.statusCode !== 200) return false;
    const body = (res.body || '').trim();
    if (!body) return false;

    // Login/error pages served by the router are HTML, not JSON module data.
    if (body.startsWith('<')) return false;

    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      return false;
    }

    if (parsed === null || typeof parsed !== 'object') return false;

    const errCode = parsed.errCode ?? parsed.error;
    if (errCode !== undefined && errCode !== null && String(errCode) !== '0') {
      return false;
    }

    const keys = Object.keys(parsed).map((k) => k.toLowerCase());
    if (keys.length === 0) return false;

    const meaningfulKeyHints = [
      'ssid', 'wifi', 'channel', 'security', 'mac', 'ip', 'model', 'version',
      'firmware', 'uptime', 'wan', 'lan', 'status', 'enable', 'band',
      'device', 'net', 'sys', 'hardware', 'software',
    ];
    return keys.some((k) => meaningfulKeyHints.some((hint) => k.includes(hint)));
  }

  async logout(): Promise<void> {
    try {
      await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'system.logout' },
        timeoutMs: 3000,
      });
    } catch (e) {}
    this.sessionToken = null;
    this.client.clearSession();
  }

  async detectCapabilities(): Promise<RouterCapabilities> {
    if (this.cachedCapabilities) return this.cachedCapabilities;

    const capabilities: RouterCapabilities = {
      wifi2GHz: true,
      wifi5GHz: true,
      wifi6GHz: true,
      guestNetwork: true,
      mesh: true,
      qos: true,
      parentalControl: true,
      bandwidthControl: true,
      dhcp: true,
      dns: true,
      portForwarding: true,
      upnp: true,
      staticRouting: false,
      reboot: true,
      logs: true,
      trafficStatistics: true,
    };

    this.cachedCapabilities = capabilities;
    return capabilities;
  }

  async getRouterInfo(): Promise<RouterInfo> {
    const res = await this.client.request('goform/module', {
      method: 'GET',
      params: { cmd: 'system.getInfo', random: Math.random() },
      timeoutMs: 5000,
    });

    let data: any = {};
    try {
      data = JSON.parse(res.body);
    } catch (e) {
      data = {};
    }

    return {
      brand: 'Tenda',
      model: data.model || data.sysModel || 'Tenda Wi-Fi 6 Router',
      firmwareVersion: data.firmware || data.version || 'V2.0.0',
      hardwareVersion: data.hwVersion || 'V1.0',
      lanIp: data.lanIp || '192.168.0.1',
      wanIp: data.wanIp || '0.0.0.0',
      wanStatus: data.wanConnected ? 'connected' : 'disconnected',
      wanType: (data.wanType || 'DHCP') as any,
      macAddress: data.mac || '00:00:00:00:00:00',
      uptimeSeconds: parseInt(data.uptime || '0', 10),
      downloadSpeedBps: parseInt(data.downSpeed || '0', 10),
      uploadSpeedBps: parseInt(data.upSpeed || '0', 10),
      cpuUsagePercent: data.cpuUsage ? parseInt(data.cpuUsage, 10) : undefined,
      memoryUsagePercent: data.memUsage ? parseInt(data.memUsage, 10) : undefined,
      systemTime: data.time || new Date().toLocaleTimeString(),
    };
  }

  async reboot(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'system.reboot' },
        timeoutMs: 5000,
      });

      return {
        success: res.statusCode === 200,
        message: 'Reboot command sent to modern Tenda system.',
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'device.getOnlineList', random: Math.random() },
        timeoutMs: 5000,
      });

      const json = JSON.parse(res.body || '{}');
      const list = json.list || json.devices || [];

      return list.map((item: any) => ({
        name: item.name || item.hostname || 'Device',
        hostname: item.hostname || item.name || 'Unknown',
        ipAddress: item.ip,
        macAddress: item.mac,
        connectionType: item.band === '6G' ? '6GHz' : item.band === '5G' ? '5GHz' : item.isWired ? 'Ethernet' : '2.4GHz',
        signalDbm: item.rssi || item.signal,
        linkSpeedMbps: item.rate,
        uploadSpeedBps: parseInt(item.upSpeed || '0', 10),
        downloadSpeedBps: parseInt(item.downSpeed || '0', 10),
        isBlocked: item.blocked === true || item.isBlack === '1',
        online: item.online !== false,
        uploadLimitKbps: parseInt(item.upLimit || '0', 10),
        downloadLimitKbps: parseInt(item.downLimit || '0', 10),
        manufacturer: item.vendor,
      }));
    } catch (e) {
      return [];
    }
  }

  async renameDevice(macAddress: string, newName: string): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'device.setName' },
        body: { mac: macAddress, name: newName },
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async setDeviceBlockStatus(macAddress: string, block: boolean): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: block ? 'device.addBlack' : 'device.delBlack' },
        body: { mac: macAddress },
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async setDeviceSpeedLimit(macAddress: string, uploadLimitKbps: number, downloadLimitKbps: number): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'device.setLimit' },
        body: { mac: macAddress, upLimit: uploadLimitKbps, downLimit: downloadLimitKbps },
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getWifiSettings(): Promise<WifiSettings> {
    const res = await this.client.request('goform/module', {
      method: 'GET',
      params: { cmd: 'wifi.get' },
      timeoutMs: 5000,
    });

    const data = JSON.parse(res.body || '{}');

    return {
      bands: [
        {
          band: '2.4GHz',
          enabled: data.enable24g !== false,
          ssid: data.ssid24g || 'Tenda_WiFi6',
          hidden: data.hide24g === true,
          security: data.security24g || 'WPA2/WPA3-Mixed',
          password: data.password24g || '',
          channel: data.channel24g || 'auto',
          channelWidth: data.width24g || 'Auto',
          txPower: data.power24g || 'High',
        },
        {
          band: '5GHz',
          enabled: data.enable5g !== false,
          ssid: data.ssid5g || 'Tenda_WiFi6_5G',
          hidden: data.hide5g === true,
          security: data.security5g || 'WPA2/WPA3-Mixed',
          password: data.password5g || '',
          channel: data.channel5g || 'auto',
          channelWidth: data.width5g || '160MHz',
          txPower: data.power5g || 'High',
        },
      ],
      unifyBands: data.smartConnect === true,
    };
  }

  async setWifiSettings(settings: Partial<WifiSettings>): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'wifi.set' },
        body: settings,
        timeoutMs: 8000,
      });

      return { success: res.statusCode === 200, message: 'Wi-Fi configuration updated.' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getGuestWifiSettings(): Promise<GuestWifiSettings> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'wifi.getGuest' },
      });
      const data = JSON.parse(res.body || '{}');

      return {
        enabled: data.enabled === true,
        ssid: data.ssid || 'Tenda_Guest',
        security: data.security || 'WPA2-PSK',
        password: data.password || '',
        durationHours: data.durationHours || 8,
        downloadLimitKbps: data.downloadLimitKbps || 0,
        uploadLimitKbps: data.uploadLimitKbps || 0,
        allowLocalAccess: data.allowLocalAccess === true,
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
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'wifi.setGuest' },
        body: settings,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getWanStatus(): Promise<{ wanIp: string; wanType: string; status: 'connected' | 'connecting' | 'disconnected'; dns: string[] }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'wan.getStatus' },
      });
      const data = JSON.parse(res.body || '{}');
      return {
        wanIp: data.ip || '0.0.0.0',
        wanType: data.type || 'DHCP',
        status: data.connected ? 'connected' : 'disconnected',
        dns: data.dns || [],
      };
    } catch (e) {
      return { wanIp: '0.0.0.0', wanType: 'DHCP', status: 'disconnected', dns: [] };
    }
  }

  async getDHCPSettings(): Promise<DHCPSettings> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'dhcp.get' },
      });
      const data = JSON.parse(res.body || '{}');
      return {
        enabled: data.enabled !== false,
        startIp: data.startIp || '192.168.0.100',
        endIp: data.endIp || '192.168.0.200',
        gateway: data.gateway || '192.168.0.1',
        subnetMask: data.subnetMask || '255.255.255.0',
        leaseTimeMinutes: data.leaseTime || 1440,
        primaryDns: data.primaryDns || '',
        secondaryDns: data.secondaryDns || '',
        staticLeases: (data.staticLeases || []).map((l: any, idx: number) => ({
          id: 'lease_' + idx,
          deviceName: l.name,
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
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'dhcp.set' },
        body: settings,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getDNSSettings(): Promise<DNSSettings> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'dns.get' },
      });
      const data = JSON.parse(res.body || '{}');
      return {
        mode: data.mode || 'auto',
        primaryDns: data.primary || '',
        secondaryDns: data.secondary || '',
      };
    } catch (e) {
      return { mode: 'auto', primaryDns: '', secondaryDns: '' };
    }
  }

  async setDNSSettings(settings: DNSSettings): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'dns.set' },
        body: settings,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getQoSSettings(): Promise<QoSSettings | null> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'qos.get' },
      });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);

      return {
        enabled: data.enabled === true,
        totalBandwidthDownMbps: data.downBandwidth || 100,
        totalBandwidthUpMbps: data.upBandwidth || 20,
        deviceRules: data.rules || [],
      };
    } catch (e) {
      return null;
    }
  }

  async setQoSSettings(settings: QoSSettings): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'qos.set' },
        body: settings,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getParentalControlRules(): Promise<ParentalControlRule[] | null> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'parental.getList' },
      });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);
      return data.rules || [];
    } catch (e) {
      return null;
    }
  }

  async saveParentalControlRule(rule: ParentalControlRule): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'parental.saveRule' },
        body: rule,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async deleteParentalControlRule(ruleId: string): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'parental.deleteRule' },
        body: { id: ruleId },
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getPortForwardingRules(): Promise<PortForwardingRule[] | null> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'portForward.getList' },
      });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);
      return data.rules || [];
    } catch (e) {
      return null;
    }
  }

  async savePortForwardingRule(rule: PortForwardingRule): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'portForward.save' },
        body: rule,
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async deletePortForwardingRule(ruleId: string): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'portForward.delete' },
        body: { id: ruleId },
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getUPnPSettings(): Promise<UPnPSettings | null> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'upnp.get' },
      });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);
      return {
        enabled: data.enabled === true,
        activePortMappings: data.mappings || [],
      };
    } catch (e) {
      return null;
    }
  }

  async setUPnPStatus(enabled: boolean): Promise<{ success: boolean }> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'POST',
        params: { cmd: 'upnp.set' },
        body: { enabled },
      });
      return { success: res.statusCode === 200 };
    } catch (e) {
      return { success: false };
    }
  }

  async getMeshTopology(): Promise<MeshNode[] | null> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'mesh.getTopology' },
        timeoutMs: 5000,
      });

      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);
      const nodes = data.nodes || data.topology || [];

      return nodes.map((node: any, idx: number) => ({
        id: node.id || 'node_' + idx,
        name: node.name || (node.isPrimary ? 'Primary Mesh Node' : `Nova Node ${idx + 1}`),
        model: node.model || 'Nova Mesh',
        role: node.isPrimary ? 'Primary' : 'Secondary',
        ipAddress: node.ip,
        macAddress: node.mac,
        connectionType: node.wired ? 'Ethernet' : '5GHz',
        signalQuality: node.signal > -65 ? 'Excellent' : node.signal > -75 ? 'Good' : 'Fair',
        connectedDevicesCount: parseInt(node.clientCount || '0', 10),
        firmwareVersion: node.firmware || 'V1.0',
        online: node.online !== false,
      }));
    } catch (e) {
      return null;
    }
  }

  async getSystemLogs(): Promise<SystemLogEntry[] | null> {
    try {
      const res = await this.client.request('goform/module', {
        method: 'GET',
        params: { cmd: 'system.getLogs' },
      });
      if (res.statusCode !== 200 || !res.body) return null;
      const data = JSON.parse(res.body);
      return data.logs || [];
    } catch (e) {
      return null;
    }
  }
}
