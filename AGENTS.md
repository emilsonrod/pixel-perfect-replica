<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Application architecture

- Use TanStack file routes for catalog, product detail and standalone admin pages; unnested admin filenames keep forms from rendering inside the product list.
- Keep product validation and filtering in `src/features/catalog/model.ts`, example rows in `seed.ts`, and browser-only persistence in a shared React provider; this keeps business rules testable and never implies server persistence.
- Load browser storage after hydration and validate stored records before accepting them; SSR and initial client rendering must remain consistent.
- Define product context and its consumer hook in a separate non-component module, while the provider module exports only its component; hot updates must not recreate context underneath mounted consumers.
- Use semantic global design tokens and shared UI controls for all presentation; reference-specific styling stays in the central stylesheet.
- Validate and resize image uploads in the browser and accept only local image data or managed asset references; no remote fetch or server is required in this iteration.
- Keep QR-payment rules in a separate feature model with a stable context and hydration-safe browser provider; local demonstrations must never imply shared storage or bank verification.
- Snapshot product, amount and recipient QR in each payment request, and require an explicit bank-verification acknowledgment for idempotent manual confirmation; receipts must never mark a request paid.
- Preserve original QR image pixels when validating uploads; cropping and lossy recompression can make bank codes unusable.
