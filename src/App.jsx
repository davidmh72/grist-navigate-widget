import React, { useState, useEffect, useRef } from 'react';

const WIDGET_VERSION = "v3.1 - Click Navigation";
const MAGIC_STOP_WORD = "EDIT"; 

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [editMode, setEditMode] = useState(false);
  const [target, setTarget] = useState(null);
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

  // Helper to build URL from Page ID
  const buildUrlFromId = (pageId) => {
    try {
      const currentPath = window.top.location.pathname;
      const basePath = currentPath.split('/p/')[0]; 
      return `${window.top.location.origin}${basePath}/p/${pageId}`;
    } catch (e) {
      console.error("Cannot access top frame:", e);
      return null;
    }
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
    // 2. CHECK THE IMPORTED OBJECT
    if (!grist) { setStatus("Error: Grist API missing"); return; }

    grist.ready({
      columns: [
        { name: 'Link', title: 'Full Link (Optional)', type: 'Text', optional: true},
        { name: 'PageID', title: 'Page ID (From _grist_Pages)', type: 'Numeric', optional: true},
        { name: 'Label', title: 'Label', type: 'Text', optional: true}
      ],
      requiredAccess: 'full'
    });

    grist.onRecords((records) => {
      if (!records || records.length === 0) {
        setStatus("Waiting for record...");
        setTarget(null);
        return;
      }
      const rec = records[0];
      
      let targetUrl = rec.Link;
      if (!targetUrl && rec.PageID) {
        targetUrl = buildUrlFromId(rec.PageID);
      }

      const label = rec.Label || "Target";

      if (String(label).toUpperCase() === MAGIC_STOP_WORD) {
        setEditMode(true);
        setStatus("Edit Mode Active");
        return;
      }

      if (targetUrl) {
        setTarget({ url: targetUrl, label });
        setStatus("Ready");
      } else {
        setTarget(null);
        setStatus("Error: Map 'Link' OR 'Page ID'");
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

  if (target) {
    return (
      <div 
        onClick={() => handleNavigate(target.url)}
        style={{
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#e6fffa', 
          color: '#00695c', 
          fontFamily: 'sans-serif',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <h3>{target.label}</h3>
      </div>
    );
  }

  return (
    <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffebee', color: '#c62828', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center'}}>
      <h3>{status}</h3>
    </div>
  );
}

export default App;