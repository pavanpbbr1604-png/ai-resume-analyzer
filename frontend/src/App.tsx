import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { CookingTransitionOverlay } from './components/CookingTransitionOverlay';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';

export const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'cooking' | 'workspace'>('landing');

  return (
    <>
      <AuthModal />
      {currentView === 'landing' && (
        <LandingPage onLaunchApp={() => setCurrentView('cooking')} />
      )}
      {currentView === 'cooking' && (
        <CookingTransitionOverlay onComplete={() => setCurrentView('workspace')} />
      )}
      {currentView === 'workspace' && (
        <WorkspacePage onBackToHome={() => setCurrentView('landing')} />
      )}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

