import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);
  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;

  if (request.method === "GET") {
    const conversationId = new URL(request.url).searchParams.get("conversation_id");
    if (!uuidPattern.test(conversationId || "")) return json({ error: "A valid conversation_id is required." }, 400);
    const result = await supabaseRequest(config, auth.authorization, `messages?select=id,conversation_id,sender_id,body,created_at&conversation_id=eq.${conversationId}&order=created_at.asc&limit=100`);
    const data = await result.json().catch(() => []);
    return json(result.ok ? { messages: data } : { error: "Could not load messages. You may not be a conversation member." }, result.ok ? 200 : result.status);
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { conversation_id, body } = parsed.value;
  if (typeof conversation_id !== "string" || !uuidPattern.test(conversation_id)) return json({ error: "A valid conversation_id is required." }, 400);
  if (typeof body !== "string" || !body.trim() || body.trim().length > 5000) return json({ error: "Message must be between 1 and 5,000 characters." }, 400);

  const result = await supabaseRequest(config, auth.authorization, "messages", {
    method: "POST", prefer: "return=representation",
    body: { conversation_id, sender_id: auth.user.id, body: body.trim() }
  });
  const data = await result.json().catch(() => null);
  return json(result.ok ? { message: data?.[0] || null } : { error: "Message could not be sent. Confirm that you belong to this conversation." }, result.ok ? 201 : result.status);
};
