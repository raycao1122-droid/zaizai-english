import course from "../../curriculum/unit1/course.json" with { type: "json" };
import teaching from "../../curriculum/unit1/teaching.json" with { type: "json" };
import { readFileSync } from "node:fs";
const guide = readFileSync(
  new URL("../../curriculum/unit1/teacher-guide.md", import.meta.url),
  "utf8",
);
export function resolveUnit1(input) {
  if (!input) return null;
  const lesson = course.lessons.find((l) => l.id === input.lessonId);
  const stage = lesson?.stages.find((s) => s.id === input.stageId);
  if (
    !lesson ||
    !stage ||
    !["school", "birthday"].includes(input.scenarioId) ||
    !["H0", "H1", "H2", "H3"].includes(input.hintLevel)
  )
    throw Error("Unknown curriculum selection");
  const plan = teaching.lessons[lesson.id];
  const section = guide
    .split(`## Lesson ${lesson.id.slice(1)} — `)[1]
    ?.split("\n## ")[0];
  return {
    source: "unit1-reviewed-package",
    courseId: course.courseId,
    unitId: course.unitId,
    lessonId: lesson.id,
    title: lesson.title,
    stageId: stage.id,
    stageLabel: teaching.stageLabels[stage.id],
    scenarioId: input.scenarioId,
    hintRequested: input.hintLevel,
    taskId: `${lesson.id}-${stage.id}`,
    goal: plan.goal,
    vocabulary: lesson.vocabulary,
    coreExpressions: lesson.coreExpressions,
    stagePlan: plan.stages[lesson.stages.indexOf(stage)],
    mission: plan.mission,
    teacherGuide: section,
    pages: plan.pages,
    sourceDocument: course.studentBook,
    assessment:
      "Only actual written choices are automatically checked. Oral ASR transcripts require human verification; do not invent scores, correctness or mastery.",
  };
}
export function evidenceFor(context, question) {
  const unit = context?.curriculum;
  return unit
    ? {
        lessonId: unit.lessonId,
        stageId: unit.stageId,
        scenarioId: unit.scenarioId,
        hintRequested: unit.hintRequested,
        taskId: unit.taskId,
        question: String(question || "").slice(0, 1000),
      }
    : undefined;
}
