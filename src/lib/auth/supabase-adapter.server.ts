import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { AuthenticatedIdentity } from "./core";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    let headers: Headers;
    try {
      headers = new Headers(
        typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
      );
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      }

      if (
        isNewSupabaseApiKey(supabaseKey) &&
        headers.get("Authorization") === `Bearer ${supabaseKey}`
      ) {
        headers.delete("Authorization");
      }

      headers.set("apikey", supabaseKey);
    } catch (e) {
      return Promise.reject(new Error("Headers Error"));
    }
    return fetch(input, { ...init, headers });
  };
}

export async function resolveSupabaseSession(): Promise<AuthenticatedIdentity | null> {
  try {
    const SUPABASE_URL = process.env["SUPABASE_URL"];
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return null;
    }

    if (SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) {
      return null;
    }

    const request = getRequest();
    if (!request?.headers) {
      return null;
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.split(".").length !== 3) {
      return null;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user?.id) {
      return null;
    }

    return {
      userId: data.user.id,
      links: [],
    };
  } catch (error) {
    return null;
  }
}
