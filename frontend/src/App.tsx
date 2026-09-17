import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { CookingTransitionOverlay } from './components/CookingTransitionOverlay';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'cooking' | 'workspace'>('landing');

  if (currentView === 'landing') {
    return <LandingPage onLaunchApp={() => setCurrentView('cooking')} />;
  }

  if (currentView === 'cooking') {
    return <CookingTransitionOverlay onComplete={() => setCurrentView('workspace')} />;
  }

  return <WorkspacePage onBackToHome={() => setCurrentView('landing')} />;
};

export default App;
