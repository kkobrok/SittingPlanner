globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as createAstro, ad as addAttribute, ae as renderHead, ac as renderSlot, a as renderTemplate } from './astro/server_D4BVXBCg.mjs';
/* empty css                           */

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title = "Sitting Planner", fullWidth = false } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/png" href="/favicon.png"><meta name="generator"${addAttribute(Astro2.generator, "content")}><link rel="stylesheet" href="/src/styles/base.css"><title>${title}</title>${renderHead()}</head> <body class="min-h-screen"> ${fullWidth ? renderTemplate`${renderSlot($$result, $$slots["default"])}` : renderTemplate`<div class="min-h-screen flex flex-col"> <main class="flex-1 w-full mx-auto max-w-7xl px-4 md:px-8 py-8"> ${renderSlot($$result, $$slots["default"])} </main> <footer class="hidden md:block py-8 text-center text-sm text-muted-foreground border-t border-border/40"> <span class="font-medium">Sitting Planner</span> </footer> </div>`} </body></html>`;
}, "C:/Users/kkobr/code/SittingPlanner/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
