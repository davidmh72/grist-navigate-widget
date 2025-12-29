import React, { useState, useEffect, useRef } from 'react';

const WIDGET_VERSION = "v3.3 - URL Params";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [config, setConfig] = useState(null);
  const grist = window.grist; 
  const mounted = useRef(false);

  const handleNavigate = (url) => {
    if (!url) return;
    try {
      const isSameOrigin = window.top.location.origin === window.location.origin;
      if (isSameOrigin) {
        window.top.history.pushState(null, '', url);
        window.top.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
    } catch (e) { console.warn("Jump fallback:", e); }
    window.top.location.href = url;
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
    if (!grist) { setStatus("Error: Grist API missing"); return; }

    grist.ready({ requiredAccess: 'none' });

    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    const label = params.get('label');

    if (url) {
      setConfig({ targetUrl: url, label });
      setStatus("Ready");
    } else {
      setStatus("Config: Add ?url=... to Widget URL");
    }
  }, []);

  if (config?.targetUrl) {
    return (
      <div 
        onClick={() => handleNavigate(config.targetUrl)}
        style={{
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#e6fffa', 
          color: '#00695c', 
          fontFamily: 'sans-serif',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <h3>{config.label || "Open"}</h3>
      </div>
    );
  }

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffebee', color: '#c62828', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center'}}>
      <h3>{status}</h3>
      {!config && <p style={{marginTop: '10px', fontSize: '0.8em'}}>Set <b>Custom URL</b> in sidebar to:<br/><code>.../index.html?url=https://...</code></p>}
    </div>
  );
}

export default App;