import {
  defineConfig,
  IndexHtmlTransformContext,
  IndexHtmlTransformResult,
  ViteDevServer,
} from "vite";

import { svelte } from "@sveltejs/vite-plugin-svelte";

const HTML_REPLACE_STRING = "<!-- 4c40525e-c6eb-4e76-b3e1-a7ec81a66469 -->";

// import AboutPage from "./src/about.svelte";
import { create_ssr_component } from "./node_modules/svelte/types/runtime/internal/ssr.d";

interface ModuleParams {
  modpath: string;
  props?: Record<string, unknown>;
}

const urlToModule = (u: string): ModuleParams => {
  switch (u) {
    case "/":
      return { modpath: "./src/main.ts" };
    case "/about":
      return { modpath: "./src/about.svelte" };
    default:
      throw Error(`could not handle route '${u}'`);
  }
};

interface ModuleSSR {
  html: string;
}

const renderModPath = async (
  modParams: ModuleParams,
  server: ViteDevServer
): Promise<ModuleSSR> => {
  const { modpath, props } = modParams;

  // Svelte component
  if (modpath.endsWith(".svelte")) {
    const mod = (await server.ssrLoadModule(modpath)) as {
      default: ReturnType<typeof create_ssr_component>;
    };
    const rendered = mod.default.render(props ?? {});
    return rendered.html;
  }
  // Default components
  const mod = await server.ssrLoadModule(modpath);
  const html = mod.default();
  return { html };
};

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: "vite-ssr",
      transformIndexHtml: async (
        html: string,
        ctx: IndexHtmlTransformContext
      ): Promise<IndexHtmlTransformResult> => {
        // Load modules based on route here.
        const { server, originalUrl: u } = ctx;
        if (server === undefined) throw Error("`server` cannot be undefined");
        if (u === undefined) throw Error("`originalUrl` cannot be undefined");

        const modpath = urlToModule(u);
        const rendered = await renderModPath(modpath, server);

        // TODO: define rendered module as some sort of interface to represent
        // web components 🤔.
        // TODO: decide how to inform the target platform (typically a browser)
        // how/when to load runtime dependencies (css, javascript, images, etc)
        return html.replace(HTML_REPLACE_STRING, rendered.html);
      },
    },
  ],
});
