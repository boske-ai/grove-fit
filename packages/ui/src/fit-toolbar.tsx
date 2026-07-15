interface FitToolbarProps {
  onRescan: () => void;
  onRefreshCatalog?: () => void;
  isScanning?: boolean;
  isRefreshingCatalog?: boolean;
  catalogCount?: number;
  catalogStatus?: 'loading-full' | 'ready' | 'boske-only';
}

export function FitToolbar({
  onRescan,
  onRefreshCatalog,
  isScanning,
  isRefreshingCatalog,
  catalogCount,
  catalogStatus,
}: FitToolbarProps) {
  const catalogLabel =
    catalogStatus === 'loading-full'
      ? 'Loading…'
      : catalogStatus === 'boske-only'
        ? 'Boske only'
        : catalogCount
          ? `${catalogCount.toLocaleString()} models`
          : null;

  return (
    <div className="gf-topbar-actions">
      <button
        type="button"
        className="gf-btn gf-btn-sm"
        onClick={onRescan}
        disabled={isScanning}
      >
        {isScanning ? 'Scanning…' : '↻ Rescan'}
      </button>
      {onRefreshCatalog ? (
        <button
          type="button"
          className="gf-btn secondary gf-btn-sm"
          onClick={onRefreshCatalog}
          disabled={isRefreshingCatalog}
        >
          {isRefreshingCatalog ? 'Reloading…' : '↻ Reload catalog'}
        </button>
      ) : null}
      {catalogLabel ? <span className="gf-toolbar-meta">{catalogLabel}</span> : null}
    </div>
  );
}
