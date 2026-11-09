import { getSupabaseConfig, json, readJson, requireUser, supabaseRequest } from "./_shared/supabase.mjs";

export default async (request) => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Backend is not configured yet." }, 503);

  if (request.method === "GET") {
    const authorization = request.headers.get("authorization") || `Bearer ${config.anonKey}`;
    const result = await supabaseRequest(
      config,
      authorization,
      "services?select=id,owner_id,title,description,category,price_amount,price_currency,status,created_at&status=eq.active&order=created_at.desc&limit=50"
    );
    const data = await result.json().catch(() => []);
    return json(result.ok ? { services: data } : { error: "Could not load services." }, result.ok ? 200 : result.status);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const auth = await requireUser(request, config);
  if (auth.error) return auth.error;

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { title, description, category, price_amount, price_currency } = parsed.value;
  const price = Number(price_amount);

  if (typeof title !== "string" || title.trim().length < 5 || title.trim().length > 120) {
    return json({ error: "Title must be between 5 and 120 characters." }, 400);
  }
  if (typeof description !== "string" || description.trim().length < 20 || description.trim().length > 5000) {
    return json({ error: "Description must be between 20 and 5,000 characters." }, 400);
  }
  if (typeof category !== "string" || category.trim().length < 2 || category.trim().length > 50) {
    return json({ error: "Choose a valid category." }, 400);
  }
  if (!Number.isFinite(price) || price < 0 || price > 1000000000) {
    return json({ error: "Enter a valid non-negative price." }, 400);
  }
  const currency = typeof price_currency === "string" ? price_currency.toUpperCase() : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: "Currency must be a 3-letter code." }, 400);

  const result = await supabaseRequest(config, auth.authorization, "services", {
    method: "POST",
    prefer: "return=representation",
    body: {
      owner_id: auth.user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      price_amount: price,
      price_currency: currency,
      status: "draft"
    }
  });
  const data = await result.json().catch(() => null);
  return json(result.ok ? { service: data?.[0] || null, message: "Service saved as a draft." } : { error: "Could not save this service. Check your profile and try again." }, result.ok ? 201 : result.status);
};
