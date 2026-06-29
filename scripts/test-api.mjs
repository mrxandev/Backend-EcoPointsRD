import bcrypt from "bcryptjs";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { pool } from "../src/db/connection.js";
import { initDatabase } from "../src/db/initDatabase.js";

const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}`;
const stamp = Date.now().toString().slice(-8);
const adminEmail = `admin.test.${stamp}@ecopointsrd.test`;
const userEmail = `user.test.${stamp}@ecopointsrd.test`;
const auditorEmail = `auditor.test.${stamp}@ecopointsrd.test`;
const adminPassword = "AdminTest123";
const userPassword = "UserTest123";
const auditorPassword = "AuditorTest123";

const results = [];

const record = (name, ok, details = "") => {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${details ? ` - ${details}` : ""}`);
};

const request = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, json };
};

const expectStatus = async (name, method, path, expected, options) => {
  const response = await request(method, path, options);
  const ok = Array.isArray(expected) ? expected.includes(response.status) : response.status === expected;
  record(name, ok, `${method} ${path} -> ${response.status}`);
  if (!ok) {
    console.log(JSON.stringify(response.json, null, 2));
    throw new Error(`${name} failed`);
  }
  return response.json;
};

const seedAdmin = async () => {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await pool.query(
    `INSERT INTO users (cedula, first_name, last_name, email, password, role, status, is_verified)
     VALUES ($1, 'Admin', 'Test', $2, $3, 'ADMIN', 'ACTIVE', true)
     ON CONFLICT (email)
     DO UPDATE SET password = EXCLUDED.password, role = 'ADMIN', status = 'ACTIVE'`,
    [`9${stamp.padStart(10, "0")}`.slice(0, 11), adminEmail, hashedPassword]
  );
};

const startServer = async () => {
  const child = spawn("node", ["index.js"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        return child;
      }
    } catch {
      await wait(1000);
    }
  }

  child.kill();
  throw new Error("Server did not start");
};

let server;

try {
  await initDatabase();
  await seedAdmin();
  server = await startServer();

  await expectStatus("Root health", "GET", "/", 200);

  const adminLogin = await expectStatus("Admin login", "POST", "/api/auth/login", 200, {
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = adminLogin.data.token;

  const registerUser = await expectStatus("Register user", "POST", "/api/auth/register", 201, {
    body: {
      cedula: `1${stamp.padStart(10, "0")}`.slice(0, 11),
      first_name: "User",
      last_name: "Test",
      email: userEmail,
      password: userPassword,
      phone: "8090000000",
      province: "Santo Domingo",
      municipality: "Distrito Nacional",
    },
  });
  const userId = registerUser.data.user.id;

  const duplicateUser = await request("POST", "/api/auth/register", {
    body: {
      cedula: `1${stamp.padStart(10, "0")}`.slice(0, 11),
      first_name: "User",
      last_name: "Duplicate",
      email: userEmail,
      password: userPassword,
    },
  });
  record("Duplicate register rejected", duplicateUser.status === 409, `POST /api/auth/register -> ${duplicateUser.status}`);

  const userLogin = await expectStatus("User login", "POST", "/api/auth/login", 200, {
    body: { email: userEmail, password: userPassword },
  });
  const userToken = userLogin.data.token;

  await expectStatus("Auth me", "GET", "/api/auth/me", 200, { token: userToken });
  await expectStatus("Users me", "GET", "/api/users/me", 200, { token: userToken });
  await expectStatus("Update users me", "PUT", "/api/users/me", 200, {
    token: userToken,
    body: { phone: "8091112222", address: "Direccion de prueba" },
  });
  await expectStatus("Users points", "GET", "/api/users/me/points", 200, { token: userToken });
  await expectStatus("Users transactions", "GET", "/api/users/me/transactions", 200, { token: userToken });

  await expectStatus("Admin create auditor", "POST", "/api/admin/users", 201, {
    token: adminToken,
    body: {
      cedula: `2${stamp.padStart(10, "0")}`.slice(0, 11),
      first_name: "Auditor",
      last_name: "Test",
      email: auditorEmail,
      password: auditorPassword,
      role: "AUDITOR",
    },
  });
  const auditorLogin = await expectStatus("Auditor login", "POST", "/api/auth/login", 200, {
    body: { email: auditorEmail, password: auditorPassword },
  });
  const auditorToken = auditorLogin.data.token;

  await expectStatus("Admin list users", "GET", "/api/admin/users", 200, { token: adminToken });
  await expectStatus("Admin user detail", "GET", `/api/admin/users/${userId}`, 200, { token: adminToken });
  await expectStatus("Admin update user", "PUT", `/api/admin/users/${userId}`, 200, {
    token: adminToken,
    body: { municipality: "Santo Domingo Este" },
  });

  const organization = await expectStatus("Admin create organization", "POST", "/api/admin/organizations", 201, {
    token: adminToken,
    body: {
      name: `Organizacion Test ${stamp}`,
      description: "Organizacion de prueba",
      organization_type: "ONG",
      province: "Santo Domingo",
      municipality: "Distrito Nacional",
    },
  });
  const organizationId = organization.data.organization.id;
  await expectStatus("Public organizations", "GET", "/api/organizations", 200);
  await expectStatus("Organization detail", "GET", `/api/organizations/${organizationId}`, 200);
  await expectStatus("Assign organization user", "POST", `/api/admin/organizations/${organizationId}/users`, 201, {
    token: adminToken,
    body: { user_id: userId, position: "Voluntario" },
  });

  const mission = await expectStatus("Admin create mission", "POST", "/api/admin/missions", 201, {
    token: adminToken,
    body: {
      title: `Mision Test ${stamp}`,
      description: "Mision de prueba",
      mission_type: "CLEANUP",
      points_reward: 50,
      province: "Santo Domingo",
      municipality: "Distrito Nacional",
      organization_id: organizationId,
      requires_evidence: true,
      requires_qr_validation: true,
    },
  });
  const missionId = mission.data.mission.id;
  await expectStatus("Publish mission", "PATCH", `/api/admin/missions/${missionId}/publish`, 200, { token: adminToken });
  await expectStatus("Public missions", "GET", "/api/missions", 200);
  await expectStatus("Mission detail", "GET", `/api/missions/${missionId}`, 200, { token: userToken });
  await expectStatus("Register mission", "POST", `/api/missions/${missionId}/register`, 201, { token: userToken });
  const duplicateRegistration = await request("POST", `/api/missions/${missionId}/register`, { token: userToken });
  record("Duplicate mission registration rejected", duplicateRegistration.status === 409, `POST /api/missions/:id/register -> ${duplicateRegistration.status}`);
  await expectStatus("My mission registrations", "GET", "/api/missions/my/registrations", 200, { token: userToken });
  await expectStatus("Upload evidence", "POST", `/api/missions/${missionId}/evidences`, 201, {
    token: userToken,
    body: { file_url: "https://example.com/evidence.jpg", description: "Evidencia de prueba" },
  });
  const evidences = await expectStatus("Admin list evidences", "GET", "/api/admin/evidences", 200, { token: adminToken });
  const evidenceId = evidences.data.evidences.find((item) => item.mission_id === missionId)?.id;
  if (evidenceId) {
    await expectStatus("Approve evidence", "PATCH", `/api/admin/evidences/${evidenceId}/approve`, 200, { token: adminToken });
  }

  const qr = await expectStatus("Generate QR", "POST", "/api/qr/generate", 201, { token: userToken });
  await expectStatus("Validate QR", "POST", "/api/qr/validate", 200, {
    token: auditorToken,
    body: { token: qr.data.token },
  });
  await expectStatus("Validate mission participation", "POST", `/api/missions/${missionId}/validate`, 201, {
    token: auditorToken,
    body: { user_id: userId, qr_token: qr.data.token, notes: "Participacion correcta" },
  });
  const duplicateValidation = await request("POST", `/api/missions/${missionId}/validate`, {
    token: auditorToken,
    body: { user_id: userId, qr_token: qr.data.token, notes: "Duplicado" },
  });
  record("Duplicate mission validation rejected", duplicateValidation.status === 400 || duplicateValidation.status === 409, `POST /api/missions/:id/validate -> ${duplicateValidation.status}`);

  await expectStatus("Points balance", "GET", "/api/points/balance", 200, { token: userToken });
  await expectStatus("Points transactions", "GET", "/api/points/transactions", 200, { token: userToken });
  await expectStatus("Points ranking", "GET", "/api/points/ranking", 200);
  await expectStatus("Admin adjust points", "POST", "/api/admin/points/adjust", 201, {
    token: adminToken,
    body: { user_id: userId, points: 100, transaction_type: "BONUS", description: "Bono de prueba" },
  });
  await expectStatus("Admin point transactions", "GET", "/api/admin/points/transactions", 200, { token: adminToken });

  const reward = await expectStatus("Admin create reward", "POST", "/api/admin/rewards", 201, {
    token: adminToken,
    body: {
      title: `Reward Test ${stamp}`,
      description: "Recompensa de prueba",
      points_required: 20,
      stock: 5,
      sponsor_id: organizationId,
    },
  });
  const rewardId = reward.data.reward.id;
  await expectStatus("List rewards", "GET", "/api/rewards", 200);
  await expectStatus("Reward detail", "GET", `/api/rewards/${rewardId}`, 200);
  await expectStatus("Redeem reward", "POST", `/api/rewards/${rewardId}/redeem`, 201, { token: userToken });
  await expectStatus("My redemptions", "GET", "/api/rewards/my/redemptions", 200, { token: userToken });
  await expectStatus("Admin redemptions", "GET", "/api/admin/redemptions", 200, { token: adminToken });

  const center = await expectStatus("Admin create recycling center", "POST", "/api/admin/recycling/centers", 201, {
    token: adminToken,
    body: {
      name: `Centro Test ${stamp}`,
      province: "Santo Domingo",
      municipality: "Distrito Nacional",
      address: "Direccion centro",
    },
  });
  const centerId = center.data.center.id;
  await expectStatus("List recycling centers", "GET", "/api/recycling/centers", 200);
  await expectStatus("Recycling center detail", "GET", `/api/recycling/centers/${centerId}`, 200);
  await expectStatus("Admin create recycling log", "POST", "/api/admin/recycling/logs", 201, {
    token: auditorToken,
    body: { user_id: userId, center_id: centerId, material_type: "PLASTIC", weight_kg: 2.5, points_awarded: 25 },
  });
  await expectStatus("Admin recycling logs", "GET", "/api/admin/recycling/logs", 200, { token: adminToken });

  await expectStatus("Notifications", "GET", "/api/notifications", 200, { token: userToken });
  await expectStatus("Admin notify user", "POST", "/api/admin/notifications/user", 201, {
    token: adminToken,
    body: { user_id: userId, title: "Test", message: "Mensaje de prueba", type: "SYSTEM" },
  });
  await expectStatus("Admin notify global", "POST", "/api/admin/notifications/global", 201, {
    token: adminToken,
    body: { title: "Global Test", message: "Mensaje global", type: "SYSTEM" },
  });

  await expectStatus("Dashboard summary", "GET", "/api/admin/dashboard/summary", 200, { token: adminToken });
  await expectStatus("Dashboard users", "GET", "/api/admin/dashboard/users", 200, { token: adminToken });
  await expectStatus("Dashboard missions", "GET", "/api/admin/dashboard/missions", 200, { token: adminToken });
  await expectStatus("Dashboard points", "GET", "/api/admin/dashboard/points", 200, { token: adminToken });
  await expectStatus("Dashboard rewards", "GET", "/api/admin/dashboard/rewards", 200, { token: adminToken });
  await expectStatus("Admin logs", "GET", "/api/admin/logs", 200, { token: adminToken });
} finally {
  if (server) {
    server.kill();
  }
  await pool.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
