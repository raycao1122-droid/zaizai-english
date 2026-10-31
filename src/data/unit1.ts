import course from "../../curriculum/unit1/course.json";
import teaching from "../../curriculum/unit1/teaching.json";
export type UnitLessonId = keyof typeof teaching.lessons;
export const unitStages = [
  "warmup",
  "context",
  "practice",
  "mission",
  "wrap",
] as const;
export type UnitStageId = (typeof unitStages)[number];
export type HintLevel = "H0" | "H1" | "H2" | "H3";
export const unitCourse = course;
export const unitTeaching = teaching;
export const isUnitLesson = (id: unknown): id is UnitLessonId =>
  typeof id === "string" && Object.hasOwn(teaching.lessons, id);
export const unitLesson = (id: UnitLessonId) =>
  course.lessons.find((l) => l.id === id)!;
export function stageImage(
  id: UnitLessonId,
  stage: number,
  scenario: string,
  hint: HintLevel,
) {
  if (stage === 1 || (stage === 2 && hint === "H3"))
    return unitLesson(id).sceneImage;
  if (stage === 3 && hint === "H1" && scenario === "school")
    return "assets/school_welcome.png";
  if (stage === 3 && hint === "H3")
    return scenario === "birthday"
      ? "assets/birthday.png"
      : "assets/school_welcome.png";
  return null; // Embedded answer bubbles must not contaminate an independent task.
}
export const unitAsset = (path: string) =>
  `${import.meta.env.BASE_URL}assets/curriculum/unit1/${path.replace(/^assets\//, "")}`;
export type UnitEvidenceContext = {
  lessonId: UnitLessonId;
  stageId: UnitStageId;
  scenarioId: "school" | "birthday";
  hintRequested: HintLevel;
  question: string;
  taskId: string;
};
