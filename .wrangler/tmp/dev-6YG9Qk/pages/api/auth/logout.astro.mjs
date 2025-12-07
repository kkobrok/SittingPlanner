globalThis.process ??= {}; globalThis.process.env ??= {};
import { A as AuthService } from '../../../chunks/auth.service_CLLdgikA.mjs';
import { b as logInfo, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_RZyWin4j.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const POST = async ({ cookies, request }) => {
  const requestId = crypto.randomUUID();
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
          code: "auth_invalid_token"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const authService = new AuthService(supabase);
    const result = await authService.logout();
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/logout",
      method: "POST",
      error_type: "Success",
      error_message: "User logged out successfully",
      user_id: user.id
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: "/api/auth/logout",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred during logout",
        request_id: requestId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
