import React, { useState, useEffect, useCallback } from 'react';

const WIDGET_VERSION = "v5.7 - Query Param Only";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [isExpanded, setIsExpanded] = useState(false);
  const [homePageName, setHomePageName] = useState(null);
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
      homePageName,
      currentUrl: window.location.href,
    });
  }, [status, isExpanded, homePageName]);

  const handleNavigate = useCallback((url) => {
    if (!url) return;
    setStatus(`Navigating to ${url}`);
    try {
      window.top.history.pushState(null, '', url);
      window.top.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
      console.warn("Navigation fallback:", e);
      window.top.location.href = url;
    }
  }, []);

  useEffect(() => {
    // Only use the `homePage` query parameter for configuration.
    const queryParams = new URLSearchParams(window.location.search);
    const pageFromQuery = queryParams.get('homePage');
    if (pageFromQuery) {
      setHomePageName(pageFromQuery);
    } else {
      setHomePageName(null);
    }
    // No grist.ready or localStorage usage — configuration comes only from the URL.
  }, []);

  // Helper to navigate to a page by name using URL rewriting to /page/<name>
  // This version is tolerant of different self-hosted URL structures.
  const navigateToPageName = (name) => {
    if (!name) {
      setStatus('No home page configured (use ?homePage=...)');
      return;
    }
    const currentUrl = new URL(window.top.location.href);
    // Remove any trailing /p/... or /page/... segments to get the document base path.
    const basePath = currentUrl.pathname.replace(/(\/p\/[^/]+(\/.*)?|\/page\/[^/]+(\/.*)?)$/, '');
    if (!basePath || !basePath.startsWith('/o')) {
      setStatus(`Error: Could not determine document URL from '${currentUrl.pathname}'.`);
      return;
    }
    const newUrl = `${currentUrl.origin}${basePath}/page/${encodeURIComponent(name)}`;
    if (!window.top.location.href.startsWith(newUrl)) {
      setStatus(`Redirecting to '${name}'...`);
      handleNavigate(newUrl + currentUrl.search);
    } else {
      setStatus(`Already on page '${name}'.`);
    }
  };

  useEffect(() => {
    const findAndNavigate = () => {
      if (isExpanded && homePageName) {
        // Use query-param-based navigation only
        setStatus(`Preparing to navigate to '${homePageName}'...`);
        navigateToPageName(homePageName);
      } else if (isExpanded) {
        setStatus("Please set 'homePage' query parameter in the widget URL.");
      } else {
        setStatus("Collapsed. Expand to navigate.");
      }
    };

    findAndNavigate();
  }, [isExpanded, homePageName, handleNavigate]);

  if (isExpanded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
        <h3>{status}</h3>
      </div>
    );
  }

  return (
    <div
      onClick={() => { if (homePageName) navigateToPageName(homePageName); else setStatus('No home page set (use ?homePage=...)'); }}
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center', cursor: 'pointer', background: '#f0f4f8' }}>
      <h3 style={{ margin: 0, fontSize: '1em', color: '#333' }}>{homePageName || 'Home'}</h3>
      <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Click to navigate (or add ?homePage=PageName to the widget URL)</p>
    </div>
  );
}

export default App;