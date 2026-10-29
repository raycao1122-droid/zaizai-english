import { createClassroomServer } from "./classroom.mjs";
import { createVoiceGateway } from "./realtime/gateway.mjs";
const port = Number(process.env.PORT || process.env.CLASSROOM_API_PORT || 8787);
const host = process.env.CLASSROOM_HOST || "127.0.0.1";
if (
  (host === "0.0.0.0" || process.env.NODE_ENV === "production") &&
  (!process.env.ALLOWED_ORIGINS ||
    !process.env.CLASSROOM_ACCESS_CODE ||
    process.env.CLASSROOM_ACCESS_CODE.length < 16 ||
    process.env.CLASSROOM_ACCESS_CODE.length > 128)
) {
  throw new Error(
    "Public backend requires explicit ALLOWED_ORIGINS and CLASSROOM_ACCESS_CODE (at least 16 characters).",
  );
}
const origins = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim());
let gateway;
const server = createClassroomServer({
  origins,
  beforeRequest: (req, res) => gateway.handle(req, res),
});
gateway = createVoiceGateway(server);
server.listen(port, host, () =>
  console.log(
    `Classroom API listening on ${host}:${port}; credentials are never logged.`,
  ),
);
