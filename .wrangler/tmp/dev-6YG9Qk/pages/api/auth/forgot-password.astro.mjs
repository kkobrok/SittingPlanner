globalThis.process ??= {}; globalThis.process.env ??= {};
import { A as AuthService } from '../../../chunks/auth.service_CLLdgikA.mjs';
import { b as logInfo, s as sanitizeContext, l as logWarning, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_RZyWin4j.mjs';
import { o as objectType, s as stringType, Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const ForgotPasswordSchema = objectType({
  email: stringType().email("Invalid email address")
});
const POST = async ({ cookies, request }) => {
  const requestId = crypto.randomUUID();
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const body = await request.json();
    const validatedData = ForgotPasswordSchema.parse(body);
    const authService = new AuthService(supabase);
    const result = await authService.requestPasswordReset(validatedData);
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/forgot-password",
      method: "POST",
      error_type: "Success",
      error_message: "Password reset email requested",
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
        endpoint: "/api/auth/forgot-password",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Forgot password validation failed",
        context: sanitizeContext({
          validation_errors: details
        })
      });
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid email address",
          details
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: "/api/auth/forgot-password",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing your request",
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
