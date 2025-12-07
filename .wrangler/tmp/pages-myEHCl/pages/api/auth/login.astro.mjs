globalThis.process ??= {}; globalThis.process.env ??= {};
import { L as LoginRequestSchema } from '../../../chunks/auth.validator_C_37k950.mjs';
import { A as AuthService } from '../../../chunks/auth.service_CLLdgikA.mjs';
import { b as logInfo, s as sanitizeContext, l as logWarning, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_DZxrQoTI.mjs';
import { Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const POST = async ({ cookies, request }) => {
  const requestId = crypto.randomUUID();
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const body = await request.json();
    const validatedData = LoginRequestSchema.parse(body);
    const authService = new AuthService(supabase);
    const result = await authService.login(validatedData);
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/login",
      method: "POST",
      error_type: "Success",
      error_message: "User logged in successfully",
      user_id: result.user.id,
      context: sanitizeContext({
        email: validatedData.email
      })
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));
      logWarning({
        request_id: requestId,
        endpoint: "/api/auth/login",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Login validation failed",
        context: sanitizeContext({
          validation_errors: details
        })
      });
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Request validation failed",
          details
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      logWarning({
        request_id: requestId,
        endpoint: "/api/auth/login",
        method: "POST",
        error_type: "AuthenticationError",
        error_message: "Invalid login credentials",
        context: {
          note: "Credentials check failed"
        }
      });
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid email or password",
          code: "invalid_credentials"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: "/api/auth/login",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred during login",
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
