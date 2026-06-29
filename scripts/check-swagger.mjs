import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}`;

const server = spawn("node", ["index.js"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  let ready = false;
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      await wait(1000);
    }
  }

  if (!ready) {
    throw new Error("Server did not start");
  }

  const docsResponse = await fetch(`${baseUrl}/api-docs`);
  const docsHtml = await docsResponse.text();
  console.log(`api-docs:${docsResponse.status}:${docsHtml.includes("Swagger UI")}`);

  const specResponse = await fetch(`${baseUrl}/api-docs.json`);
  const spec = await specResponse.json();
  console.log(`api-docs-json:${specResponse.status}:${Object.keys(spec.paths || {}).length}:${Boolean(spec.components?.securitySchemes?.bearerAuth)}`);

  if (docsResponse.status !== 200 || !docsHtml.includes("Swagger UI")) {
    throw new Error("/api-docs did not load Swagger UI");
  }

  if (specResponse.status !== 200 || !spec.components?.securitySchemes?.bearerAuth) {
    throw new Error("/api-docs.json did not expose bearerAuth");
  }
} finally {
  server.kill();
}
