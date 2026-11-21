import { useEffect, useState } from 'react';
import { useAppState } from './lib/store';
import { navigate, readTab, type Tab } from './lib/nav';
import Today from './pages/Today';
import WorkoutPage from './pages/Workout';
import History from './pages/History';
import Progress from './pages/Progress';
import Body from './pages/Body';
import SettingsPage from './pages/Settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '🏠' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'history', label: 'History', icon: '📅' },
  { id: 'progress', label: 'Strength', icon: '📈' },
  { id: 'body', label: 'Body', icon: '⚖️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>(readTab);
  const state = useAppState();

  useEffect(() => {
    const onHash = () => {
      setTab(readTab());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Lift Log</h1>
        <button
          className={`icon-btn ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </header>
      <main className="content">
        {tab === 'today' && <Today />}
        {tab === 'workout' && <WorkoutPage />}
        {tab === 'history' && <History />}
        {tab === 'progress' && <Progress />}
        {tab === 'body' && <Body />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => navigate(t.id)}>
            <span className="tab-icon" aria-hidden>
              {t.icon}
              {t.id === 'workout' && state.activeWorkout && <span className="dot" />}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
