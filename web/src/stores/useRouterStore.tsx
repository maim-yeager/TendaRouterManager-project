// Global React Context and hook for router management state

import React, { createContext, useContext, useEffect, useState } from 'react';
import { NativeBridge } from '../security/nativeBridge';
import { RouterService } from '../services/routerService';
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

interface RouterStoreContextType {
  // Connection & Auth
  isAuthenticated: boolean;
  isConnecting: boolean;
  isOffline: boolean;
  offlineReason: string;
  gatewayIp: string;
  activeProfile: RouterProfile | null;
  profiles: RouterProfile[];
  theme: 'dark' | 'light' | 'system';
  lastUpdated: string;
  activeTab: 'home' | 'devices' | 'wifi' | 'network' | 'more';
  activeSubPage: string | null;
  globalSearchQuery: string;

  // Real Router Data
  routerInfo: RouterInfo | null;
  capabilities: RouterCapabilities | null;
  devices: ConnectedDevice[];
  wifiSettings: WifiSettings | null;
  guestWifiSettings: GuestWifiSettings | null;
  dhcpSettings: DHCPSettings | null;
  dnsSettings: DNSSettings | null;
  qosSettings: QoSSettings | null;
  parentalRules: ParentalControlRule[];
  portForwardingRules: PortForwardingRule[];
  upnpSettings: UPnPSettings | null;
  meshNodes: MeshNode[] | null;
  logs: SystemLogEntry[];

  // Actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setActiveTab: (tab: 'home' | 'devices' | 'wifi' | 'network' | 'more') => void;
  setActiveSubPage: (page: string | null) => void;
  setGlobalSearchQuery: (query: string) => void;
  setGatewayIp: (ip: string) => void;
  login: (password: string, ip?: string, username?: string, save?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAll: () => Promise<void>;
  rebootRouter: (onProgress: (status: 'sending' | 'restarting' | 'probing' | 'online', seconds: number) => void) => Promise<{ success: boolean }>;
  
  // Specific mutations
  renameDevice: (mac: string, name: string) => Promise<boolean>;
  toggleDeviceBlock: (mac: string, block: boolean) => Promise<boolean>;
  setDeviceSpeedLimit: (mac: string, upKbps: number, downKbps: number) => Promise<boolean>;
  saveWifiSettings: (settings: Partial<WifiSettings>) => Promise<{ success: boolean; message?: string }>;
  saveGuestWifiSettings: (settings: Partial<GuestWifiSettings>) => Promise<boolean>;
  saveDHCPSettings: (settings: Partial<DHCPSettings>) => Promise<boolean>;
  saveDNSSettings: (settings: DNSSettings) => Promise<boolean>;
  saveQoSSettings: (settings: QoSSettings) => Promise<boolean>;
  saveParentalRule: (rule: ParentalControlRule) => Promise<boolean>;
  deleteParentalRule: (ruleId: string) => Promise<boolean>;
  savePortForwardingRule: (rule: PortForwardingRule) => Promise<boolean>;
  deletePortForwardingRule: (ruleId: string) => Promise<boolean>;
  setUPnPStatus: (enabled: boolean) => Promise<boolean>;
  refreshLogs: () => Promise<void>;
  saveProfile: (profile: RouterProfile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

const RouterStoreContext = createContext<RouterStoreContextType | null>(null);

export const RouterStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const routerService = RouterService.getInstance();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineReason, setOfflineReason] = useState<string>('');
  const [gatewayIp, setGatewayIp] = useState<string>('192.168.0.1');
  const [activeProfile, setActiveProfile] = useState<RouterProfile | null>(null);
  const [profiles, setProfiles] = useState<RouterProfile[]>([]);
  const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>('dark');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'devices' | 'wifi' | 'network' | 'more'>('home');
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // Router States
  const [routerInfo, setRouterInfo] = useState<RouterInfo | null>(null);
  const [capabilities, setCapabilities] = useState<RouterCapabilities | null>(null);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [wifiSettings, setWifiSettings] = useState<WifiSettings | null>(null);
  const [guestWifiSettings, setGuestWifiSettings] = useState<GuestWifiSettings | null>(null);
  const [dhcpSettings, setDhcpSettings] = useState<DHCPSettings | null>(null);
  const [dnsSettings, setDnsSettings] = useState<DNSSettings | null>(null);
  const [qosSettings, setQosSettings] = useState<QoSSettings | null>(null);
  const [parentalRules, setParentalRules] = useState<ParentalControlRule[]>([]);
  const [portForwardingRules, setPortForwardingRules] = useState<PortForwardingRule[]>([]);
  const [upnpSettings, setUpnpSettings] = useState<UPnPSettings | null>(null);
  const [meshNodes, setMeshNodes] = useState<MeshNode[] | null>(null);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);

  // Initialize theme, saved profiles, and gateway detection on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('tenda_theme') as any) || 'dark';
    setThemeState(savedTheme);
    applyThemeToDOM(savedTheme);

    routerService.getSavedProfiles().then((p) => {
      setProfiles(p);
      if (p.length > 0) setActiveProfile(p[0]);
    });

    // Detect actual active network gateway
    NativeBridge.detectGateway().then((gw) => {
      if (gw.gatewayIp) {
        setGatewayIp(gw.gatewayIp);
      }
    });

    // Native network state polling / changes
    const interval = setInterval(async () => {
      const net = await NativeBridge.getNetworkState();
      if (!net.isConnected) {
        setIsOffline(true);
        setOfflineReason('No Wi-Fi or local network connection detected.');
      } else {
        if (isOffline && offlineReason.includes('No Wi-Fi')) {
          setIsOffline(false);
          setOfflineReason('');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const applyThemeToDOM = (t: 'dark' | 'light' | 'system') => {
    const root = document.documentElement;
    if (t === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  };

  const setTheme = (newTheme: 'dark' | 'light' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('tenda_theme', newTheme);
    applyThemeToDOM(newTheme);
  };

  const refreshAll = async () => {
    if (!isAuthenticated) return;
    try {
      const adapter = routerService.getAdapter();
      const [info, devs, caps] = await Promise.all([
        adapter.getRouterInfo(),
        adapter.getConnectedDevices(),
        adapter.detectCapabilities(),
      ]);

      setRouterInfo(info);
      setDevices(devs);
      setCapabilities(caps);
      setIsOffline(false);
      setLastUpdated(routerService.getLastUpdatedTime());
    } catch (e: any) {
      setIsOffline(true);
      setOfflineReason('Router unreachable. Verify Wi-Fi network connection and router address.');
    }
  };

  const login = async (password: string, ip?: string, username?: string, save: boolean = true) => {
    setIsConnecting(true);
    const targetIp = ip || gatewayIp;
    try {
      const res = await routerService.login(password, targetIp, username, save);
      if (res.success) {
        setIsAuthenticated(true);
        setIsOffline(false);
        setGatewayIp(targetIp);

        // Fetch initial data
        const adapter = routerService.getAdapter();
        const [info, devs, caps, wifi, guest, dhcp, dns] = await Promise.all([
          adapter.getRouterInfo().catch(() => null),
          adapter.getConnectedDevices().catch(() => []),
          adapter.detectCapabilities().catch(() => null),
          adapter.getWifiSettings().catch(() => null),
          adapter.getGuestWifiSettings().catch(() => null),
          adapter.getDHCPSettings().catch(() => null),
          adapter.getDNSSettings().catch(() => null),
        ]);

        if (info) setRouterInfo(info);
        if (devs) setDevices(devs);
        if (caps) setCapabilities(caps);
        if (wifi) setWifiSettings(wifi);
        if (guest) setGuestWifiSettings(guest);
        if (dhcp) setDhcpSettings(dhcp);
        if (dns) setDnsSettings(dns);

        setLastUpdated(routerService.getLastUpdatedTime());

        // Start live polling
        routerService.startPolling(({ info: liveInfo, devices: liveDevs }) => {
          setRouterInfo(liveInfo);
          setDevices(liveDevs);
          setLastUpdated(routerService.getLastUpdatedTime());
        });

        setIsConnecting(false);
        return { success: true };
      }

      setIsConnecting(false);
      return { success: false, message: res.message || 'Login failed' };
    } catch (e: any) {
      setIsConnecting(false);
      return { success: false, message: e.message || 'Connection error' };
    }
  };

  const logout = async () => {
    await routerService.logout();
    setIsAuthenticated(false);
    setRouterInfo(null);
    setDevices([]);
    setCapabilities(null);
    setActiveTab('home');
    setActiveSubPage(null);
  };

  const rebootRouter = async (onProgress: (status: 'sending' | 'restarting' | 'probing' | 'online', seconds: number) => void) => {
    return await routerService.rebootWithLiveVerification(onProgress);
  };

  const renameDevice = async (mac: string, name: string) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.renameDevice(mac, name);
    if (res.success) {
      setDevices((prev) => prev.map((d) => (d.macAddress === mac ? { ...d, name } : d)));
    }
    return res.success;
  };

  const toggleDeviceBlock = async (mac: string, block: boolean) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setDeviceBlockStatus(mac, block);
    if (res.success) {
      setDevices((prev) => prev.map((d) => (d.macAddress === mac ? { ...d, isBlocked: block } : d)));
    }
    return res.success;
  };

  const setDeviceSpeedLimit = async (mac: string, upKbps: number, downKbps: number) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setDeviceSpeedLimit(mac, upKbps, downKbps);
    if (res.success) {
      setDevices((prev) =>
        prev.map((d) => (d.macAddress === mac ? { ...d, uploadLimitKbps: upKbps, downloadLimitKbps: downKbps } : d))
      );
    }
    return res.success;
  };

  const saveWifiSettings = async (settings: Partial<WifiSettings>) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setWifiSettings(settings);
    if (res.success) {
      const updated = await adapter.getWifiSettings();
      setWifiSettings(updated);
    }
    return res;
  };

  const saveGuestWifiSettings = async (settings: Partial<GuestWifiSettings>) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setGuestWifiSettings(settings);
    if (res.success) {
      const updated = await adapter.getGuestWifiSettings();
      setGuestWifiSettings(updated);
    }
    return res.success;
  };

  const saveDHCPSettings = async (settings: Partial<DHCPSettings>) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setDHCPSettings(settings);
    if (res.success) {
      const updated = await adapter.getDHCPSettings();
      setDhcpSettings(updated);
    }
    return res.success;
  };

  const saveDNSSettings = async (settings: DNSSettings) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setDNSSettings(settings);
    if (res.success) {
      setDnsSettings(settings);
    }
    return res.success;
  };

  const saveQoSSettings = async (settings: QoSSettings) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setQoSSettings(settings);
    if (res.success) {
      setQosSettings(settings);
    }
    return res.success;
  };

  const saveParentalRule = async (rule: ParentalControlRule) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.saveParentalControlRule(rule);
    if (res.success) {
      const updated = await adapter.getParentalControlRules();
      if (updated) setParentalRules(updated);
    }
    return res.success;
  };

  const deleteParentalRule = async (ruleId: string) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.deleteParentalControlRule(ruleId);
    if (res.success) {
      setParentalRules((prev) => prev.filter((r) => r.id !== ruleId));
    }
    return res.success;
  };

  const savePortForwardingRule = async (rule: PortForwardingRule) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.savePortForwardingRule(rule);
    if (res.success) {
      const updated = await adapter.getPortForwardingRules();
      if (updated) setPortForwardingRules(updated);
    }
    return res.success;
  };

  const deletePortForwardingRule = async (ruleId: string) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.deletePortForwardingRule(ruleId);
    if (res.success) {
      setPortForwardingRules((prev) => prev.filter((r) => r.id !== ruleId));
    }
    return res.success;
  };

  const setUPnPStatus = async (enabled: boolean) => {
    const adapter = routerService.getAdapter();
    const res = await adapter.setUPnPStatus(enabled);
    if (res.success && upnpSettings) {
      setUpnpSettings({ ...upnpSettings, enabled });
    }
    return res.success;
  };

  const refreshLogs = async () => {
    const adapter = routerService.getAdapter();
    const fetched = await adapter.getSystemLogs();
    if (fetched) setLogs(fetched);
  };

  const saveProfile = async (profile: RouterProfile) => {
    await routerService.saveProfile(profile);
    const p = await routerService.getSavedProfiles();
    setProfiles(p);
  };

  const deleteProfile = async (id: string) => {
    await routerService.deleteProfile(id);
    const p = await routerService.getSavedProfiles();
    setProfiles(p);
  };

  return (
    <RouterStoreContext.Provider
      value={{
        isAuthenticated,
        isConnecting,
        isOffline,
        offlineReason,
        gatewayIp,
        activeProfile,
        profiles,
        theme,
        lastUpdated,
        activeTab,
        activeSubPage,
        globalSearchQuery,
        routerInfo,
        capabilities,
        devices,
        wifiSettings,
        guestWifiSettings,
        dhcpSettings,
        dnsSettings,
        qosSettings,
        parentalRules,
        portForwardingRules,
        upnpSettings,
        meshNodes,
        logs,
        setTheme,
        setActiveTab,
        setActiveSubPage,
        setGlobalSearchQuery,
        setGatewayIp,
        login,
        logout,
        refreshAll,
        rebootRouter,
        renameDevice,
        toggleDeviceBlock,
        setDeviceSpeedLimit,
        saveWifiSettings,
        saveGuestWifiSettings,
        saveDHCPSettings,
        saveDNSSettings,
        saveQoSSettings,
        saveParentalRule,
        deleteParentalRule,
        savePortForwardingRule,
        deletePortForwardingRule,
        setUPnPStatus,
        refreshLogs,
        saveProfile,
        deleteProfile,
      }}
    >
      {children}
    </RouterStoreContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterStoreContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterStoreProvider');
  }
  return context;
};
