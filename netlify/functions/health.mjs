export default async () => {
  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.SUPABASE_ANON_KEY);

  return new Response(
    JSON.stringify({
      ok: true,
      service: "global-freelancing-api",
      timestamp: new Date().toISOString(),
      databaseConfigured: hasSupabaseUrl && hasSupabaseAnonKey
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
};
