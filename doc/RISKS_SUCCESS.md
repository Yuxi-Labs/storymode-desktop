# Risks & Success Metrics (MVP)

## Key Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Parser/compile latency spikes on large files | Perceived sluggishness | Medium | Debounce, potential worker thread, measure parseTimeMs and log >750ms |
| File watch inconsistency (Linux / network drives) | Missed reload prompts | Medium | Use chokidar fallback; manual refresh command |
| Monaco bundle size inflates startup | Slower cold start | Medium | Code split lazy-load editor; consider CodeMirror later |
| Unhandled exceptions in core libs crash main | Data loss / app crash | Low | Wrap IPC handlers with try/catch and structured error responses |
| Token/AST mismatch with future core versions | Rendering errors | Medium | Pin exact versions; add versionInfo check in status bar |
| Memory growth with very large AST retention | Performance degradation | Low | Keep only last AST; allow manual clear (future) |
| UX confusion without inline squiggles | Reduced clarity | Medium | Clear diagnostics panel + counts in status bar |
| Cross-platform path edge cases (UNC, symlinks) | File open failures | Low | Normalize paths; reject unsupported with clear error |
| Lack of automated tests initially | Regressions | Medium | Add minimal smoke tests for services & IPC early |

## Additional Considerations
- Security: Preload must stay minimal; no dynamic `eval` usage.
- Theming: Hard-coded two-theme approach reduces complexity early.
- Navigation reliability tied to AST scene extraction; fallback needed if parse fails.

## Success Metrics (Quantitative)
- Cold start (open app to ready editor) < 4s on baseline laptop.
- Parse turnaround for 1k-line file <= 750ms (p50), <= 1200ms (p95) in dev logs.
- Compile success path (valid file) returns IR in <= 1s (p95).
- Zero uncaught exceptions in renderer during 30-minute exploratory session.
- 90% of navigation attempts (scene jump) land within ±2 lines of target.
- Memory footprint stable (< 500MB RSS) after 30 minutes editing single large file (5MB limit anyway).

## Success Metrics (Qualitative)
- Developer can reliably open, edit, view diagnostics, view AST, compile to IR without ambiguous states.
- Users report clear separation between parse errors vs compile errors.
- Status bar info always up-to-date after actions (no stale parse time or counts).

## Instrumentation (Lightweight Plan)
- Development-only console logs: parseTimeMs, genTimeMs, file size.
- Wrap performance marks around parse/compile to confirm thresholds.

## Exit Criteria for MVP Phase 1
- All acceptance criteria in `MVP_SCOPE.md` met.
- Risks with Medium likelihood have at least one implemented mitigation.
- Docs in `doc/` reflect actual implemented architecture (updated if drift occurs).

---
Generated: 2025-09-14
