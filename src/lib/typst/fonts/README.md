# Custom fonts

Drop `.ttf`/`.otf` files here to make them available to the Typst compiler
(picked up via `fontArgs` in `src/lib/typst/compile.ts`). Until then, the
default template relies on Typst's built-in fonts (New Computer Modern /
Libertinus), so PDF generation works with zero setup — this directory only
matters once you want a specific branded typeface.
