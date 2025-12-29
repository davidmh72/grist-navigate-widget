import React, { useState, useEffect, useCallback } from 'react';

const WIDGET_VERSION = "v5.1 - Dynamic Page Lookup";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [isExpanded, setIsExpanded] = useState(false);
  const grist = window.grist;

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsExpanded(width > 100 && height > 100);
    };
    window.addEventListener('resize', checkSize);
    checkSize();
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    console.log(`[Diagnostic ${WIDGET_VERSION}]`, {
      status,
      isExpanded,
      currentUrl: window.location.href,
    });
  }, [status, isExpanded]);

  const handleNavigate = useCallback((url) => {
    if (!url) return;
    setStatus(`Navigating to ${url}`);
    try {
      window.top.history.pushState(null, '', url);
      window.top.dispatchEvent(new PopStateEvent('popstate'));
      return;
    } catch (e) {
      console.warn("Navigation fallback:", e);
      window.top.location.href = url;
    }
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      setStatus("Collapsed. Expand to navigate.");
      return;
    }

    if (!grist) {
      setStatus("Error: Grist API missing");
      return;
    }

    const findAndNavigate = async () => {
      try {
        setStatus("Finding 'Home' page...");
        const pages = await grist.rpc.getDocTable('_grist_Pages');
        const homePage = pages.records.find(p => {
          const name = p.fields.pageName;
          // Normalize the name by removing emojis and converting to lower case
          const normalized = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim().toLowerCase();
          return normalized === 'home';
        });

        if (homePage) {
          const pageId = homePage.id;
          const currentUrl = window.top.location.href;
          const newUrl = currentUrl.replace(/\/p\/\d+/, `/p/${pageId}`);
          setStatus("Redirecting to Home...");
          handleNavigate(newUrl);
        } else {
          setStatus("Error: 'Home' page not found.");
        }
      } catch (error) {
        console.error("Error finding page:", error);
        setStatus("Error: Could not access document pages. Please grant 'full' access in the Creator Panel.");
      }
    };

    grist.ready({ requiredAccess: 'full' });
    findAndNavigate();

  }, [isExpanded, grist, handleNavigate]);

  if (isExpanded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
        <h3>{status}</h3>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center', cursor: 'pointer', background: '#f0f4f8' }}>
      <h3 style={{ margin: 0, fontSize: '1em', color: '#333' }}>Home</h3>
      <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Click to navigate</p>
    </div>
  );
}

export default App;