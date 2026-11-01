import { useState } from "react";
import { loginUser, registerUser } from "../services/api";

function Auth({ setIsAuthenticated, notice }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] =useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const data = await loginUser(email, password);

      localStorage.setItem("token",data.token);

      setIsAuthenticated(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await registerUser(name, email, password);

      const loginData = await loginUser(email, password);

      localStorage.setItem("token", loginData.token);
      setIsAuthenticated(true); 
    } catch (error) {
      setError(error.message);      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh bg-canvas flex flex-col items-center justify-center gap-6 px-4 py-8">
      <p className="text-xl font-semibold text-ink">
        <span className="text-accent-ink">AI</span> Study Assistant
      </p>

      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
        <h1 className="text-2xl font-semibold text-ink text-center">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h1>

        <p className="mt-2 text-center text-muted">
           {isRegistering
             ? "Create an account to start learning with AI"
             : "Login to your AI Study Assistant"}
        </p>

        {notice && (
          <p role="status" className="mt-4 text-center text-sm text-amber-400">
            {notice}
          </p>
        )}

          <form
           onSubmit={isRegistering ? handleRegister : handleLogin}
           className="mt-6 space-y-4"
          >
          {isRegistering && (
            <input
              type="text"
              placeholder="Full Name"
              aria-label="Full Name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full rounded-xl bg-canvas border border-line px-4 py-3 text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-canvas border border-line px-4 py-3 text-ink outline-none placeholder:text-muted focus:border-accent"
          />

          <input
            type="password"
            placeholder={isRegistering ? "Password (at least 8 characters)" : "Password"}
            aria-label="Password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegistering ? 8 : undefined}
            maxLength={isRegistering ? 72 : undefined}
            className="w-full rounded-xl bg-canvas border border-line px-4 py-3 text-ink outline-none placeholder:text-muted focus:border-accent"
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? isRegistering
                ? "Creating Account..."
                : "Logging in..."
              : isRegistering
                ? "Create Account"
                : "Login"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          {isRegistering
             ? "Already have an account?"
             : "Don't have an account?"}{" "}
          <button
             type="button"
             onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
             }}
             className="font-medium text-accent-ink hover:underline"
           >
             {isRegistering ? "Login" : "Register"}
           </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;