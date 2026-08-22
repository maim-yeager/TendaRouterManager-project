import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { Sliders, Check } from 'lucide-react';
import { QoSSettings } from '../types/router';

export const QoSPage: React.FC = () => {
  const { qosSettings, saveQoSSettings, capabilities, devices } = useRouter();

  const [form, setForm] = useState<QoSSettings>({
    enabled: false,
    totalBandwidthDownMbps: 100,
    totalBandwidthUpMbps: 20,
    deviceRules: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (qosSettings) {
      setForm(qosSettings);
    }
  }, [qosSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await saveQoSSettings(form);
    setIsSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <CapabilityGuard isSupported={capabilities?.qos} featureName="Quality of Service (QoS)">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Quality of Service (QoS)</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Intelligent bandwidth management to prioritize gaming, streaming, or video calls
          </p>
        </div>

        {savedSuccess && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>QoS settings saved!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Enable Smart QoS</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dynamically allocate bandwidth to prevent lag</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Total Downlink (Mbps)
              </label>
              <input
                type="number"
                className="input-field"
                value={form.totalBandwidthDownMbps}
                onChange={(e) => setForm({ ...form, totalBandwidthDownMbps: parseInt(e.target.value, 10) || 0 })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Total Uplink (Mbps)
              </label>
              <input
                type="number"
                className="input-field"
                value={form.totalBandwidthUpMbps}
                onChange={(e) => setForm({ ...form, totalBandwidthUpMbps: parseInt(e.target.value, 10) || 0 })}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="primary-button"
            style={{ width: '100%', marginTop: '4px' }}
          >
            {isSaving ? 'Saving...' : 'Apply QoS Configuration'}
          </button>
        </form>
      </div>
    </CapabilityGuard>
  );
};
