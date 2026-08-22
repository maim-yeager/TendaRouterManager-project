import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import {
  Wifi,
  Laptop,
  ArrowDown,
  ArrowUp,
  Cpu,
  Clock,
  HardDrive,
  Globe,
  RotateCw,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    routerInfo,
    devices,
    capabilities,
    setActiveTab,
    setActiveSubPage,
    rebootRouter,
  } = useRouter();

  const [isRebooting, setIsRebooting] = React.useState(false);
  const [rebootStatusText, setRebootStatusText] = React.useState('');

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'Unavailable';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec) return '0 KB/s';
    if (bytesPerSec >= 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    }
    return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
  };

  const handleQuickReboot = async () => {
    if (!window.confirm('Restart Tenda Router? Your Wi-Fi will disconnect temporarily.')) return;
    setIsRebooting(true);
    await rebootRouter((status, seconds) => {
      if (status === 'sending') setRebootStatusText('Sending reboot command...');
      else if (status === 'restarting') setRebootStatusText(`Router restarting (${seconds}s)...`);
      else if (status === 'probing') setRebootStatusText(`Checking if router is online (${seconds}s)...`);
      else if (status === 'online') {
        setRebootStatusText('Router back online!');
        setTimeout(() => setIsRebooting(false), 2000);
      }
    });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Reboot overlay */}
      {isRebooting && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(6, 11, 25, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <RotateCw size={48} className="live-pulse" style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Restarting Router</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '320px' }}>
            {rebootStatusText}
          </p>
        </div>
      )}

      {/* Hero Router Status Banner */}
      <div
        className="hero-panel"
        style={{
          padding: '24px',
          border: '1px solid rgba(0, 106, 106, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="live-pulse" style={{ background: '#006A6A' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {routerInfo?.wanStatus === 'connected' ? 'Internet Connected' : 'Router Online'}
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.5px', color: 'var(--accent-container-text)' }}>
              {routerInfo?.model || 'Tenda Router'}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--accent-teal)', marginTop: '2px', fontWeight: 600, opacity: 0.85 }}>
              Firmware {routerInfo?.firmwareVersion || 'V1.0'} • LAN {routerInfo?.lanIp || '192.168.0.1'}
            </div>
          </div>

          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(0, 106, 106, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-teal)',
            }}
          >
            <Wifi size={22} strokeWidth={2.2} />
          </div>
        </div>

        {/* Speed & Traffic row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0, 106, 106, 0.15)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.45)',
              padding: '10px 14px',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 106, 106, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-teal)',
              }}
            >
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--accent-teal)', fontWeight: 800, letterSpacing: '0.4px' }}>DOWNLOAD</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-container-text)' }}>
                {formatSpeed(routerInfo?.downloadSpeedBps)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.45)',
              padding: '10px 14px',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 106, 106, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-teal)',
              }}
            >
              <ArrowUp size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--accent-teal)', fontWeight: 800, letterSpacing: '0.4px' }}>UPLOAD</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-container-text)' }}>
                {formatSpeed(routerInfo?.uploadSpeedBps)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {/* Connected devices */}
        <div
          className="surface-panel"
          onClick={() => setActiveTab('devices')}
          style={{ padding: '18px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Devices</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Laptop size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
            {devices.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-teal)', marginTop: '4px', fontWeight: 600 }}>
            {devices.filter((d) => d.connectionType === '5GHz').length} on 5GHz • {devices.filter((d) => d.connectionType === '2.4GHz').length} on 2.4GHz
          </div>
        </div>

        {/* WAN IP */}
        <div
          className="surface-panel"
          onClick={() => setActiveTab('network')}
          style={{ padding: '18px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>WAN IP</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 106, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
              <Globe size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '14px', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
            {routerInfo?.wanIp && routerInfo.wanIp !== '0.0.0.0' ? routerInfo.wanIp : 'Unavailable'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
            {routerInfo?.wanType || 'DHCP'} Mode
          </div>
        </div>

        {/* Uptime */}
        <div className="surface-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Uptime</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 106, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
              <Clock size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '12px', color: 'var(--text-primary)' }}>
            {formatUptime(routerInfo?.uptimeSeconds || 0)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            MAC: {routerInfo?.macAddress || '00:00:00:00:00:00'}
          </div>
        </div>

        {/* CPU / Hardware */}
        <div className="surface-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>System Health</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 106, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
              <Cpu size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '12px', color: 'var(--text-primary)' }}>
            {routerInfo?.cpuUsagePercent !== undefined ? `${routerInfo.cpuUsagePercent}% CPU` : 'Normal (Active)'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {routerInfo?.memoryUsagePercent !== undefined ? `${routerInfo.memoryUsagePercent}% RAM` : 'HW ' + (routerInfo?.hardwareVersion || 'V1')}
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="surface-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>Quick Controls</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
          <button
            onClick={() => setActiveTab('wifi')}
            className="glass-button"
            style={{
              borderRadius: '20px',
              padding: '12px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Wifi size={20} color="var(--accent-teal)" strokeWidth={2.2} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Wi-Fi</span>
          </button>

          <button
            onClick={() => setActiveSubPage('guest-wifi')}
            className="glass-button"
            style={{
              borderRadius: '20px',
              padding: '12px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={20} color="var(--accent-teal)" strokeWidth={2.2} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Guest</span>
          </button>

          <button
            onClick={() => setActiveSubPage('parental-control')}
            className="glass-button"
            style={{
              borderRadius: '20px',
              padding: '12px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={20} color="var(--accent-teal)" strokeWidth={2.2} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Parental</span>
          </button>

          <button
            onClick={handleQuickReboot}
            className="glass-button"
            style={{
              borderRadius: '20px',
              padding: '12px 6px',
              color: 'var(--accent-red)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RotateCw size={20} strokeWidth={2.2} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Reboot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
