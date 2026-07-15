#!/usr/bin/env bash
# Stage llmfit for Tauri externalBin sidecar (best-effort; native detect fallback if absent).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$ROOT/apps/desktop/src-tauri/binaries"
HASH_MANIFEST="$BIN_DIR/llmfit-sidecar-hashes.json"
mkdir -p "$BIN_DIR"

if ! command -v rustc >/dev/null 2>&1; then
  echo "copy-llmfit-sidecar: rustc not found — skip sidecar staging"
  exit 0
fi

TARGET_TRIPLE="${TARGET_TRIPLE:-$(rustc --print host-tuple)}"
EXT=""
case "$TARGET_TRIPLE" in
  *windows*) EXT=".exe" ;;
esac

DEST="$BIN_DIR/llmfit-$TARGET_TRIPLE$EXT"

resolve_llmfit() {
  if [[ -n "${LLMFIT_PATH:-}" && -x "$LLMFIT_PATH" ]]; then
    echo "$LLMFIT_PATH"
    return 0
  fi
  if command -v llmfit >/dev/null 2>&1; then
    command -v llmfit
    return 0
  fi
  for candidate in /opt/homebrew/bin/llmfit /usr/local/bin/llmfit; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

sha256_file() {
  local file=$1
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    echo "copy-llmfit-sidecar: no sha256 tool found" >&2
    return 1
  fi
}

expected_hash_for_triple() {
  local triple=$1
  if [[ -n "${LLMFIT_SIDECAR_EXPECTED_SHA256:-}" ]]; then
    echo "$LLMFIT_SIDECAR_EXPECTED_SHA256"
    return 0
  fi
  if [[ -f "$HASH_MANIFEST" ]]; then
    python3 - "$HASH_MANIFEST" "$triple" <<'PY'
import json, sys
path, triple = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
print(data.get("hashes", {}).get(triple, ""))
PY
    return 0
  fi
  echo ""
}

verify_sidecar_hash() {
  local file=$1
  local expected=$2
  if [[ -z "$expected" ]]; then
    return 0
  fi
  local actual
  actual="$(sha256_file "$file")"
  if [[ "$actual" != "$expected" ]]; then
    echo "copy-llmfit-sidecar: SHA256 mismatch for $TARGET_TRIPLE" >&2
    echo "  expected: $expected" >&2
    echo "  actual:   $actual" >&2
    return 1
  fi
  echo "copy-llmfit-sidecar: SHA256 verified ($actual)"
}

is_stub_sidecar() {
  local file=$1
  [[ -f "$file" ]] || return 1
  head -1 "$file" 2>/dev/null | grep -q '^#!/'
}

sidecar_up_to_date() {
  local src=$1 dest=$2
  [[ -f "$src" && -f "$dest" ]] || return 1
  is_stub_sidecar "$dest" && return 1
  local src_hash dest_hash
  src_hash="$(sha256_file "$src")"
  dest_hash="$(sha256_file "$dest")"
  [[ "$src_hash" == "$dest_hash" ]]
}

if [[ -f "$DEST" && "${FORCE_LLMFIT_SIDECAR:-}" != "1" ]]; then
  EXPECTED="$(expected_hash_for_triple "$TARGET_TRIPLE" | tr -d '[:space:]')"
  if SRC="$(resolve_llmfit)"; then
    if sidecar_up_to_date "$SRC" "$DEST"; then
      echo "copy-llmfit-sidecar: up to date at $DEST"
      if [[ -n "$EXPECTED" ]]; then
        verify_sidecar_hash "$DEST" "$EXPECTED" || exit 1
      fi
      exit 0
    fi
  elif is_stub_sidecar "$DEST"; then
    echo "copy-llmfit-sidecar: stub present, llmfit not installed — skip"
    exit 0
  elif [[ -n "$EXPECTED" ]]; then
    verify_sidecar_hash "$DEST" "$EXPECTED" || exit 1
    echo "copy-llmfit-sidecar: present at $DEST"
    exit 0
  else
    echo "copy-llmfit-sidecar: present at $DEST"
    exit 0
  fi
fi

if SRC="$(resolve_llmfit)"; then
  cp "$SRC" "$DEST"
  chmod +x "$DEST"
  ACTUAL_HASH="$(sha256_file "$DEST")"
  echo "$ACTUAL_HASH" >"$DEST.sha256"
  echo "copy-llmfit-sidecar: copied $SRC → $DEST"
  echo "copy-llmfit-sidecar: sha256 $ACTUAL_HASH"

  EXPECTED="$(expected_hash_for_triple "$TARGET_TRIPLE" | tr -d '[:space:]')"
  if [[ -n "$EXPECTED" ]]; then
    verify_sidecar_hash "$DEST" "$EXPECTED" || exit 1
  elif [[ "${LLMFIT_VERIFY_SIDECAR:-}" == "1" ]]; then
    echo "copy-llmfit-sidecar: LLMFIT_VERIFY_SIDECAR=1 but no hash pinned for $TARGET_TRIPLE" >&2
    echo "  set LLMFIT_SIDECAR_EXPECTED_SHA256 or add to llmfit-sidecar-hashes.json" >&2
    exit 1
  fi
else
  cat >"$DEST" <<'STUB'
#!/usr/bin/env bash
# Placeholder — replace via copy-llmfit-sidecar.sh when llmfit is installed.
exit 1
STUB
  chmod +x "$DEST"
  echo "copy-llmfit-sidecar: stub at $DEST (install llmfit for rich GPU detect)"
  echo "  brew install AlexsJones/llmfit/llmfit"
  echo "  or LLMFIT_PATH=/path/to/llmfit bash scripts/copy-llmfit-sidecar.sh"
fi

exit 0
