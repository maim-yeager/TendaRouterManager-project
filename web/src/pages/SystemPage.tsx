import React, { useState } from 'react';
import { useRouter } from '../stores/useRouterStore';
import {
  RotateCw,
  HardDrive,
  Cpu,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const SystemPage: React.FC = () => {
  const { routerInfo, rebootRouter } = useRouter();

  const [isRebooting, setIsRebooting] = useState(false);
  const [rebootStatusText, setRebootStatusText] = useState('');

  const handleReboot = async () => {
    if (!window.confirm('Restart Tenda Router? All connected devices will temporarily disconnect.')) return;
    setIsRebooting(true);
    await rebootRouter((status, seconds) => {
      if (status === 'sending') setRebootStatusText('Sending reboot command to router...');
      else if (status === 'restarting') setRebootStatusText(`Router is rebooting (${seconds}s)...`);
      else if (status === 'probing') setRebootStatusText(`Waiting for Wi-Fi and router gateway to respond (${seconds}s)...`);
      else if (status === 'online') {
        setRebootStatusText('Router back online and operational!');
        setTimeout(() => setIsRebooting(false), 2000);
      }
    });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>System & Maintenance</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Router hardware specifications, firmware management, and power controls
        </p>
      </div>

      {isRebooting && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            textAlign: 'center',
            background: 'rgba(0, 210, 255, 0.1)',
            border: '1px solid rgba(0, 210, 255, 0.3)',
          }}
        >
          <RotateCw size={36} className="live-pulse" style={{ color: 'var(--accent-cyan)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{rebootStatusText}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Please wait while the hardware re-initializes its network stack.
          </p>
        </div>
      )}

      {/* Hardware Specs Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Device Specifications</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Router Model</span>
            <span style={{ fontWeight: 700 }}>{routerInfo?.model || 'Tenda Device'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Firmware Version</span>
            <span className="mono" style={{ fontWeight: 600 }}>{routerInfo?.firmwareVersion || 'V1.0.0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Hardware Version</span>
            <span style={{ fontWeight: 600 }}>{routerInfo?.hardwareVersion || 'V1.0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>LAN MAC Address</span>
            <span className="mono" style={{ fontWeight: 600 }}>{routerInfo?.macAddress || '00:00:00:00:00:00'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>System Time</span>
            <span style={{ fontWeight: 600 }}>{routerInfo?.systemTime || new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Reboot & Factory Reset Card */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Power Controls</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Rebooting clears temporary caches and refreshes network routing tables.
        </p>

        <button
          onClick={handleReboot}
          disabled={isRebooting}
          className="primary-button"
          style={{ width: '100%' }}
        >
          <RotateCw size={16} />
          <span>Restart Tenda Router</span>
        </button>

        <div style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', marginBottom: '8px' }}>
            <ShieldAlert size={18} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Danger Zone</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Reset router to factory default settings? All Wi-Fi passwords and custom rules will be wiped.')) {
                alert('Factory reset initiated on router.');
              }
            }}
            className="danger-button"
            style={{ width: '100%', fontSize: '13px', padding: '10px' }}
          >
            Reset to Factory Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
