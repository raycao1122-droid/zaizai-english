import { test } from "node:test";
import assert from "node:assert/strict";
import { createClassroomAccess } from "./access.mjs";
test("admin invitations are short-lived and single-use", () => {
  const a = createClassroomAccess("server-only-secret");
  const grant = a.issueInvite(1000);
  assert(a.consume(grant, 2000));
  assert.equal(a.consume(grant, 2001), null);
  assert.equal(a.consume(a.issueInvite(1000), 601001), null);
});
test("device authorization survives restarts using HttpOnly signed cookies and rejects tampering or key rotation", () => {
  const a = createClassroomAccess("server-only-secret"),
    b = createClassroomAccess("server-only-secret");
  const device = a.consume(a.issueInvite(1000), 2000);
  const header = device.cookie.split(";")[0];
  assert.match(device.cookie, /HttpOnly; Secure; SameSite=None; Partitioned/);
  assert(b.verify(header, 3000));
  assert.equal(
    createClassroomAccess("rotated-secret").verify(header, 3000),
    null,
  );
  assert.equal(b.verify(header.slice(0, -1) + "X", 3000), null);
  assert.equal(b.verify(header, 2000 + 7 * 86400000), null);
});
