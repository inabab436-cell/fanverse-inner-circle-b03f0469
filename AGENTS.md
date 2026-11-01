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

- The active product is a client-side 3D (React Three Fiber, ssr:false) social space on the index route; keep legacy community data untouched while retiring its UI, to avoid destructive data loss.
- Use dynamically imported nipplejs for touch movement, pure movement functions (src/lib/movement.ts, px units) for locomotion, and per-frame state in refs read by one useFrame; this keeps input and animation independent of React renders.
