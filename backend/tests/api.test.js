import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import createApp from "../app.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-for-hs256";

const alice = { name: "Alice", email: "alice@test.local", password: "CorrectHorse9!" };
const bob = { name: "Bob", email: "bob@test.local", password: "BatteryStaple9!" };

// Stands in for Groq. Tests set `reply` to a string, or to a function that throws.
let reply;
let aiCalls;
const aiClient = {
  chat: {
    completions: {
      create: async ({ messages }) => {
        aiCalls.push(messages);
        const content = typeof reply === "function" ? reply() : reply;
        return { choices: [{ message: { content } }] };
      },
    },
  },
};

const limits = { login: 1000, register: 1000, ask: 1000 };
const app = createApp({ aiClient, limits });

let mongo;

const signUp = async (user) => {
  await request(app).post("/api/register").send(user).expect(201);
  const { body } = await request(app)
    .post("/api/login")
    .send({ email: user.email, password: user.password })
    .expect(200);
  return { token: body.token, id: body.user.id };
};

const ask = (token, body) =>
  request(app).post("/api/ask").set("Authorization", `Bearer ${token}`).send(body);

const history = (token) =>
  request(app).get("/api/conversations").set("Authorization", `Bearer ${token}`);

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri("api-test"));
  await Promise.all([User.init(), Conversation.init()]);
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  reply = "A helpful answer";
  aiCalls = [];
  await Promise.all([User.deleteMany({}), Conversation.deleteMany({})]);
});

describe("POST /api/register", () => {
  it("creates a user, hashes the password and never returns it", async () => {
    const { body } = await request(app).post("/api/register").send(alice).expect(201);

    assert.deepEqual(Object.keys(body.user).sort(), ["email", "id", "name"]);

    const stored = await User.findOne({ email: alice.email }).select("+password");
    assert.match(stored.password, /^\$2[aby]\$10\$/);
  });

  it("normalizes the email and treats case variants as duplicates", async () => {
    await request(app)
      .post("/api/register")
      .send({ ...alice, email: "  ALICE@Test.Local " })
      .expect(201);

    assert.ok(await User.findOne({ email: alice.email }));
    await request(app).post("/api/register").send(alice).expect(409);
  });

  it("returns 409 rather than 500 when sign-ups race", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post("/api/register").send(alice))
    );

    const statuses = results.map(({ status }) => status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
    assert.equal(await User.countDocuments({ email: alice.email }), 1);
  });

  for (const [label, body] of [
    ["missing fields", {}],
    ["invalid email", { ...alice, email: "not-an-email" }],
    ["short password", { ...alice, password: "short" }],
    ["password over 72 bytes", { ...alice, password: "x".repeat(73) }],
    ["whitespace name", { ...alice, name: "   " }],
    ["long name", { ...alice, name: "x".repeat(101) }],
    ["object email", { ...alice, email: { $ne: null } }],
    ["object password", { ...alice, password: { a: 1 } }],
  ]) {
    it(`rejects ${label} with 400`, async () => {
      await request(app).post("/api/register").send(body).expect(400);
      assert.equal(await User.countDocuments(), 0);
    });
  }
});

describe("POST /api/login", () => {
  beforeEach(async () => {
    await signUp(alice);
  });

  it("issues an HS256 token holding only the user id and expiry", async () => {
    const { body } = await request(app)
      .post("/api/login")
      .send({ email: "ALICE@test.local", password: alice.password })
      .expect(200);

    const { header, payload } = jwt.decode(body.token, { complete: true });
    assert.equal(header.alg, "HS256");
    assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "userId"]);
    assert.equal(body.user.password, undefined);
  });

  it("still accepts existing accounts with passwords under the new minimum", async () => {
    await User.create({
      name: "Legacy",
      email: "legacy@test.local",
      // Written directly, as accounts were before a minimum length existed.
      password: await bcrypt.hash("a", 10),
    });

    await request(app)
      .post("/api/login")
      .send({ email: "legacy@test.local", password: "a" })
      .expect(200);
  });

  it("gives the same error for a wrong password and an unknown user", async () => {
    const wrong = await request(app)
      .post("/api/login")
      .send({ email: alice.email, password: "wrong" })
      .expect(401);
    const unknown = await request(app)
      .post("/api/login")
      .send({ email: "nobody@test.local", password: "wrong" })
      .expect(401);

    assert.deepEqual(wrong.body, unknown.body);
  });

  for (const [label, body] of [
    ["email operator with the right password", { email: { $ne: null }, password: alice.password }],
    ["email $gt operator", { email: { $gt: "" }, password: alice.password }],
    ["password operator", { email: alice.email, password: { $ne: 1 } }],
    ["missing password", { email: alice.email }],
  ]) {
    it(`rejects ${label} with 400`, async () => {
      await request(app).post("/api/login").send(body).expect(400);
    });
  }

  it("answers an empty body with 400", async () => {
    await request(app).post("/api/login").expect(400);
  });
});

describe("authentication", () => {
  let token;

  beforeEach(async () => {
    ({ token } = await signUp(alice));
  });

  const unsigned = (payload) =>
    [
      Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
      Buffer.from(JSON.stringify(payload)).toString("base64url"),
      "",
    ].join(".");

  it("requires a token on protected routes", async () => {
    await request(app).get("/api/conversations").expect(401);
    await request(app).post("/api/ask").send({ question: "hi" }).expect(401);
    assert.equal(aiCalls.length, 0);
  });

  it("requires the Bearer scheme", async () => {
    await request(app)
      .get("/api/conversations")
      .set("Authorization", `Basic ${token}`)
      .expect(401);
  });

  it("rejects garbage, alg=none, wrongly signed and expired tokens", async () => {
    const userId = jwt.decode(token).userId;
    const bad = [
      "garbage",
      unsigned({ userId }),
      jwt.sign({ userId }, "some-other-secret"),
      jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: -10 }),
      jwt.sign({ userId }, process.env.JWT_SECRET, { algorithm: "HS512" }),
    ];

    for (const value of bad) {
      await history(value).expect(401);
    }
  });
});

describe("POST /api/ask", () => {
  let token;

  beforeEach(async () => {
    ({ token } = await signUp(alice));
  });

  for (const mode of ["explain", "summarize", "quiz", "flashcards"]) {
    it(`saves a ${mode} conversation`, async () => {
      const { body } = await ask(token, { question: "Photosynthesis", mode }).expect(200);

      assert.equal(body.answer, "A helpful answer");
      assert.equal(body.conversation.mode, mode);
      assert.match(aiCalls[0][0].content, /Photosynthesis/);
      assert.equal(await Conversation.countDocuments({ mode }), 1);
    });
  }

  it("defaults to explain when the mode is omitted", async () => {
    const { body } = await ask(token, { question: "Gravity" }).expect(200);
    assert.equal(body.conversation.mode, "explain");
  });

  for (const [label, body] of [
    ["unknown mode", { question: "x", mode: "hack" }],
    ["inherited property as mode", { question: "x", mode: "constructor" }],
    ["array mode", { question: "x", mode: ["quiz"] }],
    ["empty question", { question: "   " }],
    ["object question", { question: { a: 1 } }],
    ["question over the limit", { question: "x".repeat(20001) }],
  ]) {
    it(`rejects ${label} with 400 before calling the AI`, async () => {
      await ask(token, body).expect(400);
      assert.equal(aiCalls.length, 0);
    });
  }

  it("maps AI rate limiting to 503 and outages to 502, saving nothing", async () => {
    reply = () => {
      throw Object.assign(new Error("limited"), { status: 429 });
    };
    await ask(token, { question: "x" }).expect(503);

    reply = () => {
      throw Object.assign(new Error("boom"), { status: 500 });
    };
    const { body } = await ask(token, { question: "x" }).expect(502);

    assert.doesNotMatch(body.error, /boom/);
    assert.equal(await Conversation.countDocuments(), 0);
  });

  it("returns 502 for an empty AI response", async () => {
    reply = null;
    await ask(token, { question: "x" }).expect(502);
    assert.equal(await Conversation.countDocuments(), 0);
  });
});

describe("GET /api/conversations", () => {
  it("only returns the caller's conversations", async () => {
    const first = await signUp(alice);
    const second = await signUp(bob);
    await ask(first.token, { question: "alice private topic" }).expect(200);

    assert.equal((await history(first.token).expect(200)).body.length, 1);
    assert.deepEqual((await history(second.token).expect(200)).body, []);
  });

  it("returns the newest 50 without internal fields", async () => {
    const { token, id } = await signUp(alice);

    await Conversation.insertMany(
      Array.from({ length: 55 }, (_, index) => ({
        user: id,
        question: `q${index}`,
        mode: "explain",
        answer: "a",
        createdAt: new Date(2026, 0, index + 1),
      }))
    );

    const { body } = await history(token).expect(200);

    assert.equal(body.length, 50);
    assert.equal(body[0].question, "q54");
    assert.deepEqual(Object.keys(body[0]).sort(), [
      "_id",
      "answer",
      "createdAt",
      "mode",
      "question",
    ]);
  });

  it("uses the user/createdAt index instead of scanning", async () => {
    const { id } = await signUp(alice);
    const plan = await Conversation.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .explain("queryPlanner");

    assert.match(JSON.stringify(plan.queryPlanner.winningPlan), /user_1_createdAt_-1/);
    assert.doesNotMatch(JSON.stringify(plan.queryPlanner.winningPlan), /COLLSCAN/);
  });
});

describe("rate limiting", () => {
  it("blocks repeated failed logins but not successful ones", async () => {
    const limited = createApp({ aiClient, limits: { ...limits, login: 3 } });
    await signUp(alice);
    const attempt = (password) =>
      request(limited).post("/api/login").send({ email: alice.email, password });

    await attempt(alice.password).expect(200);
    await attempt("bad").expect(401);
    await attempt("bad").expect(401);
    await attempt("bad").expect(401);

    const { body } = await attempt("bad").expect(429);
    assert.match(body.error, /Too many/);
  });

  it("limits each user's questions separately", async () => {
    const limited = createApp({ aiClient, limits: { ...limits, ask: 1 } });
    const first = await signUp(alice);
    const second = await signUp(bob);
    const send = (token) =>
      request(limited)
        .post("/api/ask")
        .set("Authorization", `Bearer ${token}`)
        .send({ question: "x" });

    await send(first.token).expect(200);
    await send(first.token).expect(429);
    await send(second.token).expect(200);
  });
});

describe("HTTP behaviour", () => {
  it("answers bad JSON, oversized bodies and unknown routes with JSON", async () => {
    const malformed = await request(app)
      .post("/api/login")
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);
    const oversized = await request(app)
      .post("/api/login")
      .send({ email: "x".repeat(200000) })
      .expect(413);
    const missing = await request(app).get("/api/nope").expect(404);

    for (const response of [malformed, oversized, missing]) {
      assert.match(response.headers["content-type"], /json/);
      assert.doesNotMatch(JSON.stringify(response.body), /node_modules|SyntaxError/);
    }
  });

  it("sends security headers and hides Express", async () => {
    const { headers } = await request(app).get("/").expect(200);

    assert.equal(headers["x-powered-by"], undefined);
    assert.equal(headers["x-content-type-options"], "nosniff");
  });

  it("only allows configured browser origins", async () => {
    const preflight = (origin) =>
      request(app)
        .options("/api/login")
        .set("Origin", origin)
        .set("Access-Control-Request-Method", "POST");

    const allowed = await preflight("http://localhost:5173");
    const blocked = await preflight("https://evil.example");

    assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:5173");
    assert.equal(blocked.headers["access-control-allow-origin"], undefined);
  });

  it("reports database health", async () => {
    const { body } = await request(app).get("/api/health").expect(200);
    assert.deepEqual(body, { status: "ok", database: "connected" });
  });
});
