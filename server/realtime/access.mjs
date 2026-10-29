import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const COOKIE = "__Host-zaizai_classroom";
const WEEK = 7 * 86400000;
export function createClassroomAccess(secret) {
  const invitations = new Map();
  const equal = (a, b) => {
    const x = Buffer.from(a),
      y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  function issueInvite(now = Date.now()) {
    for (const [key, value] of invitations)
      if (value < now) invitations.delete(key);
    if (invitations.size >= 20) throw new Error("Too many pending invitations");
    const grant = randomBytes(32).toString("base64url");
    invitations.set(grant, now + 10 * 60000);
    return grant;
  }
  function consume(grant, now = Date.now()) {
    if (typeof grant !== "string" || !(invitations.get(grant) > now))
      return null;
    invitations.delete(grant);
    const data = { id: randomBytes(16).toString("hex"), expires: now + WEEK };
    const body = Buffer.from(JSON.stringify(data)).toString("base64url");
    const mac = createHmac("sha256", secret).update(body).digest("base64url");
    return {
      cookie: `${COOKIE}=${body}.${mac}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=604800`,
      data,
    };
  }
  function verify(header, now = Date.now()) {
    const value = (header || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1);
    if (!value || value.length > 512) return null;
    const [body, mac, ...extra] = value.split(".");
    if (!body || !mac || extra.length) return null;
    const expected = createHmac("sha256", secret)
      .update(body)
      .digest("base64url");
    if (!equal(mac, expected)) return null;
    try {
      const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      return /^[a-f0-9]{32}$/.test(data.id) &&
        Number.isSafeInteger(data.expires) &&
        data.expires > now &&
        data.expires <= now + WEEK
        ? data
        : null;
    } catch {
      return null;
    }
  }
  return { issueInvite, consume, verify };
}
