import React from 'react';
import { useRouter } from '../stores/useRouterStore';
import { CapabilityGuard } from '../components/CapabilityGuard';
import { Layers, Signal, Laptop, CheckCircle, Radio } from 'lucide-react';

export const MeshPage: React.FC = () => {
  const { meshNodes, capabilities } = useRouter();

  return (
    <CapabilityGuard isSupported={capabilities?.mesh} featureName="Nova Mesh System">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Tenda Nova Mesh Network</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Whole-home mesh nodes and backhaul link topology
          </p>
        </div>

        {(!meshNodes || meshNodes.length === 0) ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No secondary Mesh nodes detected. If using a standalone router, mesh is inactive.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {meshNodes.map((node) => (
              <div key={node.id} className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'rgba(131, 56, 236, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-purple)',
                      }}
                    >
                      <Layers size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{node.name}</h3>
                        <span className="badge badge-info">{node.role}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {node.ipAddress} • {node.model}
                      </div>
                    </div>
                  </div>

                  <span className={node.online ? 'badge badge-success' : 'badge badge-danger'}>
                    {node.online ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Radio size={14} color="var(--accent-cyan)" />
                    <span>Backhaul: {node.connectionType}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Laptop size={14} color="var(--accent-blue)" />
                    <span>{node.connectedDevicesCount} Connected Clients</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CapabilityGuard>
  );
};
