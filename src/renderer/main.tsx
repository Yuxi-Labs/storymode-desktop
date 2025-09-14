import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <h1>Storymode Desktop Scaffold</h1>
      <p>Renderer running. IPC version info test:</p>
      <button onClick={async () => {
        const info = await window.storymode.versionInfo();
        alert(JSON.stringify(info, null, 2));
      }}>Show Versions</button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

declare global { interface Window { storymode: any } }
