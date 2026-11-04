# Favicon Resolution Engine

## Multi-Tier Fallback Cascade

1. **Tier 1 (Google S2):** `https://t1.gstatic.com/faviconV2?size=128`
2. **Tier 2 (Unavatar):** `https://unavatar.io/:domain`
3. **Tier 3 (DuckDuckGo):** `https://icons.duckduckgo.com/ip3/:domain.ico`
4. **Tier 4 (Brand Initials Squircle):** Two-letter monogram with hash-derived background color.
