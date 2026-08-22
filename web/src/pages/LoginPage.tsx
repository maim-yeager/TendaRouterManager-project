import React, { useState, useEffect } from 'react';
import { useRouter } from '../stores/useRouterStore';
import { NativeBridge } from '../security/nativeBridge';
import { RouterService } from '../services/routerService';
import {
  Wifi,
  Lock,
  Server,
  Key,
  Shield,
  Eye,
  EyeOff,
  Radio,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { gatewayIp, setGatewayIp, login, isConnecting } = useRouter();

  const [address, setAddress] = useState(gatewayIp);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [probeResult, setProbeResult] = useState<{ isTenda?: boolean; model?: string; firmware?: string } | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');

  useEffect(() => {
    // Auto-detect gateway and load stored credentials from Android Keystore
    NativeBridge.detectGateway().then(async (net) => {
      if (net.gatewayIp) {
        setAddress(net.gatewayIp);
        setGatewayIp(net.gatewayIp);
      }
      if (net.ssid) {
        setWifiSsid(net.ssid);
      }

      // Check Keystore for saved password
      const savedPass = await NativeBridge.secureRetrieve(`cred_${net.gatewayIp || '192.168.0.1'}`);
      if (savedPass) {
        setPassword(savedPass);
      }
      const savedUser = await NativeBridge.secureRetrieve(`last_user_${net.gatewayIp || '192.168.0.1'}`);
      if (savedUser) {
        setUsername(savedUser);
      }
    });
  }, []);

  const handleProbe = async () => {
    setIsProbing(true);
    setErrorMessage('');
    try {
      const service = RouterService.getInstance();
      const result = await service.probeAndSelectAdapter(address);
      setProbeResult(result);
      if (!result.isTenda) {
        setErrorMessage(`Connected to ${address}, but no Tenda signature was verified.`);
      }
    } catch (e: any) {
      setErrorMessage('Could not connect to router at ' + address);
    } finally {
      setIsProbing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Please enter the router administration password.');
      return;
    }
    setErrorMessage('');
    const res = await login(password, address, username, saveCredentials);
    if (!res.success) {
      setErrorMessage(res.message || 'Login failed. Please check router password.');
    }
  };

  return (
    <div
      style={{
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
      }}
    >
      {/* Brand Hero */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-container)',
            border: '1px solid rgba(0, 106, 106, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-teal)',
            marginBottom: '16px',
          }}
        >
          <Wifi size={32} strokeWidth={2.2} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Tenda <span style={{ color: 'var(--accent-cyan)' }}>Router Manager</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Real on-device router management client by NH MAIM
        </p>

        {wifiSsid && (
          <div
            className="badge badge-info"
            style={{ marginTop: '10px', fontSize: '11px', padding: '4px 12px' }}
          >
            <Radio size={12} />
            <span>Connected Wi-Fi: {wifiSsid}</span>
          </div>
        )}
      </div>

      {/* Login Card */}
      <div
        className="surface-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Router Authentication</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)' }}>
            <Shield size={13} />
            <span>Keystore Protected</span>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {probeResult && probeResult.isTenda && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle size={16} />
            <span>Tenda Router Detected: {probeResult.model || 'Tenda Device'}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Router Address (Gateway IP)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Server
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setGatewayIp(e.target.value);
                  }}
                  placeholder="192.168.0.1"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleProbe}
                disabled={isProbing}
                className="glass-button"
                style={{ padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
              >
                {isProbing ? 'Detecting...' : 'Detect'}
              </button>
            </div>
            {/* Quick shortcuts */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {['192.168.0.1', '192.168.1.1', 'tendawifi.com'].map((ip) => (
                <button
                  key={ip}
                  type="button"
                  onClick={() => {
                    setAddress(ip);
                    setGatewayIp(ip);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '11px',
                    color: 'var(--accent-cyan)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {ip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Admin Password
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter router password"
                required
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveCredentials}
                onChange={(e) => setSaveCredentials(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
              />
              <span>Save password securely</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="primary-button"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isConnecting ? (
              <span>Authenticating with Router...</span>
            ) : (
              <>
                <Key size={16} />
                <span>Connect & Login</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Tenda Router Client • Android Native Engine • Developer: NH MAIM
      </div>
    </div>
  );
};
