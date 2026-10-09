export async function getConversations() {
  const token = localStorage.getItem("token");

  const response = await fetch(
    "http://localhost:5000/api/conversations",
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch conversations");
  }

  return data;
}
export async function askAI(question, mode) {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:5000/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question: question,
      mode: mode,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export async function registerUser(name, email, password) {
  const response = await fetch("http://localhost:5000/api/register", {
    method:"POST",
    headers:{
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }
  return data;
}

export async function loginUser(email, password) {
  const response = await fetch("http://localhost:5000/api/login",{
    method : "POST",
    headers : {
      "Content-Type":"application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if(!response.ok){
    throw new Error(data.error || "Login failed");
  }

  return data;
}

