import { useState } from 'react';
import { BookOpen, BrainCircuit, LayoutDashboard, Library, Mic } from 'lucide-react';
import type { View } from './types';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Tutor from './pages/Tutor';
import Quiz from './pages/Quiz';
import Vocabulary from './pages/Vocabulary';
import { useProgress } from './hooks/useProgress';
import { Notice } from './components/ui';

const NAV: { id: View; label: string; icon: typeof Mic }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'tutor', label: 'Voice Tutor', icon: Mic },
  { id: 'quiz', label: 'Quiz', icon: BrainCircuit },
  { id: 'vocabulary', label: 'My Vocabulary', icon: Library },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const { storageError } = useProgress();

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-60">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-cream-200 bg-cream-50 p-5">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${view === id ? 'bg-brand-50 text-brand-700' : 'text-navy-500 hover:bg-white'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile header + bottom nav */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-cream-200 bg-cream-50"><Logo /></header>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-5 border-t border-cream-200 bg-white" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${view === id ? 'text-brand-600' : 'text-navy-400'}`}>
            <Icon size={20} /> {label.replace('My ', '')}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
        {storageError && <div className="mb-4"><Notice tone="error">{storageError}</Notice></div>}
        {view === 'dashboard' && <Dashboard go={setView} />}
        {view === 'learn' && <Learn />}
        {view === 'tutor' && <Tutor />}
        {view === 'quiz' && <Quiz go={setView} />}
        {view === 'vocabulary' && <Vocabulary go={setView} />}
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center shadow-glow">
        <Mic size={18} className="text-white" />
      </div>
      <div>
        <div className="font-display font-extrabold text-lg leading-none">Voca</div>
        <div className="text-[11px] text-navy-400">Speak it. Learn it.</div>
      </div>
    </div>
  );
}
