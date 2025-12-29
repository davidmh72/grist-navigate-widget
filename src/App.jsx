import React, { useState, useEffect, useRef } from 'react';

const WIDGET_VERSION = "v4.8 - Diagnostic";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [options, setOptions] = useState(null);
  const grist = window.grist;
  const mounted = useRef(false);

  useEffect(() => {
    console.log(`[Diagnostic ${WIDGET_VERSION}]`, { status, options });
  }, [status, options]);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    if (!grist) {
      setStatus("Error: Grist API missing");
      return;
    }

    grist.ready(); // Simplest ready call

    setStatus("Waiting for options...");

    grist.onOptions((opts) => {
      // If this gets called, we have a connection.
      setStatus("Options Received!");
      setOptions(opts);
      console.log("Grist options received:", opts);
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#eef', border: '2px solid #ccd', height: '100vh' }}>
      <h3>Diagnostic Widget</h3>
      <p>Status: <b>{status}</b></p>
      <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
        {options ? JSON.stringify(options, null, 2) : "No options yet."}
      </pre>
    </div>
  );
}

export default App;