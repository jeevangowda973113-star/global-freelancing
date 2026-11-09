const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function requireUser(request, config) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return { error: json({ error: "Sign in is required." }, 401) };
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, authorization }
  });

  if (!response.ok) return { error: json({ error: "Your session is invalid or expired." }, 401) };
  const user = await response.json();
  if (!user?.id) return { error: json({ error: "Unable to verify your account." }, 401) };
  return { user, authorization };
}

export async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16000) return { error: json({ error: "Request body is too large." }, 413) };
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { error: json({ error: "A JSON object is required." }, 400) };
    }
    return { value };
  } catch {
    return { error: json({ error: "Request body must be valid JSON." }, 400) };
  }
}

export async function supabaseRequest(config, authorization, path, options = {}) {
  return fetch(`${config.url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: config.anonKey,
      authorization,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
}
