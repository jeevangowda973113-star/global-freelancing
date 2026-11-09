import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);
  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;

  if (request.method === "GET") {
    const result = await supabaseRequest(config, auth.authorization, "proposals?select=id,project_id,freelancer_id,cover_letter,proposed_amount,currency,estimated_days,status,created_at,updated_at&order=created_at.desc&limit=100");
    const data = await result.json().catch(() => []);
    return json(result.ok ? { proposals: data } : { error: "Could not load proposals." }, result.ok ? 200 : result.status);
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { project_id, cover_letter, proposed_amount, currency, estimated_days } = parsed.value;
  const amount = Number(proposed_amount);
  const days = estimated_days === undefined || estimated_days === null || estimated_days === "" ? null : Number(estimated_days);
  if (typeof project_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project_id)) return json({ error: "A valid project ID is required." }, 400);
  if (typeof cover_letter !== "string" || cover_letter.trim().length < 20 || cover_letter.trim().length > 3000) return json({ error: "Cover letter must be 20–3,000 characters." }, 400);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) return json({ error: "Enter a valid proposed amount." }, 400);
  const code = typeof currency === "string" ? currency.toUpperCase() : "USD";
  if (!/^[A-Z]{3}$/.test(code)) return json({ error: "Currency must be a three-letter code." }, 400);
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) return json({ error: "Estimated days must be between 1 and 3,650." }, 400);

  const result = await supabaseRequest(config, auth.authorization, "proposals", {
    method: "POST", prefer: "return=representation",
    body: { project_id, freelancer_id: auth.user.id, cover_letter: cover_letter.trim(), proposed_amount: amount, currency: code, estimated_days: days, status: "submitted" }
  });
  const data = await result.json().catch(() => null);
  return json(result.ok ? { proposal: data?.[0] || null, message: "Proposal submitted." } : { error: "Could not submit proposal. Check that the project is open and you have not already applied." }, result.ok ? 201 : result.status);
};
