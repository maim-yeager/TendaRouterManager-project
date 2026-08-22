import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { Server, Plus, Trash2, Check } from 'lucide-react';
import { DHCPSettings, StaticDhcpLease } from '../types/router';

export const DHCPPage: React.FC = () => {
  const { dhcpSettings, saveDHCPSettings, capabilities } = useRouter();

  const [form, setForm] = useState<DHCPSettings>({
    enabled: true,
    startIp: '192.168.0.100',
    endIp: '192.168.0.200',
    gateway: '192.168.0.1',
    subnetMask: '255.255.255.0',
    leaseTimeMinutes: 1440,
    primaryDns: '',
    secondaryDns: '',
    staticLeases: [],
  });

  const [showAddLease, setShowAddLease] = useState(false);
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeaseIp, setNewLeaseIp] = useState('192.168.0.');
  const [newLeaseMac, setNewLeaseMac] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (dhcpSettings) {
      setForm(dhcpSettings);
    }
  }, [dhcpSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await saveDHCPSettings(form);
    setIsSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleAddLease = () => {
    if (!newLeaseIp || !newLeaseMac) return;
    const newLease: StaticDhcpLease = {
      id: 'lease_' + Date.now(),
      deviceName: newLeaseName || 'Static Device',
      ipAddress: newLeaseIp,
      macAddress: newLeaseMac,
      enabled: true,
    };
    setForm({
      ...form,
      staticLeases: [...form.staticLeases, newLease],
    });
    setNewLeaseName('');
    setNewLeaseMac('');
    setShowAddLease(false);
  };

  const handleDeleteLease = (id: string) => {
    setForm({
      ...form,
      staticLeases: form.staticLeases.filter((l) => l.id !== id),
    });
  };

  return (
    <CapabilityGuard isSupported={capabilities?.dhcp} featureName="DHCP Server">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>DHCP Server & Static Leases</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Manage local IP address allocation and reserve static IP addresses for devices
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
            <span>DHCP configuration saved!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>DHCP Server</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Automatically assign IP addresses to devices</div>
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
                Start IP Address
              </label>
              <input
                type="text"
                className="input-field"
                value={form.startIp}
                onChange={(e) => setForm({ ...form, startIp: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                End IP Address
              </label>
              <input
                type="text"
                className="input-field"
                value={form.endIp}
                onChange={(e) => setForm({ ...form, endIp: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Lease Time (Minutes)
            </label>
            <input
              type="number"
              className="input-field"
              value={form.leaseTimeMinutes}
              onChange={(e) => setForm({ ...form, leaseTimeMinutes: parseInt(e.target.value, 10) || 1440 })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="primary-button"
            style={{ width: '100%', marginTop: '4px' }}
          >
            {isSaving ? 'Saving...' : 'Save DHCP Settings'}
          </button>
        </form>

        {/* Static Leases Section */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Static IP Reservations</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bind fixed IP addresses to specific MAC addresses</p>
            </div>
            <button
              onClick={() => setShowAddLease(true)}
              className="glass-button"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Plus size={14} />
              <span>Add Static IP</span>
            </button>
          </div>

          {form.staticLeases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
              No static IP reservations configured.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {form.staticLeases.map((lease) => (
                <div
                  key={lease.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{lease.deviceName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {lease.ipAddress} • <span className="mono">{lease.macAddress}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLease(lease.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Lease Modal */}
        {showAddLease && (
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
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Add Static IP Reservation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Device Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newLeaseName}
                    onChange={(e) => setNewLeaseName(e.target.value)}
                    placeholder="e.g. NAS Server, Printer"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Static IP Address
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newLeaseIp}
                    onChange={(e) => setNewLeaseIp(e.target.value)}
                    placeholder="192.168.0.50"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    MAC Address
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newLeaseMac}
                    onChange={(e) => setNewLeaseMac(e.target.value)}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddLease(false)} className="glass-button" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button onClick={handleAddLease} className="primary-button" style={{ padding: '8px 16px' }}>
                  Add Lease
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CapabilityGuard>
  );
};
