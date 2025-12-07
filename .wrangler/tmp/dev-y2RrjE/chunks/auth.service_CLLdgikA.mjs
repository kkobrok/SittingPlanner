globalThis.process ??= {}; globalThis.process.env ??= {};
class AuthService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Register a new user
   *
   * @param data User registration data (email, password)
   * @returns User and session information
   * @throws Error if registration fails
   */
  async register(data) {
    const { email, password } = data;
    const { data: authData, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${"http://localhost:3000"}/auth/callback`
      }
    });
    if (error) {
      if (error.message.includes("already registered")) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }
      throw new Error(`Registration failed: ${error.message}`);
    }
    if (!authData.user || !authData.session) {
      throw new Error("Registration succeeded but no user/session returned");
    }
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        created_at: authData.user.created_at
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: new Date(authData.session.expires_at * 1e3).toISOString()
      }
    };
  }
  /**
   * Authenticate a user (login)
   *
   * @param data User login credentials (email, password)
   * @returns User and session information
   * @throws Error if authentication fails
   */
  async login(data) {
    const { email, password } = data;
    const { data: authData, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      throw new Error("INVALID_CREDENTIALS");
    }
    if (!authData.user || !authData.session) {
      throw new Error("Login succeeded but no user/session returned");
    }
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: new Date(authData.session.expires_at * 1e3).toISOString()
      }
    };
  }
  /**
   * Log out the current user
   *
   * @returns Success message
   * @throws Error if logout fails
   */
  async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
    return {
      message: "Successfully logged out"
    };
  }
  /**
   * Request a password reset email
   *
   * @param data Email address for password reset
   * @returns Success message
   * @throws Error if request fails
   */
  async requestPasswordReset(data) {
    const { email } = data;
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${"http://localhost:3000"}/auth/callback`
    });
    if (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
    return {
      message: "Password reset email sent"
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
      error
    } = await this.supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email
    };
  }
}

export { AuthService as A };
