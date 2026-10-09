import { useState } from "react";
import { loginUser, registerUser } from "../services/api";

function Auth({ setIsAuthenticated }) {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h1>

        <p className="mt-2 text-center text-slate-400">
           {isRegistering
             ? "Create an account to start learning with AI"
             : "Login to your AI Study Assistant"}
        </p>

          <form
           onSubmit={isRegistering ? handleRegister : handleLogin}
           className="mt-6 space-y-4"
          >
          {isRegistering && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
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
        <p className="mt-5 text-center text-sm text-slate-400">
          {isRegistering
             ? "Already have an account?"
             : "Don't have an account?"}{" "}
          <button
             type="button"
             onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
             }}
             className="font-medium text-blue-400 hover:text-blue-300"
           >
             {isRegistering ? "Login" : "Register"}
           </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;