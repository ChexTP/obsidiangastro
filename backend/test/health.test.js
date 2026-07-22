import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { default: app } = await import("../src/app.js");
const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, "127.0.0.1", () => resolve(server));
});

test("GET /api/health devuelve el estado del servicio", async () => {
  const server = await startServer();
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "restaurant-saas-backend");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/auth/me exige token", async () => {
  const server = await startServer();
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/me`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.message, "Token requerido");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/auth/register valida los datos", async () => {
  const server = await startServer();
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "correo-invalido", password: "123" }),
    });
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
