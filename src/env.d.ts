/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

// Cloudflare runtime environment type
type CloudflareEnv = {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  DISABLE_AUTH?: string;
  E2E_USERNAME_ID?: string;
  E2E_USERNAME?: string;
  OPENROUTER_API_KEY?: string;
};

// Cloudflare runtime context provided by the adapter
type CloudflareRuntime = {
  env: CloudflareEnv;
  cf?: IncomingRequestCfProperties;
  ctx?: ExecutionContext;
};

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        email: string;
        id: string;
      };
      // Cloudflare runtime - available when running on Cloudflare Workers/Pages
      runtime?: CloudflareRuntime;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
