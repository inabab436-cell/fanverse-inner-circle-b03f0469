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
- Touch input in the 3D scene uses pure slot assignment in src/lib/touchControls.ts (phone-only, PUBG split: a finger landing on the left half walks with a floating stick, one on the right half orbits the camera; each slot released independently) so the two fingers never cancel each other.
- Use pure movement functions (src/lib/movement.ts, px units) for locomotion, and per-frame state in refs read by one useFrame; this keeps input and animation independent of React renders.
