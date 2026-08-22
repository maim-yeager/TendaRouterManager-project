import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import {
  Wifi,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  RotateCw,
  Signal,
  Sliders,
  Shield,
} from 'lucide-react';
import { WifiBandConfig } from '../types/router';

export const WifiPage: React.FC = () => {
  const { wifiSettings, saveWifiSettings, capabilities } = useRouter();

  const [activeBandIndex, setActiveBandIndex] = useState(0);
  const [bands, setBands] = useState<WifiBandConfig[]>([]);
  const [unifyBands, setUnifyBands] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyStep, setApplyStep] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (wifiSettings?.bands) {
      setBands(JSON.parse(JSON.stringify(wifiSettings.bands)));
      setUnifyBands(wifiSettings.unifyBands || false);
    } else {
      // Defaults if not yet loaded
      setBands([
        {
          band: '2.4GHz',
          enabled: true,
          ssid: 'Tenda_WiFi',
          hidden: false,
          security: 'WPA2-PSK',
          password: '',
          channel: 'auto',
          channelWidth: 'Auto',
          txPower: 'High',
        },
      ]);
    }
  }, [wifiSettings]);

  const currentBand = bands[activeBandIndex] || bands[0];

  const updateCurrentBand = (field: keyof WifiBandConfig, value: any) => {
    setBands((prev) => {
      const copy = [...prev];
      if (copy[activeBandIndex]) {
        copy[activeBandIndex] = { ...copy[activeBandIndex], [field]: value };
      }
      return copy;
    });
  };

  const handleApplyClick = () => {
    setShowWarningModal(true);
  };

  const handleConfirmApply = async () => {
    setShowWarningModal(false);
    setIsApplying(true);
    setApplyStep('Applying Wi-Fi changes to Tenda router...');

    try {
      const res = await saveWifiSettings({
        bands,
        unifyBands,
      });

      setApplyStep('Router Wi-Fi radio updating...');
      await new Promise((r) => setTimeout(r, 4000));
      setApplyStep('Verifying router response...');
      await new Promise((r) => setTimeout(r, 2000));

      if (res.success) {
        setStatusMessage('Wi-Fi configuration applied successfully!');
      } else {
        setStatusMessage(res.message || 'Failed to update Wi-Fi settings.');
      }
    } catch (e: any) {
      setStatusMessage('Error updating Wi-Fi: ' + e.message);
    } finally {
      setIsApplying(false);
      setApplyStep('');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Wi-Fi Settings</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Configure wireless network SSIDs, security encryption, and radio channels
        </p>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: statusMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: '1px solid ' + (statusMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
            color: statusMessage.includes('successfully') ? '#10b981' : '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Applying Progress Overlay */}
      {isApplying && (
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
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Updating Wi-Fi Radio</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{applyStep}</p>
        </div>
      )}

      {/* Band Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {bands.map((b, idx) => (
          <button
            key={b.band}
            onClick={() => setActiveBandIndex(idx)}
            className="glass-button"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '12px',
              borderColor: activeBandIndex === idx ? 'var(--accent-cyan)' : 'var(--border-color)',
              background: activeBandIndex === idx ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: activeBandIndex === idx ? 'var(--accent-cyan)' : 'var(--text-primary)',
            }}
          >
            <Wifi size={16} />
            <span>{b.band}</span>
          </button>
        ))}
      </div>

      {currentBand && (
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Enable Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Enable {currentBand.band} Wireless</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Broadcast Wi-Fi on this band</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={currentBand.enabled}
                onChange={(e) => updateCurrentBand('enabled', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* SSID */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Network Name (SSID)
            </label>
            <input
              type="text"
              className="input-field"
              value={currentBand.ssid}
              onChange={(e) => updateCurrentBand('ssid', e.target.value)}
              placeholder="Wi-Fi Name"
              maxLength={32}
            />
          </div>

          {/* Hide SSID */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Hide SSID (Stealth Mode)</span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prevent SSID from appearing in public scans</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={currentBand.hidden}
                onChange={(e) => updateCurrentBand('hidden', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Security */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Security Mode
            </label>
            <select
              className="input-field"
              value={currentBand.security}
              onChange={(e) => updateCurrentBand('security', e.target.value as any)}
            >
              <option value="WPA2-PSK">WPA2-PSK (Recommended)</option>
              <option value="WPA/WPA2-PSK">WPA/WPA2-PSK Mixed</option>
              <option value="WPA3-SAE">WPA3-SAE (Modern Wi-Fi 6)</option>
              <option value="WPA2/WPA3-Mixed">WPA2/WPA3 Mixed</option>
              <option value="None">None (Open Network)</option>
            </select>
          </div>

          {/* Password */}
          {currentBand.security !== 'None' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Wi-Fi Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={currentBand.password || ''}
                  onChange={(e) => updateCurrentBand('password', e.target.value)}
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Advanced Radio Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Channel
              </label>
              <select
                className="input-field"
                value={String(currentBand.channel)}
                onChange={(e) => updateCurrentBand('channel', e.target.value)}
              >
                <option value="auto">Auto (Recommended)</option>
                {currentBand.band === '2.4GHz'
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => (
                      <option key={c} value={c}>Channel {c}</option>
                    ))
                  : [36, 40, 44, 48, 149, 153, 157, 161].map((c) => (
                      <option key={c} value={c}>Channel {c}</option>
                    ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Transmit Power
              </label>
              <select
                className="input-field"
                value={currentBand.txPower}
                onChange={(e) => updateCurrentBand('txPower', e.target.value as any)}
              >
                <option value="High">High (Standard)</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low (Eco)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleApplyClick}
            disabled={isApplying}
            className="primary-button"
            style={{ width: '100%', marginTop: '8px' }}
          >
            Apply Wi-Fi Settings
          </button>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-amber)', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Confirm Wi-Fi Update</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Applying changes to SSID or password will momentarily restart the router's wireless radio. Your phone and all connected devices may temporarily disconnect.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowWarningModal(false)}
                className="glass-button"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                className="primary-button"
                style={{ padding: '8px 16px' }}
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
