import React, { useState, useEffect, useRef, useCallback } from 'react';

const WIDGET_VERSION = "v4.6 - Use RowID";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [config, setConfig] = useState(null);
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

    grist.ready({
      columns: [
        { name: 'RowID', title: 'RowID', type: 'Numeric' },
        { name: 'Ready', title: 'Ready', type: 'Bool' },
        { name: 'Link', title: 'Link', type: 'Text' }
      ],
      requiredAccess: 'read table'
    });

    let tableId;

    const fetchAndSetConfig = async () => {
      if (!tableId) {
        setStatus("Please link a table in the Creator Panel.");
        return;
      }
      try {
        const records = await grist.rpc.getTableRecords(tableId);
        if (!records) {
          setStatus("Error: Could not fetch records.");
          return;
        }
        const targetRecord = records.records.find(r => r.fields.RowID === 1);
        if (targetRecord) {
          setConfig({ targetUrl: targetRecord.fields.Link, ready: targetRecord.fields.Ready });
          setStatus("Ready (RowID: 1)");
        } else {
          setConfig(null);
          setStatus("Waiting for record with RowID 1...");
        }
      } catch (error) {
        console.error("Error fetching records:", error);
        setStatus("Error: Failed to fetch data.");
      }
    };

    grist.onOptions((options) => {
      if (options && options.tableId) {
        tableId = options.tableId;
        fetchAndSetConfig();
      } else {
        tableId = null;
        setConfig(null);
        setStatus("Please link a table in the Creator Panel.");
      }
    });
  }, []);

  // Only redirect if we have a URL AND the widget is expanded (large enough)
  useEffect(() => {
    if (config?.targetUrl && config?.ready && isExpanded) {
      handleNavigate(config.targetUrl);
    }
  }, [config, isExpanded, handleNavigate]);

  if (config?.targetUrl && config?.ready && isExpanded) {
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
      {!config && <p style={{marginTop: '10px', fontSize: '0.8em'}}>Please map <b>RowID</b>, <b>Ready</b>, and <b>Link</b> columns in the Creator Panel.</p>}
      {config && !config.ready && <p style={{marginTop: '10px', fontSize: '0.8em'}}>Ready: <b>{config.ready ? "True" : "False"}</b><br/>Link: {config.targetUrl}</p>}
    </div>
  );
}

export default App;