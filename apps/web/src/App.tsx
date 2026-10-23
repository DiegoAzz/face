import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewsFeedPage } from './pages/NewsFeedPage';
import { EditorialRoomPage } from './pages/EditorialRoomPage';
import { CalendarPage } from './pages/CalendarPage';
import { FacebookPagesPage } from './pages/FacebookPagesPage';
import { GroupsAssistantPage } from './pages/GroupsAssistantPage';
import { SourcesPage } from './pages/SourcesPage';
import { AiTemplatesPage } from './pages/AiTemplatesPage';
import { HistoryAnalyticsPage } from './pages/HistoryAnalyticsPage';
import { SettingsAuditPage } from './pages/SettingsAuditPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-sm">
        Iniciando sesión segura en NewsFlow AI...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <DashboardPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/news"
            element={
              <ProtectedLayout>
                <NewsFeedPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/editorial"
            element={
              <ProtectedLayout>
                <EditorialRoomPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedLayout>
                <CalendarPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/pages"
            element={
              <ProtectedLayout>
                <FacebookPagesPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedLayout>
                <GroupsAssistantPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/sources"
            element={
              <ProtectedLayout>
                <SourcesPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedLayout>
                <AiTemplatesPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedLayout>
                <HistoryAnalyticsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedLayout>
                <SettingsAuditPage />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  </AuthProvider>
  );
};

export default App;
