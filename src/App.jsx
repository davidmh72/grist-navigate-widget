import React, { useState, useEffect, useRef } from 'react';

const WIDGET_VERSION = "v3.5 - Safe Auto-Navigate";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [config, setConfig] = useState(null);
  const [autoTimer, setAutoTimer] = useState(null);
  const grist = window.grist; 
  const mounted = useRef(false);
  const timerRef = useRef(null);

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
      setAutoTimer(1); // 1 second delay for safety
    } else {
      setStatus("Config: Add ?url=... to Widget URL");
    }
  }, []);

  useEffect(() => {
    if (autoTimer === null) return;
    
    if (autoTimer <= 0) {
      handleNavigate(config.targetUrl);
      return;
    }

    timerRef.current = setTimeout(() => {
      setAutoTimer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [autoTimer, config]);

  const cancelAuto = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoTimer(null);
    setStatus("Auto-jump cancelled");
  };

  if (config?.targetUrl) {
    return (
      <div 
        onClick={() => handleNavigate(config.targetUrl)}
        style={{
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#e6fffa', 
          color: '#00695c', 
          fontFamily: 'sans-serif',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {autoTimer !== null ? (
          <>
            <h3>Redirecting...</h3>
            <button 
              onClick={cancelAuto}
              style={{
                marginTop: '10px',
                padding: '5px 10px',
                background: '#c62828',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <h3>{config.label || "Open"}</h3>
        )}
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