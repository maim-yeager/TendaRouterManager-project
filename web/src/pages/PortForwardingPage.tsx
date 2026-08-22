import React, { useState } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { Network, Plus, Trash2, Check } from 'lucide-react';
import { PortForwardingRule } from '../types/router';

export const PortForwardingPage: React.FC = () => {
  const { portForwardingRules, savePortForwardingRule, deletePortForwardingRule, capabilities, devices } = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [internalIp, setInternalIp] = useState('192.168.0.');
  const [internalPort, setInternalPort] = useState('');
  const [externalPort, setExternalPort] = useState('');
  const [protocol, setProtocol] = useState<'TCP' | 'UDP' | 'BOTH'>('BOTH');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddRule = async () => {
    if (!internalIp || !internalPort || !externalPort) return;
    setIsSaving(true);
    const rule: PortForwardingRule = {
      id: 'pf_' + Date.now(),
      name: serviceName || 'Custom Service',
      lanIp: internalIp,
      internalPort: parseInt(internalPort, 10),
      externalPort: parseInt(externalPort, 10),
      protocol,
      enabled: true,
    };
    await savePortForwardingRule(rule);
    setIsSaving(false);
    setShowAddModal(false);
    setServiceName('');
    setInternalPort('');
    setExternalPort('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this port forwarding rule?')) return;
    await deletePortForwardingRule(id);
  };

  return (
    <CapabilityGuard isSupported={capabilities?.portForwarding} featureName="Port Forwarding">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Port Forwarding</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Direct external incoming traffic to internal services and servers
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="glass-button"
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            <Plus size={14} />
            <span>Add Rule</span>
          </button>
        </div>

        {portForwardingRules.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No port forwarding rules defined.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {portForwardingRules.map((rule) => (
              <div key={rule.id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{rule.name}</h3>
                      <span className="badge badge-info">{rule.protocol}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      External Port: <span className="mono" style={{ fontWeight: 600 }}>{rule.externalPort}</span> ➔ Internal: <span className="mono" style={{ fontWeight: 600 }}>{rule.lanIp}:{rule.internalPort}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
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
            <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Add Port Forwarding Rule</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Service Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g. Web Server, Minecraft"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Internal IP
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={internalIp}
                    onChange={(e) => setInternalIp(e.target.value)}
                    placeholder="192.168.0.100"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      External Port
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      value={externalPort}
                      onChange={(e) => setExternalPort(e.target.value)}
                      placeholder="8080"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Internal Port
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      value={internalPort}
                      onChange={(e) => setInternalPort(e.target.value)}
                      placeholder="80"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Protocol
                  </label>
                  <select
                    className="input-field"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                  >
                    <option value="BOTH">TCP & UDP (Both)</option>
                    <option value="TCP">TCP Only</option>
                    <option value="UDP">UDP Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddModal(false)} className="glass-button" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button onClick={handleAddRule} disabled={isSaving} className="primary-button" style={{ padding: '8px 16px' }}>
                  {isSaving ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CapabilityGuard>
  );
};
