globalThis.process ??= {}; globalThis.process.env ??= {};
const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": undefined, "SSR": true};
function getEnvVar(name, runtimeEnv) {
  return Object.assign(__vite_import_meta_env__, { DISABLE_AUTH: false, _: process.env._ })[name];
}
const DEV_TEST_USER = {
  id: "e98fe906-d4e5-4151-b470-c1b1b2418723",
  email: "testuser@example.com",
  aud: "authenticated",
  role: "authenticated"
};
async function authenticate(supabase, runtimeEnv) {
  const disableAuthValue = getEnvVar("DISABLE_AUTH");
  const disableAuth = disableAuthValue === "true";
  console.log("[Auth] DISABLE_AUTH env var:", disableAuthValue, "=> disableAuth:", disableAuth);
  if (disableAuth) {
    console.log("[Auth] DEVELOPMENT MODE - Authentication bypassed, using test user");
    return {
      user: DEV_TEST_USER,
      error: null
    };
  }
  console.log("[Auth] PRODUCTION MODE - Checking actual authentication");
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    if (error) {
      return {
        user: null,
        error
      };
    }
    return {
      user,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error("Authentication failed")
    };
  }
}

export { authenticate as a };
