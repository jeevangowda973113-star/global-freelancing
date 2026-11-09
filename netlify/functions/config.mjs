import { json, getSupabaseConfig } from "./_shared/supabase.mjs";

export default async () => {
  const config = getSupabaseConfig();
  if (!config) return json({ error: "Supabase public configuration is missing." }, 503);
  return json({ url: config.url, anonKey: config.anonKey });
};
