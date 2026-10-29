// Operator-only tool. Never bundle this file in the classroom frontend.
// Uses the existing backend admin credential from this process environment.
const base =
  process.env.CLASSROOM_API_URL || "https://zaizai-classroom-api.onrender.com";
const code = process.env.CLASSROOM_ACCESS_CODE;
if (!code || code.length < 16)
  throw new Error(
    "Set CLASSROOM_ACCESS_CODE in the operator environment. Do not pass credentials as command arguments.",
  );
if (!base.startsWith("https://") && !base.startsWith("http://127.0.0.1:"))
  throw new Error("Operator endpoint requires HTTPS.");
const response = await fetch(base + "/api/admin/classroom-invites", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${code}`,
    "Content-Type": "application/json",
  },
  body: "{}",
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) {
  console.error(`Invitation creation failed: HTTP ${response.status}.`);
  process.exitCode = 1;
} else {
  const data = await response.json();
  console.log(
    JSON.stringify({
      classroomAccessLink: data.url,
      expiresInSeconds: data.expiresIn,
    }),
  );
}
