import React, { useState } from 'react';
import { useRouter } from '../stores/useRouterStore';
import {
  Laptop,
  Smartphone,
  Tv,
  Wifi,
  Shield,
  Edit2,
  Sliders,
  Check,
  X,
  Search,
  ArrowDown,
  ArrowUp,
  Ban,
  Radio,
} from 'lucide-react';
import { ConnectedDevice } from '../types/router';

export const DevicesPage: React.FC = () => {
  const { devices, renameDevice, toggleDeviceBlock, setDeviceSpeedLimit, globalSearchQuery } = useRouter();
  const [search, setSearch] = useState(globalSearchQuery || '');
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [editName, setEditName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [downLimit, setDownLimit] = useState(0);
  const [upLimit, setUpLimit] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredDevices = devices.filter((d) => {
    const q = (search || globalSearchQuery || '').toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.ipAddress.includes(q) ||
      d.macAddress.toLowerCase().includes(q) ||
      d.hostname.toLowerCase().includes(q)
    );
  });

  const getDeviceIcon = (name: string, type: string) => {
    const lower = (name + type).toLowerCase();
    if (lower.includes('phone') || lower.includes('iphone') || lower.includes('android') || lower.includes('galaxy') || lower.includes('xiaomi')) {
      return <Smartphone size={20} color="var(--accent-cyan)" />;
    }
    if (lower.includes('tv') || lower.includes('roku') || lower.includes('fire') || lower.includes('chromecast')) {
      return <Tv size={20} color="var(--accent-purple)" />;
    }
    return <Laptop size={20} color="var(--accent-blue)" />;
  };

  const handleOpenRename = (device: ConnectedDevice) => {
    setSelectedDevice(device);
    setEditName(device.name);
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    if (!selectedDevice || !editName.trim()) return;
    setIsUpdating(true);
    await renameDevice(selectedDevice.macAddress, editName.trim());
    setIsUpdating(false);
    setShowRenameModal(false);
  };

  const handleOpenLimit = (device: ConnectedDevice) => {
    setSelectedDevice(device);
    setDownLimit(device.downloadLimitKbps || 0);
    setUpLimit(device.uploadLimitKbps || 0);
    setShowLimitModal(true);
  };

  const handleSaveLimit = async () => {
    if (!selectedDevice) return;
    setIsUpdating(true);
    await setDeviceSpeedLimit(selectedDevice.macAddress, upLimit, downLimit);
    setIsUpdating(false);
    setShowLimitModal(false);
  };

  const handleToggleBlock = async (device: ConnectedDevice) => {
    const action = device.isBlocked ? 'Unblock' : 'Block Internet Access for';
    if (!window.confirm(`${action} ${device.name} (${device.ipAddress})?`)) return;
    await toggleDeviceBlock(device.macAddress, !device.isBlocked);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Connected Devices</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {devices.length} active client{devices.length === 1 ? '' : 's'} on local network
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          className="input-field"
          style={{ paddingLeft: '38px' }}
          placeholder="Search by device name, IP or MAC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Device List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredDevices.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No devices matching your search or no clients connected.
          </div>
        ) : (
          filteredDevices.map((device) => (
            <div
              key={device.macAddress}
              className="glass-panel"
              style={{
                padding: '16px',
                borderLeft: device.isBlocked ? '4px solid #ef4444' : '4px solid var(--accent-cyan)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getDeviceIcon(device.name, device.connectionType)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{device.name}</span>
                      <button
                        onClick={() => handleOpenRename(device)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        aria-label="Rename"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {device.ipAddress} • <span className="mono" style={{ fontSize: '11px' }}>{device.macAddress}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={
                    device.isBlocked
                      ? 'badge badge-danger'
                      : device.connectionType === '5GHz'
                      ? 'badge badge-info'
                      : 'badge badge-success'
                  }
                >
                  {device.isBlocked ? 'Blocked' : device.connectionType}
                </span>
              </div>

              {/* Stats & Actions Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}>
                  {device.signalDbm !== undefined && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Radio size={13} /> {device.signalDbm} dBm
                    </span>
                  )}
                  {(device.downloadLimitKbps || 0) > 0 && (
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                      Limit: {device.downloadLimitKbps} KB/s
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenLimit(device)}
                    className="glass-button"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <Sliders size={12} />
                    <span>Speed Limit</span>
                  </button>
                  <button
                    onClick={() => handleToggleBlock(device)}
                    style={{
                      background: device.isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: device.isBlocked ? '#10b981' : '#ef4444',
                      border: '1px solid ' + (device.isBlocked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Ban size={12} />
                    <span>{device.isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rename Modal */}
      {showRenameModal && selectedDevice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Rename Device</h3>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Custom Friendly Name
            </label>
            <input
              type="text"
              className="input-field"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. My Laptop, Living Room TV"
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRenameModal(false)}
                className="glass-button"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                disabled={isUpdating}
                className="primary-button"
                style={{ padding: '8px 16px' }}
              >
                {isUpdating ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speed Limit Modal */}
      {showLimitModal && selectedDevice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Bandwidth Limit</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Set rate limit for {selectedDevice.name} (0 = Unlimited)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Max Download Speed (KB/s)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={downLimit}
                  onChange={(e) => setDownLimit(parseInt(e.target.value, 10) || 0)}
                  min="0"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Max Upload Speed (KB/s)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={upLimit}
                  onChange={(e) => setUpLimit(parseInt(e.target.value, 10) || 0)}
                  min="0"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLimitModal(false)}
                className="glass-button"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimit}
                disabled={isUpdating}
                className="primary-button"
                style={{ padding: '8px 16px' }}
              >
                {isUpdating ? 'Applying...' : 'Apply Limits'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
