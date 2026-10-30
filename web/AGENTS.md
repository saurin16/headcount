<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Frontend-only: all data comes from the external Headcount API whose base URL lives only in src/lib/api.ts; never add a backend/Cloud. Why: hackathon judges must run it with zero setup.
- Live run state comes from src/lib/useRun.ts (SSE "run" events, 2s polling fallback, reconnect after decisions). Why: one source of truth for streaming.
