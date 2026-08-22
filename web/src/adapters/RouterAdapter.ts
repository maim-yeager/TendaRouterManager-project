// Base interface for all Tenda Router Adapters

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

export interface RouterAdapter {
  readonly adapterName: string;

  // Authentication & Probe
  probeRouter(): Promise<{ isTenda: boolean; model?: string; firmware?: string; authType?: string }>;
  login(password: string, username?: string): Promise<{ success: boolean; message?: string; sessionKey?: string }>;
  logout(): Promise<void>;
  detectCapabilities(): Promise<RouterCapabilities>;

  // Core Metrics & System
  getRouterInfo(): Promise<RouterInfo>;
  reboot(): Promise<{ success: boolean; message?: string }>;
  restoreFactoryDefaults?(): Promise<{ success: boolean; message?: string }>;

  // Connected Devices
  getConnectedDevices(): Promise<ConnectedDevice[]>;
  renameDevice(macAddress: string, newName: string): Promise<{ success: boolean }>;
  setDeviceBlockStatus(macAddress: string, block: boolean): Promise<{ success: boolean }>;
  setDeviceSpeedLimit(macAddress: string, uploadLimitKbps: number, downloadLimitKbps: number): Promise<{ success: boolean }>;

  // Wi-Fi Management
  getWifiSettings(): Promise<WifiSettings>;
  setWifiSettings(settings: Partial<WifiSettings>): Promise<{ success: boolean; message?: string }>;

  // Guest Wi-Fi
  getGuestWifiSettings(): Promise<GuestWifiSettings>;
  setGuestWifiSettings(settings: Partial<GuestWifiSettings>): Promise<{ success: boolean }>;

  // Network & WAN
  getWanStatus(): Promise<{ wanIp: string; wanType: string; status: 'connected' | 'connecting' | 'disconnected'; dns: string[] }>;
  getDHCPSettings(): Promise<DHCPSettings>;
  setDHCPSettings(settings: Partial<DHCPSettings>): Promise<{ success: boolean }>;
  getDNSSettings(): Promise<DNSSettings>;
  setDNSSettings(settings: DNSSettings): Promise<{ success: boolean }>;

  // Advanced features (returns null if unsupported)
  getQoSSettings(): Promise<QoSSettings | null>;
  setQoSSettings(settings: QoSSettings): Promise<{ success: boolean }>;
  getParentalControlRules(): Promise<ParentalControlRule[] | null>;
  saveParentalControlRule(rule: ParentalControlRule): Promise<{ success: boolean }>;
  deleteParentalControlRule(ruleId: string): Promise<{ success: boolean }>;
  getPortForwardingRules(): Promise<PortForwardingRule[] | null>;
  savePortForwardingRule(rule: PortForwardingRule): Promise<{ success: boolean }>;
  deletePortForwardingRule(ruleId: string): Promise<{ success: boolean }>;
  getUPnPSettings(): Promise<UPnPSettings | null>;
  setUPnPStatus(enabled: boolean): Promise<{ success: boolean }>;
  getMeshTopology(): Promise<MeshNode[] | null>;
  getSystemLogs(): Promise<SystemLogEntry[] | null>;
  clearSystemLogs?(): Promise<{ success: boolean }>;
}
