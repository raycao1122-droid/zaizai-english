import { createClassroomServer } from "./classroom.mjs";
const port = Number(process.env.CLASSROOM_API_PORT || 8787);
createClassroomServer().listen(port, "127.0.0.1", () =>
  console.log(
    `Classroom text API listening on loopback port ${port}; key ${process.env.OPENAI_API_KEY ? "configured" : "not configured"}.`,
  ),
);
