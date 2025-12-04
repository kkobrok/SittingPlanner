import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  RegisterRequestDto,
  LoginRequestDto,
  PasswordResetRequestDto,
  AuthResponseDto,
  LogoutResponseDto,
  PasswordResetResponseDto,
} from "../types";

/**
 * Service class for authentication operations
 *
 * Handles user registration, login, logout, and password reset
 * using Supabase Auth
 */
export class AuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Register a new user
   *
   * @param data User registration data (email, password)
   * @returns User and session information
   * @throws Error if registration fails
   */
  async register(data: RegisterRequestDto): Promise<AuthResponseDto> {
    const { email, password } = data;

    // Attempt to create new user with Supabase Auth
    // Email confirmation link will redirect to callback page
    const { data: authData, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${import.meta.env.PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      // Check for specific error types
      if (error.message.includes("already registered")) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }
      throw new Error(`Registration failed: ${error.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error("Registration succeeded but no user/session returned");
    }

    // Return formatted response
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: authData.user.created_at,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: new Date(authData.session.expires_at! * 1000).toISOString(),
      },
    };
  }

  /**
   * Authenticate a user (login)
   *
   * @param data User login credentials (email, password)
   * @returns User and session information
   * @throws Error if authentication fails
   */
  async login(data: LoginRequestDto): Promise<AuthResponseDto> {
    const { email, password } = data;

    // Attempt to sign in with email and password
    const { data: authData, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Return generic error for security (don't reveal if email exists)
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!authData.user || !authData.session) {
      throw new Error("Login succeeded but no user/session returned");
    }

    // Return formatted response
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: new Date(authData.session.expires_at! * 1000).toISOString(),
      },
    };
  }

  /**
   * Log out the current user
   *
   * @returns Success message
   * @throws Error if logout fails
   */
  async logout(): Promise<LogoutResponseDto> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }

    return {
      message: "Successfully logged out",
    };
  }

  /**
   * Request a password reset email
   *
   * @param data Email address for password reset
   * @returns Success message
   * @throws Error if request fails
   */
  async requestPasswordReset(data: PasswordResetRequestDto): Promise<PasswordResetResponseDto> {
    const { email } = data;

    // Request password reset email from Supabase
    // The callback page will handle the token exchange and redirect to reset-password
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    });

    if (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }

    // Always return success message (don't reveal if email exists - security)
    return {
      message: "Password reset email sent",
    };
  }

  /**
   * Get the current authenticated user
   *
   * @returns User information or null if not authenticated
   */
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
    };
  }
}
