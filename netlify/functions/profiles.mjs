import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

const fields = "id,display_name,username,account_type,bio,country_code,avatar_url,created_at,updated_at";

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);
  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;

  if (request.method === "GET") {
    const result = await supabaseRequest(config, auth.authorization, `profiles?select=${fields}&id=eq.${auth.user.id}&limit=1`);
    const data = await result.json().catch(() => []);
    return json(result.ok ? { profile: data[0] || null } : { error: "Could not load your profile." }, result.ok ? 200 : result.status);
  }
  if (request.method !== "PATCH") return json({ error: "Method not allowed." }, 405);

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const input = parsed.value;
  const updates = {};

  if ("display_name" in input) {
    if (typeof input.display_name !== "string" || input.display_name.trim().length < 1 || input.display_name.trim().length > 80) return json({ error: "Display name must be 1–80 characters." }, 400);
    updates.display_name = input.display_name.trim();
  }
  if ("username" in input) {
    if (input.username !== null && (typeof input.username !== "string" || !/^[a-zA-Z0-9_]{3,24}$/.test(input.username))) return json({ error: "Username must be 3–24 letters, numbers, or underscores." }, 400);
    updates.username = input.username;
  }
  if ("account_type" in input) {
    if (!["client", "freelancer", "both"].includes(input.account_type)) return json({ error: "Choose client, freelancer, or both." }, 400);
    updates.account_type = input.account_type;
  }
  if ("bio" in input) {
    if (typeof input.bio !== "string" || input.bio.length > 1000) return json({ error: "Bio must be 1,000 characters or fewer." }, 400);
    updates.bio = input.bio.trim();
  }
  if ("country_code" in input) {
    if (input.country_code !== null && (typeof input.country_code !== "string" || !/^[A-Za-z]{2}$/.test(input.country_code))) return json({ error: "Country code must be a two-letter code." }, 400);
    updates.country_code = input.country_code?.toUpperCase() ?? null;
  }
  if ("avatar_url" in input) {
    if (input.avatar_url !== null && (typeof input.avatar_url !== "string" || input.avatar_url.length > 500 || !/^https:\/\//i.test(input.avatar_url))) return json({ error: "Avatar must be an HTTPS URL." }, 400);
    updates.avatar_url = input.avatar_url;
  }
  if (!Object.keys(updates).length) return json({ error: "No supported profile fields were provided." }, 400);

  const result = await supabaseRequest(config, auth.authorization, `profiles?id=eq.${auth.user.id}&select=${fields}`, { method: "PATCH", prefer: "return=representation", body: updates });
  const data = await result.json().catch(() => []);
  return json(result.ok ? { profile: data[0] || null } : { error: "Could not update your profile. The username may already be taken." }, result.ok ? 200 : result.status);
};
