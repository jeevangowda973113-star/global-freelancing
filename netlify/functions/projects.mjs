import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);

  if (request.method === "GET") {
    const authorization = request.headers.get("authorization") || `Bearer ${config.anonKey}`;
    const result = await supabaseRequest(
      config,
      authorization,
      "projects?select=id,client_id,title,description,category,budget_min,budget_max,budget_currency,status,created_at&status=eq.open&order=created_at.desc&limit=50"
    );
    const data = await result.json().catch(() => []);
    return json(result.ok ? { projects: data } : { error: "Could not load projects." }, result.ok ? 200 : result.status);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { title, description, category, budget_min, budget_max, budget_currency } = parsed.value;
  const min = budget_min === null || budget_min === undefined || budget_min === "" ? null : Number(budget_min);
  const max = budget_max === null || budget_max === undefined || budget_max === "" ? null : Number(budget_max);

  if (typeof title !== "string" || title.trim().length < 5 || title.trim().length > 140) {
    return json({ error: "Title must be between 5 and 140 characters." }, 400);
  }
  if (typeof description !== "string" || description.trim().length < 20 || description.trim().length > 6000) {
    return json({ error: "Description must be between 20 and 6,000 characters." }, 400);
  }
  if (typeof category !== "string" || category.trim().length < 2 || category.trim().length > 50) {
    return json({ error: "Choose a valid category." }, 400);
  }
  if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0)) || (min !== null && max !== null && max < min)) {
    return json({ error: "Enter a valid budget range." }, 400);
  }
  const currency = typeof budget_currency === "string" ? budget_currency.toUpperCase() : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: "Currency must be a 3-letter code." }, 400);

  const result = await supabaseRequest(config, auth.authorization, "projects", {
    method: "POST",
    prefer: "return=representation",
    body: {
      client_id: auth.user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      budget_min: min,
      budget_max: max,
      budget_currency: currency,
      status: "draft"
    }
  });
  const data = await result.json().catch(() => null);
  return json(result.ok ? { project: data?.[0] || null, message: "Project saved as a draft." } : { error: "Could not save this project. Check your profile and try again." }, result.ok ? 201 : result.status);
};
