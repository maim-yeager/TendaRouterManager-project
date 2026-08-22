import React from 'react';
import { RouterStoreProvider, useRouter } from './stores/useRouterStore';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { WifiPage } from './pages/WifiPage';
import { NetworkPage } from './pages/NetworkPage';
import { GuestWifiPage } from './pages/GuestWifiPage';
import { DHCPPage } from './pages/DHCPPage';
import { DNSPage } from './pages/DNSPage';
import { QoSPage } from './pages/QoSPage';
import { ParentalControlPage } from './pages/ParentalControlPage';
import { PortForwardingPage } from './pages/PortForwardingPage';
import { MeshPage } from './pages/MeshPage';
import { SystemPage } from './pages/SystemPage';
import { LogsPage } from './pages/LogsPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { SettingsPage } from './pages/SettingsPage';
import { MorePage } from './pages/MorePage';

const AppContent: React.FC = () => {
  const { isAuthenticated, activeTab, activeSubPage } = useRouter();

  const renderActiveView = () => {
    if (!isAuthenticated) {
      return <LoginPage />;
    }

    if (activeSubPage) {
      switch (activeSubPage) {
        case 'guest-wifi':
          return <GuestWifiPage />;
        case 'dhcp':
          return <DHCPPage />;
        case 'dns':
          return <DNSPage />;
        case 'qos':
          return <QoSPage />;
        case 'parental-control':
          return <ParentalControlPage />;
        case 'port-forwarding':
          return <PortForwardingPage />;
        case 'mesh':
          return <MeshPage />;
        case 'system':
          return <SystemPage />;
        case 'logs':
          return <LogsPage />;
        case 'profiles':
          return <ProfilesPage />;
        case 'settings':
          return <SettingsPage />;
        default:
          return <DashboardPage />;
      }
    }

    switch (activeTab) {
      case 'home':
        return <DashboardPage />;
      case 'devices':
        return <DevicesPage />;
      case 'wifi':
        return <WifiPage />;
      case 'network':
        return <NetworkPage />;
      case 'more':
        return <MorePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-container">
      <Header />
      <OfflineBanner />
      <main style={{ flex: 1, paddingBottom: isAuthenticated ? '16px' : '0' }}>
        {renderActiveView()}
      </main>
      {isAuthenticated && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <RouterStoreProvider>
      <AppContent />
    </RouterStoreProvider>
  );
};

export default App;
