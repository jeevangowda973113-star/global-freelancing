import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);
  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { reported_profile_id, service_id, project_id, reason, details = "" } = parsed.value;
  const targets = [reported_profile_id, service_id, project_id].filter(Boolean);
  if (targets.length !== 1 || targets.some((id) => typeof id !== "string" || !uuidPattern.test(id))) return json({ error: "Report exactly one valid profile, service, or project." }, 400);
  if (typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 100) return json({ error: "Reason must be 5–100 characters." }, 400);
  if (typeof details !== "string" || details.length > 2000) return json({ error: "Details must be 2,000 characters or fewer." }, 400);

  const result = await supabaseRequest(config, auth.authorization, "reports", {
    method: "POST", prefer: "return=representation",
    body: { reporter_id: auth.user.id, reported_profile_id: reported_profile_id || null, service_id: service_id || null, project_id: project_id || null, reason: reason.trim(), details: details.trim() }
  });
  const data = await result.json().catch(() => null);
  return json(result.ok ? { report: data?.[0] || null, message: "Report submitted for review." } : { error: "Could not submit report. Check that the reported item exists." }, result.ok ? 201 : result.status);
};
