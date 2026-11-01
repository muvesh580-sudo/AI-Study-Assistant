const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options, fallbackError) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Could not reach the server. Please try again.");
  }

  // Proxies and cold-starting hosts can answer with HTML instead of JSON.
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || fallbackError);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getConversations(signal) {
  const token = localStorage.getItem("token");

  return request(
    "/api/conversations",
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal,
    },
    "Failed to fetch conversations"
  );
}

export async function askAI(question, mode, signal) {
  const token = localStorage.getItem("token");

  return request(
    "/api/ask",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: question,
        mode: mode,
      }),
      signal,
    },
    "Something went wrong"
  );
}

export async function registerUser(name, email, password) {
  return request(
    "/api/register",
    {
      method:"POST",
      headers:{
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    },
    "Registration failed"
  );
}

export async function loginUser(email, password) {
  return request(
    "/api/login",
    {
      method : "POST",
      headers : {
        "Content-Type":"application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
    "Login failed"
  );
}
