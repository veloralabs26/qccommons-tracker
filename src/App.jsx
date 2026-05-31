import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, Circle, Clock, Coffee, Flame, Play, Pause, RotateCcw, ShieldAlert, Video } from 'lucide-react';
import './style.css';

const STORAGE_KEY = 'qccommons-tracker-v1';
const FOCUS_SECONDS = 90 * 60;
const BREAK_SECONDS = 15 * 60;

const emptyProjects = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  name: '',
  size: 'S',
  status: 'todo',
  seconds: 0,
  proof: '',
  blocker: '',
}));

function format(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function App() {
  const saved = loadState();
  const [projects, setProjects] = useState(saved?.projects || emptyProjects);
  const [activeId, setActiveId] = useState(saved?.activeId || 1);
  const [mode, setMode] = useState(saved?.mode || 'focus');
  const [remaining, setRemaining] = useState(saved?.remaining || FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [rawVideo, setRawVideo] = useState(saved?.rawVideo || false);
  const [blockCount, setBlockCount] = useState(saved?.blockCount || 1);

  const active = projects.find(p => p.id === activeId) || projects[0];
  const done = projects.filter(p => p.status === 'done').length;
  const blocked = projects.filter(p => p.status === 'blocked').length;
  const totalSeconds = projects.reduce((sum, p) => sum + (p.seconds || 0), 0);
  const nextAction = active?.name ? `Work on ${active.name}` : `Name Project ${activeId} and start`;
  const progress = mode === 'focus'
    ? 100 - (remaining / FOCUS_SECONDS) * 100
    : 100 - (remaining / BREAK_SECONDS) * 100;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, activeId, mode, remaining, rawVideo, blockCount }));
  }, [projects, activeId, mode, remaining, rawVideo, blockCount]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
      if (mode === 'focus') {
        setProjects(prev => prev.map(p => p.id === activeId ? { ...p, seconds: (p.seconds || 0) + 1, status: p.status === 'todo' ? 'in-progress' : p.status } : p));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, mode, activeId]);

  function updateProject(id, patch) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function startFocus() {
    setMode('focus');
    setRemaining(FOCUS_SECONDS);
    setRunning(true);
    updateProject(activeId, { status: active.status === 'done' ? 'done' : 'in-progress' });
  }

  function startBreak() {
    setMode('break');
    setRemaining(BREAK_SECONDS);
    setRunning(true);
  }

  function resetTimer() {
    setRunning(false);
    setRemaining(mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  }

  function completeBlock() {
    setRunning(false);
    setMode('break');
    setRemaining(BREAK_SECONDS);
    setBlockCount(n => n + 1);
  }

  const sorted = useMemo(() => [...projects].sort((a,b) => {
    const order = { 'in-progress': 0, todo: 1, blocked: 2, done: 3 };
    return order[a.status] - order[b.status] || a.id - b.id;
  }), [projects]);

  return <main>
    <section className="hero">
      <div>
        <p className="eyebrow">QCCommons Catch-Up</p>
        <h1>One project at a time. Visible proof only.</h1>
        <p className="muted">17 projects • 90/15 focus rhythm • phone away during focus.</p>
      </div>
      <label className={rawVideo ? 'video done' : 'video'}>
        <input type="checkbox" checked={rawVideo} onChange={e => setRawVideo(e.target.checked)} />
        <Video size={20}/> Recorded 1 raw video
      </label>
    </section>

    <section className="stats">
      <div><b>{done}/17</b><span>done</span></div>
      <div><b>{format(totalSeconds)}</b><span>focused</span></div>
      <div><b>{blocked}</b><span>blocked</span></div>
      <div><b>Block {blockCount}</b><span>{mode}</span></div>
    </section>

    <section className="timerCard">
      <div className="timerTop">
        <div>
          <p className="eyebrow">Current action</p>
          <h2>{nextAction}</h2>
        </div>
        <select value={activeId} onChange={e => setActiveId(Number(e.target.value))}>
          {projects.map(p => <option key={p.id} value={p.id}>#{p.id} {p.name || 'Unnamed'} ({p.status})</option>)}
        </select>
      </div>

      {mode === 'focus' && <div className="warning"><ShieldAlert/> PHONE AWAY • NO TIKTOK • NO GAMES • NO “QUICK CHECK”</div>}
      {mode === 'break' && <div className="break"><Coffee/> Break means recover. Do not enter the scrolling trap.</div>}

      <div className="clock"><Clock/> {format(remaining)}</div>
      <div className="bar"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
      <div className="buttons">
        <button onClick={startFocus}><Flame/> Start 90m focus</button>
        <button onClick={startBreak}><Coffee/> Start 15m break</button>
        <button onClick={() => setRunning(!running)}>{running ? <Pause/> : <Play/>}{running ? 'Pause' : 'Resume'}</button>
        <button onClick={resetTimer}><RotateCcw/> Reset</button>
        <button className="secondary" onClick={completeBlock}>Finish block → break</button>
      </div>
    </section>

    <section className="grid">
      {sorted.map(project => <article key={project.id} className={`project ${project.status}`}>
        <div className="projectHead">
          <button className="icon" onClick={() => updateProject(project.id, { status: project.status === 'done' ? 'todo' : 'done' })}>
            {project.status === 'done' ? <CheckCircle2/> : <Circle/>}
          </button>
          <input value={project.name} placeholder={`Project ${project.id}`} onChange={e => updateProject(project.id, { name: e.target.value })} />
        </div>
        <div className="row">
          <select value={project.size} onChange={e => updateProject(project.id, { size: e.target.value })}>
            <option value="S">S ~20m</option><option value="M">M 45–60m</option><option value="L">L ~2h</option>
          </select>
          <select value={project.status} onChange={e => updateProject(project.id, { status: e.target.value })}>
            <option value="todo">todo</option><option value="in-progress">in progress</option><option value="done">done</option><option value="blocked">blocked</option>
          </select>
          <button onClick={() => setActiveId(project.id)}>Focus this</button>
        </div>
        <p className="spent">Time: {format(project.seconds || 0)}</p>
        <textarea value={project.proof} placeholder="Proof / result: commit, ticket update, note..." onChange={e => updateProject(project.id, { proof: e.target.value })} />
        <textarea value={project.blocker} placeholder="Blocker, if any..." onChange={e => updateProject(project.id, { blocker: e.target.value, status: e.target.value ? 'blocked' : project.status })} />
      </article>)}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
