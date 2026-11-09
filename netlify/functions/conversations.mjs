import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);
  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;

  if (request.method === "GET") {
    const result = await supabaseRequest(config, auth.authorization, `conversation_members?select=conversation_id,joined_at&member_id=eq.${auth.user.id}&order=joined_at.desc&limit=100`);
    const data = await result.json().catch(() => []);
    return json(result.ok ? { conversations: data } : { error: "Could not load conversations." }, result.ok ? 200 : result.status);
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const other = parsed.value.member_id;
  if (typeof other !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(other) || other === auth.user.id) return json({ error: "Choose a valid other member." }, 400);

  const result = await fetch(`${config.url}/rest/v1/rpc/start_conversation`, {
    method: "POST",
    headers: { apikey: config.anonKey, authorization: auth.authorization, "content-type": "application/json" },
    body: JSON.stringify({ p_other_member: other })
  });
  const data = await result.json().catch(() => null);
  return json(result.ok ? { conversation_id: data } : { error: "Could not start conversation. Check that the member exists." }, result.ok ? 201 : result.status);
};
