import React, { useState, useEffect, useRef, useCallback } from 'react';

const WIDGET_VERSION = "v3.9 - Size Detect Redirect";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [config, setConfig] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    const label = params.get('label');
    return url ? { targetUrl: url, label } : null;
  });
  const [isExpanded, setIsExpanded] = useState(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return width > 100 && height > 100;
  });
  const grist = window.grist; 
  const mounted = useRef(false);

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Grist Layout Tray widgets are usually small (icon size).
      // We assume "Expanded" means significantly larger than a tray icon.
      const expanded = width > 100 && height > 100;
      setIsExpanded(expanded);
    };

    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    console.log(`[Diagnostic ${WIDGET_VERSION}]`, {
      status,
      config,
      size: `${window.innerWidth}x${window.innerHeight}`,
      isExpanded,
      currentUrl: window.location.href,
      topOrigin: (() => { try { return window.top.location.origin; } catch { return "Blocked"; } })(),
    });
  }, [status, config, isExpanded]);

  const handleNavigate = useCallback((url) => {
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
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
    if (!grist) { setStatus("Error: Grist API missing"); return; }

    grist.ready({ requiredAccess: 'none' });

    if (config) {
      setStatus("Ready");
    } else {
      setStatus("Config: Add ?url=... to Widget URL");
    }
  }, [config]);

  // Only redirect if we have a URL AND the widget is expanded (large enough)
  useEffect(() => {
    if (config?.targetUrl && isExpanded) {
      handleNavigate(config.targetUrl);
    }
  }, [config, isExpanded, handleNavigate]);

  if (config?.targetUrl && isExpanded) {
    return (
      <div style={{
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'sans-serif',
        color: '#666'
      }}>
        <h3>Redirecting...</h3>
      </div>
    );
  }

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffebee', color: '#c62828', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center'}}>
      <h3>{isExpanded ? status : "Collapsed"}</h3>
      {!isExpanded && <p style={{fontSize: '0.8em', color: '#666'}}>Click to Expand & Navigate</p>}
      {!config && <p style={{marginTop: '10px', fontSize: '0.8em'}}>Set <b>Custom URL</b> in sidebar to:<br/><code>.../index.html?url=https://...</code></p>}
    </div>
  );
}

export default App;