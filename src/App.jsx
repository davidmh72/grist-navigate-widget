import React, { useState, useEffect, useRef } from 'react';

const WIDGET_VERSION = "v1.0 - Instant Jump";
const MAGIC_STOP_WORD = "EDIT"; 

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [editMode, setEditMode] = useState(false);
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

    grist.ready({
      columns: [
        { name: 'Link', title: 'Target Link', type: 'Text'},
        { name: 'Label', title: 'Label', type: 'Text', optional: true}
      ],
      requiredAccess: 'full'
    });

    grist.onRecords((records) => {
      if (!records || records.length === 0) {
        setStatus("Waiting for record...");
        return;
      }
      const rec = records[0];
      const targetUrl = rec.Link;
      const label = rec.Label || "Target";

      if (String(label).toUpperCase() === MAGIC_STOP_WORD) {
        setEditMode(true);
        setStatus("Edit Mode Active");
        return;
      }

      if (targetUrl) {
        setStatus(`🚀 Jumping to ${label}...`);
        handleNavigate(targetUrl);
      } else {
        setStatus("Error: 'Link' column is empty.");
      }
    });
  }, []);

  if (editMode) {
    return (
      <div style={{height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff3cd', color: '#856404', fontFamily: 'sans-serif', textAlign: 'center'}}>
        <h3>⚠️ Edit Mode</h3>
        <p>Label is set to <strong>"{MAGIC_STOP_WORD}"</strong>.</p>
        <small>{WIDGET_VERSION}</small>
      </div>
    );
  }

  return (
    <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e6fffa', color: '#00695c', fontFamily: 'sans-serif'}}>
      <h3>{status}</h3>
    </div>
  );
}

export default App;