---
"@croffcss/scanner": patch
"@croffcss/cli": patch
---

`croff dev` no longer misses an edit saved while it's starting. The watcher rescans once as it starts, and "Watching" is printed only once it's running.
