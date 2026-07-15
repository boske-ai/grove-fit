import { useMemo, useState } from 'react';
import { buildFunnelComparison } from '@boske-labs/grove-fit-core';
import { useCatalogSearch } from './use-catalog-search.js';
import { FitBadge } from './fit-badge.js';
import { ModelResultPanel } from './model-result-panel.js';
import type { HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import type { CatalogModelEntry } from './types.js';

interface ModelSearchProps {
  entries: CatalogModelEntry[];
  snapshot: HardwareFitSnapshot;
}

export function ModelSearch({ entries, snapshot }: ModelSearchProps) {
  const { search } = useCatalogSearch(entries);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogModelEntry | null>(null);
  const results = useMemo(() => search(query), [query, search]);

  function pick(entry: CatalogModelEntry) {
    setSelected(entry);
    setQuery(entry.label);
  }

  function clearSelection() {
    setSelected(null);
    setQuery('');
  }

  return (
    <section className="gf-panel gf-search-section">
      <h2>Search models</h2>
      <p className="gf-panel-hint">Check if any catalog model fits your machine</p>

      <input
        className="gf-input gf-input-search"
        type="search"
        placeholder="Llama 3.1 8B, Qwen, Ministral…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected && e.target.value !== selected.label) {
            setSelected(null);
          }
        }}
      />

      <div className="gf-search-body">
        {!selected && query.trim() ? (
          <>
            <div className="gf-search-meta">
              <span>{results.length} match{results.length === 1 ? '' : 'es'}</span>
              <button type="button" className="gf-link-btn" onClick={() => setQuery('')}>
                Clear
              </button>
            </div>
            {results.length === 0 ? (
              <div className="gf-empty">No models found.</div>
            ) : (
              <ul className="gf-search-results">
                {results.slice(0, 8).map((entry) => {
                  const fit = buildFunnelComparison(
                    {
                      id: entry.id,
                      label: entry.label,
                      paramsB: entry.paramsB ?? null,
                      minRAMGB: entry.minRAMGB,
                      groveFitCertified: entry.groveFitCertified,
                      isCloud: entry.isCloud,
                    },
                    snapshot,
                  ).fitLevel;
                  return (
                    <li key={entry.id}>
                      <button type="button" onClick={() => pick(entry)}>
                        <span className="gf-search-item-label">{entry.label}</span>
                        <span className="gf-search-item-meta">
                          {entry.paramsB ? `${entry.paramsB}B · ` : ''}
                          <FitBadge level={fit} size="sm" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}

        {selected ? (
          <ModelResultPanel
            model={selected}
            snapshot={snapshot}
            onClose={clearSelection}
          />
        ) : null}
      </div>
    </section>
  );
}
