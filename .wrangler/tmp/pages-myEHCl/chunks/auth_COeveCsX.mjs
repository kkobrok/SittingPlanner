globalThis.process ??= {}; globalThis.process.env ??= {};
async function authenticate(supabase) {
  const disableAuth = false;
  console.log("[Auth] DISABLE_AUTH env var:", false, "=> disableAuth:", disableAuth);
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
