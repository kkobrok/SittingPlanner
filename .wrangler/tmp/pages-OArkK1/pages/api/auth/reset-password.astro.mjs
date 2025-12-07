globalThis.process ??= {}; globalThis.process.env ??= {};
import { l as logWarning, b as logInfo, s as sanitizeContext, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_DZxrQoTI.mjs';
import { o as objectType, s as stringType, Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const ResetPasswordSchema = objectType({
  password: stringType().min(6, "Password must be at least 6 characters")
});
const POST = async ({ cookies, request }) => {
  const requestId = crypto.randomUUID();
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const body = await request.json();
    const validatedData = ResetPasswordSchema.parse(body);
    const { data, error } = await supabase.auth.updateUser({
      password: validatedData.password
    });
    if (error) {
      if (error.message.includes("token") || error.message.includes("session")) {
        logWarning({
          request_id: requestId,
          endpoint: "/api/auth/reset-password",
          method: "POST",
          error_type: "AuthorizationError",
          error_message: "Invalid or expired reset token",
          context: {
            error: error.message
          }
        });
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Invalid or expired password reset link. Please request a new one.",
            code: "invalid_token"
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      throw new Error(`Password reset failed: ${error.message}`);
    }
    if (!data.user) {
      throw new Error("Password reset succeeded but no user returned");
    }
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/reset-password",
      method: "POST",
      error_type: "Success",
      error_message: "Password reset successful",
      user_id: data.user.id
    });
    return new Response(
      JSON.stringify({
        message: "Password reset successfully",
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));
      logWarning({
        request_id: requestId,
        endpoint: "/api/auth/reset-password",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Reset password validation failed",
        context: sanitizeContext({
          validation_errors: details
        })
      });
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid password format",
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
      endpoint: "/api/auth/reset-password",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while resetting your password",
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
