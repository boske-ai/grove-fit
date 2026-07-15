#!/usr/bin/env bash
# Copy Grove Fit native plugin sources into Capacitor android/ios projects (after cap add).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"

ANDROID_DEST="$MOBILE/android/app/src/main/java/dev/boske/grovefit"
ANDROID_SRC="$MOBILE/native/android/dev/boske/grovefit/GroveFitHardwarePlugin.java"

IOS_DEST="$MOBILE/ios/App/App"
IOS_SRC="$MOBILE/native/ios/GroveFitHardwarePlugin.swift"

if [[ -d "$MOBILE/android" && -f "$ANDROID_SRC" ]]; then
  mkdir -p "$ANDROID_DEST"
  cp "$ANDROID_SRC" "$ANDROID_DEST/"
  echo "sync-mobile-native: installed Android plugin → $ANDROID_DEST"
else
  echo "sync-mobile-native: skip Android (run: cd apps/mobile && bunx cap add android)"
fi

if [[ -d "$MOBILE/ios" && -f "$IOS_SRC" ]]; then
  mkdir -p "$IOS_DEST"
  cp "$IOS_SRC" "$IOS_DEST/"
  echo "sync-mobile-native: installed iOS plugin → $IOS_DEST"
else
  echo "sync-mobile-native: skip iOS (run: cd apps/mobile && bunx cap add ios)"
fi
