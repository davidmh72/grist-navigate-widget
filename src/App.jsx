import React, { useState, useEffect, useCallback } from 'react';

const WIDGET_VERSION = "v5.5 - Query Param + Local Settings";

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
    if (!grist) {
      setStatus("Error: Grist API missing");
      return;
    }

    // Priority for configuration:
    // 1. URL query param `homePage`
    // 2. localStorage saved value (in-widget settings)
    // 3. Creator Panel option (HomePageName)
    // 4. default from grist.ready configuration
    const queryParams = new URLSearchParams(window.location.search);
    const pageFromQuery = queryParams.get('homePage');
    const LOCAL_KEY = 'gristNavigate.homePage';

    if (pageFromQuery) {
      setHomePageName(pageFromQuery);
    } else {
      const saved = window.localStorage.getItem(LOCAL_KEY);
      if (saved) {
        setHomePageName(saved);
      }
    }

    grist.ready({
      // We need full access to list the pages in the document.
      requiredAccess: 'full',
      configuration: [
        { name: 'HomePageName', title: 'Home Page Name', type: 'Text', value: 'Home' }
      ]
    });

    grist.onOptions((options) => {
      // Only override with Creator Panel option if no query param or local setting is present
      if (!pageFromQuery) {
        const saved = window.localStorage.getItem(LOCAL_KEY);
        if (!saved) {
          setHomePageName(options?.HomePageName || 'Home');
        }
      }
    });
  }, [grist]);

  // In-widget editor state and helpers
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const LOCAL_KEY = 'gristNavigate.homePage';

  const startEdit = () => {
    setEditValue(homePageName || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const saveEdit = () => {
    const v = editValue ? editValue.trim() : '';
    if (v) {
      window.localStorage.setItem(LOCAL_KEY, v);
      setHomePageName(v);
      setStatus(`Saved home page '${v}'`);
    } else {
      window.localStorage.removeItem(LOCAL_KEY);
      setHomePageName(null);
      setStatus('Cleared home page setting');
    }
    setIsEditing(false);
  };

  const triggerNavigateForName = async (name) => {
    if (!name) {
      setStatus('No home page configured');
      return;
    }
    if (!grist) {
      setStatus('Grist API not available');
      return;
    }
    setStatus(`Finding page '${name}'...`);
    try {
      const pages = await grist.getDocPages();
      const targetPage = pages.find(p => p.name === name);
      if (!targetPage) {
        setStatus(`Error: Page '${name}' not found.`);
        return;
      }
      const currentUrl = new URL(window.top.location.href);
      const docUrlPart = currentUrl.pathname.match(/^(\/o\/[^/]+\/doc\/[^/]+)/);
      if (!docUrlPart) {
        setStatus(`Error: Could not determine document URL`);
        return;
      }
      const newUrl = `${currentUrl.origin}${docUrlPart[0]}/p/${targetPage.id}`;
      handleNavigate(newUrl + currentUrl.search);
    } catch (err) {
      console.error('Error navigating to page:', err);
      setStatus(`Error: Could not access document pages. Please grant 'full' access in the Creator Panel.`);
    }
  };

  useEffect(() => {
    const findAndNavigate = async () => {
      if (isExpanded && homePageName && grist) {
        setStatus(`Finding page '${homePageName}'...`);
        try {
          const pages = await grist.getDocPages();
          const targetPage = pages.find(p => p.name === homePageName);

          if (targetPage) {
            const currentUrl = new URL(window.top.location.href);
            // Match the document's base URL path, which looks like /o/ORG/doc/DOCID
            const docUrlPart = currentUrl.pathname.match(/^(\/o\/[^/]+\/doc\/[^/]+)/);
            if (!docUrlPart) {
              setStatus(`Error: Could not determine document URL from '${currentUrl.pathname}'.`);
              return;
            }
            // Construct the new base URL for the target page using its ID.
            const newUrl = `${currentUrl.origin}${docUrlPart[0]}/p/${targetPage.id}`;

            // Only navigate if we are not already on the target page.
            // This check ignores query parameters (e.g., ?rowId=123).
            if (!window.top.location.href.startsWith(newUrl)) {
              setStatus(`Redirecting to '${homePageName}'...`);
              // Append original query parameters to the new URL.
              handleNavigate(newUrl + currentUrl.search);
            } else {
              setStatus(`Already on page '${homePageName}'.`);
            }
          } else {
            setStatus(`Error: Page '${homePageName}' not found.`);
          }
        } catch (err) {
          console.error("Error finding page:", err);
          setStatus(`Error: Could not access document pages. Please grant 'full' access in the Creator Panel.`);
        }
      } else if (isExpanded) {
        setStatus(homePageName ? "Grist API not ready." : "Please set 'Home Page Name' in Creator Panel.");
      } else {
        setStatus("Collapsed. Expand to navigate.");
      }
    };

    findAndNavigate();
  }, [isExpanded, homePageName, handleNavigate, grist]);

  if (isExpanded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
        <h3>{status}</h3>
      </div>
    );
  }

  return (
    <div
      onClick={() => { if (!isEditing) { if (homePageName) triggerNavigateForName(homePageName); else setStatus('No home page set'); } }}
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center', cursor: isEditing ? 'text' : 'pointer', background: '#f0f4f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1em', color: '#333' }}>{homePageName || 'Home'}</h3>
        {!isEditing && (
          <button onClick={(e) => { e.stopPropagation(); startEdit(); }} style={{ fontSize: '0.8em', padding: '4px 8px' }}>Edit</button>
        )}
      </div>
      {isEditing ? (
        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
          <input value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ padding: '6px' }} />
          <button onClick={saveEdit} style={{ padding: '6px' }}>Save</button>
          <button onClick={cancelEdit} style={{ padding: '6px' }}>Cancel</button>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Click to navigate</p>
      )}
    </div>
  );
}

export default App;