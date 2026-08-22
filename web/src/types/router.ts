// Router data interfaces and system types

export interface RouterInfo {
  brand: string;
  model: string;
  firmwareVersion: string;
  hardwareVersion?: string;
  lanIp: string;
  wanIp: string;
  wanStatus?: 'connected' | 'connecting' | 'disconnected' | 'unknown';
  wanType?: 'PPPoE' | 'DHCP' | 'Static' | 'Unknown';
  macAddress: string;
  uptimeSeconds: number;
  downloadSpeedBps?: number;
  uploadSpeedBps?: number;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  systemTime?: string;
}

export interface ConnectedDevice {
  name: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  connectionType: '2.4GHz' | '5GHz' | '6GHz' | 'Ethernet' | 'Guest' | 'Unknown';
  signalDbm?: number;
  linkSpeedMbps?: number;
  uploadSpeedBps?: number;
  downloadSpeedBps?: number;
  isBlocked: boolean;
  online: boolean;
  uploadLimitKbps?: number; // 0 = unlimited
  downloadLimitKbps?: number; // 0 = unlimited
  leaseTimeRemaining?: number;
  manufacturer?: string;
}

export interface WifiBandConfig {
  band: '2.4GHz' | '5GHz' | '6GHz';
  enabled: boolean;
  ssid: string;
  hidden: boolean;
  security: 'None' | 'WPA-PSK' | 'WPA2-PSK' | 'WPA/WPA2-PSK' | 'WPA3-SAE' | 'WPA2/WPA3-Mixed';
  password?: string;
  channel: string | number; // 'auto' or channel number
  channelWidth: '20MHz' | '40MHz' | '80MHz' | '160MHz' | 'Auto';
  txPower: 'Low' | 'Medium' | 'High';
  wmmEnabled?: boolean;
  beamformingEnabled?: boolean;
}

export interface WifiSettings {
  bands: WifiBandConfig[];
  unifyBands?: boolean; // Smart connect / band steering
  wpsEnabled?: boolean;
}

export interface GuestWifiSettings {
  enabled: boolean;
  ssid: string;
  security: 'None' | 'WPA2-PSK';
  password?: string;
  durationHours: number; // 0 for unlimited, or 4, 8, 24
  downloadLimitKbps: number; // 0 = unlimited
  uploadLimitKbps: number;
  allowLocalAccess: boolean; // Isolate LAN
  activeClientsCount?: number;
}

export interface DHCPSettings {
  enabled: boolean;
  startIp: string;
  endIp: string;
  gateway: string;
  subnetMask: string;
  leaseTimeMinutes: number;
  primaryDns: string;
  secondaryDns: string;
  staticLeases: StaticDhcpLease[];
}

export interface StaticDhcpLease {
  id: string;
  deviceName: string;
  macAddress: string;
  ipAddress: string;
  enabled: boolean;
}

export interface DNSSettings {
  mode: 'auto' | 'manual';
  primaryDns: string;
  secondaryDns: string;
}

export interface QoSSettings {
  enabled: boolean;
  totalBandwidthDownMbps: number;
  totalBandwidthUpMbps: number;
  deviceRules: QoSDeviceRule[];
}

export interface QoSDeviceRule {
  macAddress: string;
  deviceName: string;
  priority: 'High' | 'Normal' | 'Low';
  maxDownloadKbps: number;
  maxUploadKbps: number;
}

export interface ParentalControlRule {
  id: string;
  profileName: string;
  targetMacAddresses: string[];
  enabled: boolean;
  timeRules: {
    days: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    startTime: string; // "09:00"
    endTime: string; // "21:00"
  }[];
  isInternetPaused: boolean;
  blockedWebsites: string[];
}

export interface PortForwardingRule {
  id: string;
  name: string;
  lanIp: string;
  internalPort: number;
  externalPort: number;
  protocol: 'TCP' | 'UDP' | 'BOTH';
  enabled: boolean;
}

export interface UPnPSettings {
  enabled: boolean;
  activePortMappings: {
    description: string;
    internalClient: string;
    internalPort: number;
    externalPort: number;
    protocol: string;
  }[];
}

export interface MeshNode {
  id: string;
  name: string;
  model: string;
  role: 'Primary' | 'Secondary';
  ipAddress: string;
  macAddress: string;
  connectionType: 'Ethernet' | '5GHz' | '2.4GHz';
  signalQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  connectedDevicesCount: number;
  firmwareVersion: string;
  online: boolean;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: 'SYSTEM' | 'WAN' | 'DHCP' | 'WIFI' | 'AUTH' | 'SECURITY';
  message: string;
}

export interface RouterCapabilities {
  wifi2GHz: boolean;
  wifi5GHz: boolean;
  wifi6GHz: boolean;
  guestNetwork: boolean;
  mesh: boolean;
  qos: boolean;
  parentalControl: boolean;
  bandwidthControl: boolean;
  dhcp: boolean;
  dns: boolean;
  portForwarding: boolean;
  upnp: boolean;
  staticRouting: boolean;
  reboot: boolean;
  logs: boolean;
  trafficStatistics: boolean;
}

export interface RouterProfile {
  id: string;
  name: string; // e.g. "Home", "Office", "Shop"
  address: string; // e.g. "192.168.0.1"
  username: string;
  hasSavedCredentials?: boolean;
  lastConnectedTime?: number;
  modelDetected?: string;
}

export interface NativeRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  followRedirects?: boolean;
}

export interface NativeResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  cookies?: Record<string, string>;
  error?: string;
}

export interface NetworkStateInfo {
  isConnected: boolean;
  isWifi: boolean;
  type: string;
  wifiSsid?: string;
  ipAddress?: string;
  gatewayIp?: string;
}
