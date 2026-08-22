// Master Router Service coordinating discovery, adapters, sessions, profiles, and state synchronization

import { RouterAdapter } from '../adapters/RouterAdapter';
import { TendaLegacyAdapter } from '../adapters/TendaLegacyAdapter';
import { TendaModernAdapter } from '../adapters/TendaModernAdapter';
import { NativeBridge } from '../security/nativeBridge';
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
  RouterProfile,
  SystemLogEntry,
  UPnPSettings,
  WifiSettings,
} from '../types/router';
import { RequestClient } from './requestClient';

export class RouterService {
  private static instance: RouterService;
  private client: RequestClient;
  private adapter: RouterAdapter | null = null;
  private currentIp: string = '192.168.0.1';
  private isAuthenticated: boolean = false;
  private lastUpdateTimestamp: number = 0;
  private pollIntervalId: any = null;

  private constructor() {
    this.client = new RequestClient(this.currentIp);
  }

  static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }
    return RouterService.instance;
  }

  getClient(): RequestClient {
    return this.client;
  }

  getCurrentIp(): string {
    return this.currentIp;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getLastUpdatedTime(): string {
    if (!this.lastUpdateTimestamp) return '';
    const d = new Date(this.lastUpdateTimestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /**
   * Probe and detect appropriate adapter for the given router address
   */
  async probeAndSelectAdapter(ipAddress: string): Promise<{
    adapter: RouterAdapter;
    isTenda: boolean;
    model?: string;
    firmware?: string;
  }> {
    this.currentIp = ipAddress;
    this.client.setBaseUrl(ipAddress);

    // Try modern module adapter first
    const modern = new TendaModernAdapter(this.client);
    const modernProbe = await modern.probeRouter();
    if (modernProbe.isTenda && modernProbe.authType === 'token') {
      this.adapter = modern;
      return { adapter: modern, isTenda: true, model: modernProbe.model, firmware: modernProbe.firmware };
    }

    // Try legacy classic goform adapter
    const legacy = new TendaLegacyAdapter(this.client);
    const legacyProbe = await legacy.probeRouter();
    this.adapter = legacy;

    return {
      adapter: legacy,
      isTenda: legacyProbe.isTenda || modernProbe.isTenda,
      model: legacyProbe.model || modernProbe.model,
      firmware: legacyProbe.firmware || modernProbe.firmware,
    };
  }

  /**
   * Execute router login and initialize session
   */
  async login(password: string, ipAddress?: string, username?: string, saveToKeystore: boolean = true): Promise<{ success: boolean; message?: string }> {
    const targetIp = ipAddress || this.currentIp;
    if (!this.adapter || targetIp !== this.currentIp) {
      await this.probeAndSelectAdapter(targetIp);
    }

    if (!this.adapter) {
      return { success: false, message: 'Could not connect to router at ' + targetIp };
    }

    const res = await this.adapter.login(password, username);
    if (res.success) {
      this.isAuthenticated = true;
      this.lastUpdateTimestamp = Date.now();

      if (saveToKeystore) {
        await NativeBridge.secureStore(`cred_${targetIp}`, password);
        await NativeBridge.secureStore(`last_user_${targetIp}`, username || 'admin');
      }

      return { success: true };
    }

    return { success: false, message: res.message || 'Authentication failed. Please verify password.' };
  }

  async logout(): Promise<void> {
    if (this.adapter) {
      await this.adapter.logout();
    }
    this.isAuthenticated = false;
    this.stopPolling();
    this.client.clearSession();
  }

  getAdapter(): RouterAdapter {
    if (!this.adapter) {
      this.adapter = new TendaLegacyAdapter(this.client);
    }
    return this.adapter;
  }

  async getCapabilities(): Promise<RouterCapabilities> {
    const adapter = this.getAdapter();
    return await adapter.detectCapabilities();
  }

  async fetchDashboardData(): Promise<{
    info: RouterInfo;
    devices: ConnectedDevice[];
    capabilities: RouterCapabilities;
  }> {
    const adapter = this.getAdapter();
    const [info, devices, capabilities] = await Promise.all([
      adapter.getRouterInfo(),
      adapter.getConnectedDevices(),
      adapter.detectCapabilities(),
    ]);

    this.lastUpdateTimestamp = Date.now();
    return { info, devices, capabilities };
  }

  // Polling helper for live statistics
  startPolling(callback: (data: { info: RouterInfo; devices: ConnectedDevice[] }) => void, intervalMs: number = 4000) {
    this.stopPolling();
    this.pollIntervalId = setInterval(async () => {
      if (!this.isAuthenticated || !this.adapter) return;
      try {
        const info = await this.adapter.getRouterInfo();
        const devices = await this.adapter.getConnectedDevices();
        this.lastUpdateTimestamp = Date.now();
        callback({ info, devices });
      } catch (e) {
        // Router might be temporarily unreachable
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  /**
   * Router reboot with continuous live polling to detect when the router finishes rebooting
   */
  async rebootWithLiveVerification(
    onProgress: (status: 'sending' | 'restarting' | 'probing' | 'online', secondsElapsed: number) => void
  ): Promise<{ success: boolean }> {
    const adapter = this.getAdapter();
    onProgress('sending', 0);
    const trigger = await adapter.reboot();
    if (!trigger.success) return { success: false };

    onProgress('restarting', 5);

    let seconds = 0;
    const maxWaitSeconds = 90;

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        seconds += 2;

        if (seconds < 15) {
          onProgress('restarting', seconds);
          return;
        }

        onProgress('probing', seconds);

        try {
          const probe = await this.client.request('', { method: 'GET', timeoutMs: 2500 });
          if (probe.statusCode === 200 || probe.statusCode === 302) {
            clearInterval(interval);
            onProgress('online', seconds);
            resolve({ success: true });
          }
        } catch (e) {
          // Still restarting
        }

        if (seconds >= maxWaitSeconds) {
          clearInterval(interval);
          resolve({ success: false });
        }
      }, 2000);
    });
  }

  // Profiles Management
  async getSavedProfiles(): Promise<RouterProfile[]> {
    const raw = localStorage.getItem('tenda_router_profiles');
    if (!raw) {
      return [
        { id: 'prof_default', name: 'Primary Router', address: '192.168.0.1', username: 'admin' },
      ];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  async saveProfile(profile: RouterProfile): Promise<void> {
    const profiles = await this.getSavedProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    localStorage.setItem('tenda_router_profiles', JSON.stringify(profiles));
  }

  async deleteProfile(profileId: string): Promise<void> {
    const profiles = await this.getSavedProfiles();
    const filtered = profiles.filter((p) => p.id !== profileId);
    localStorage.setItem('tenda_router_profiles', JSON.stringify(filtered));
  }
}
