import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FitPage,
  type CatalogLoadStatus,
  type CatalogModelEntry,
  type CatalogSearchDocument,
} from '@boske-labs/grove-fit-ui';
import '@boske-labs/grove-fit-ui/styles.css';
import { detectShellHardware } from './detect-hardware.js';
import { RootErrorBoundary } from './error-boundary.js';
import { loadCatalogEntries } from './load-catalog.js';
import boskeCatalog from '@boske-labs/grove-fit-models/boske-catalog';

const boskeEntries = (boskeCatalog as { entries: CatalogModelEntry[] }).entries;

function App() {
  const [entries, setEntries] = useState<CatalogModelEntry[]>(boskeEntries);
  const [searchDocuments, setSearchDocuments] = useState<CatalogSearchDocument[] | undefined>(
    undefined,
  );
  const [catalogStatus, setCatalogStatus] = useState<CatalogLoadStatus>('loading-full');
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);

  const loadCatalog = useCallback(async (force = false) => {
    if (force) {
      setIsRefreshingCatalog(true);
    } else {
      setCatalogStatus('loading-full');
    }

    try {
      const loaded = await loadCatalogEntries(force);
      setEntries(loaded.entries);
      setSearchDocuments(loaded.searchDocuments);
      setCatalogStatus(loaded.entries.length > boskeEntries.length ? 'ready' : 'boske-only');
    } catch {
      setEntries(boskeEntries);
      setSearchDocuments(undefined);
      setCatalogStatus('boske-only');
    } finally {
      setIsRefreshingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog(false);
  }, [loadCatalog]);

  return (
    <FitPage
      catalogEntries={entries}
      searchDocuments={searchDocuments}
      catalogStatus={catalogStatus}
      detectHardware={detectShellHardware}
      onRefreshCatalog={() => void loadCatalog(true)}
      isRefreshingCatalog={isRefreshingCatalog}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
