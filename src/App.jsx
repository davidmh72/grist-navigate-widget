import React, { useState, useEffect, useCallback } from 'react';

const WIDGET_VERSION = "v5.3 - Robust Page Navigation";

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
    grist.ready({
      // We need full access to list the pages in the document.
      requiredAccess: 'full',
      configuration: [
        { name: 'HomePageName', title: 'Home Page Name', type: 'Text', value: 'Home' }
      ]
    });
    grist.onOptions((options) => {
      if (options && options.HomePageName) {
        setHomePageName(options.HomePageName);
      } else {
        setHomePageName(null);
      }
    });
  }, [grist]);

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center', cursor: 'pointer', background: '#f0f4f8' }}>
      <h3 style={{ margin: 0, fontSize: '1em', color: '#333' }}>{homePageName || 'Home'}</h3>
      <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Click to navigate</p>
    </div>
  );
}

export default App;