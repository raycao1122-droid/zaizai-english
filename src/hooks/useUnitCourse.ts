import { useEffect, useState } from "react";
import {
  isUnitLesson,
  unitStages,
  unitTeaching,
  type UnitLessonId,
  type HintLevel,
  type UnitEvidenceContext,
} from "../data/unit1";
import type { Message } from "../data/mockLesson";
export const UNIT_RECORD_KEY = "zaizai.unit1.records.v1";
type Review = {
  correct: "pending" | "yes" | "no";
  hint: HintLevel | "unknown";
  ability: string;
  verified: boolean;
};
export type UnitRecord = UnitEvidenceContext & {
  id: string;
  answer: string;
  at: string;
  source: "voice-asr" | "typed";
  review: Review;
};
type Progress = {
  stage: number;
  scenario: "school" | "birthday";
  hint: HintLevel;
  visited: number[];
};
type Check = { id: string; answer: string; at: string };
type Data = {
  version: 1;
  selected: UnitLessonId | null;
  progress: Partial<Record<UnitLessonId, Progress>>;
  records: UnitRecord[];
  checks: Check[];
};
const empty = (): Data => ({
  version: 1,
  selected: null,
  progress: {},
  records: [],
  checks: [],
});
const fresh = (): Progress => ({
  stage: 0,
  scenario: "school",
  hint: "H0",
  visited: [],
});
function load(): Data {
  try {
    const d = JSON.parse(localStorage.getItem(UNIT_RECORD_KEY) || "null");
    if (d?.version !== 1) return empty();
    const value = empty();
    value.selected = isUnitLesson(d.selected) ? d.selected : null;
    for (const id of ["L1", "L2", "L3", "L4"] as UnitLessonId[]) {
      const p = d.progress?.[id];
      if (
        p &&
        Number.isInteger(p.stage) &&
        p.stage >= 0 &&
        p.stage < 5 &&
        ["school", "birthday"].includes(p.scenario) &&
        ["H0", "H1", "H2", "H3"].includes(p.hint)
      )
        value.progress[id] = {
          ...fresh(),
          ...p,
          visited: Array.isArray(p.visited)
            ? p.visited.filter(
                (n: number) => Number.isInteger(n) && n >= 0 && n < 5,
              )
            : [],
        };
    }
    value.records = Array.isArray(d.records)
      ? d.records
          .filter(
            (r: UnitRecord) =>
              r &&
              isUnitLesson(r.lessonId) &&
              unitStages.includes(r.stageId) &&
              ["school", "birthday"].includes(r.scenarioId) &&
              typeof r.id === "string" &&
              typeof r.answer === "string" &&
              r.answer.length <= 4000 &&
              typeof r.question === "string" &&
              r.review &&
              ["voice-asr", "typed"].includes(r.source),
          )
          .slice(-1000)
      : [];
    value.checks = Array.isArray(d.checks)
      ? d.checks
          .filter((c: Check) =>
            unitTeaching.checks.some(
              (q) => q.id === c.id && q.options.includes(c.answer),
            ),
          )
          .slice(-200)
      : [];
    return value;
  } catch {
    return empty();
  }
}
export function useUnitCourse() {
  const [data, setData] = useState<Data>(load);
  const [paused, setPaused] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(UNIT_RECORD_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  const id = data.selected;
  const progress = id ? data.progress[id] || fresh() : fresh();
  function select(lesson: UnitLessonId | null) {
    setPaused(true);
    setMessages([]);
    setDraft("");
    setData((d) => ({ ...d, selected: lesson }));
  }
  function change(patch: Partial<Progress>) {
    if (!id || paused) return;
    setData((d) => ({
      ...d,
      progress: {
        ...d.progress,
        [id]: { ...(d.progress[id] || fresh()), ...patch },
      },
    }));
  }
  function start() {
    if (!id) return;
    setPaused(false);
    setData((d) => {
      const p = d.progress[id] || fresh();
      return {
        ...d,
        progress: {
          ...d.progress,
          [id]: { ...p, visited: [...new Set([...p.visited, p.stage])] },
        },
      };
    });
  }
  function move(stage: number) {
    if (!id || paused) return;
    const next = Math.max(0, Math.min(4, stage));
    const hint: HintLevel = next === 1 ? "H3" : next === 2 ? "H1" : "H0";
    change({
      stage: next,
      hint,
      visited: [...new Set([...progress.visited, next])],
    });
  }
  function message(m: { id: string; speaker: "Emma" | "在在"; text: string }) {
    setMessages((list) => {
      const old = list.findIndex((x) => x.id === m.id);
      const entry = { ...m, source: "voice" as const };
      return old >= 0
        ? list.map((v, i) => (i === old ? entry : v))
        : [...list, entry].slice(-60);
    });
  }
  function record(
    answer: string,
    source: UnitRecord["source"],
    key: string,
    evidence?: UnitEvidenceContext,
  ) {
    if (!id || paused || !answer.trim()) return;
    const ctx = evidence || {
      lessonId: id,
      stageId: unitStages[progress.stage],
      scenarioId: progress.scenario,
      hintRequested: progress.hint,
      question: unitTeaching.lessons[id].question,
      taskId: `${id}-${unitStages[progress.stage]}`,
    };
    if (!isUnitLesson(ctx.lessonId)) return;
    setData((d) => ({
      ...d,
      records: [
        ...d.records.filter((r) => r.id !== key),
        {
          ...ctx,
          id: key,
          answer: answer.slice(0, 4000),
          at: new Date().toISOString(),
          source,
          review: d.records.find((r) => r.id === key && r.answer === answer)
            ?.review || {
            correct: "pending",
            hint: "unknown",
            ability: "unassigned",
            verified: false,
          },
        },
      ].slice(-1000),
    }));
  }
  function typed(question: string) {
    if (!id || paused || !draft.trim()) return;
    const key = crypto.randomUUID();
    record(draft, "typed", key, {
      lessonId: id,
      stageId: unitStages[progress.stage],
      scenarioId: progress.scenario,
      hintRequested: progress.hint,
      question,
      taskId: `${id}-${unitStages[progress.stage]}`,
    });
    setDraft("");
  }
  function check(qid: string, answer: string) {
    if (paused) return;
    const q = unitTeaching.checks.find((q) => q.id === qid);
    if (!q || !q.options.includes(answer)) return;
    setData((d) => ({
      ...d,
      checks: [
        ...d.checks,
        { id: qid, answer, at: new Date().toISOString() },
      ].slice(-200),
    }));
  }
  function review(key: string, patch: Partial<Review>) {
    setData((d) => ({
      ...d,
      records: d.records.map((r) =>
        r.id === key ? { ...r, review: { ...r.review, ...patch } } : r,
      ),
    }));
  }
  function restart() {
    if (id)
      setData((d) => ({ ...d, progress: { ...d.progress, [id]: fresh() } }));
    setPaused(true);
    setMessages([]);
  }
  function clear() {
    if (id)
      setData((d) => ({
        ...d,
        records: d.records.filter((r) => r.lessonId !== id),
        checks: d.checks.filter(
          (c) =>
            unitTeaching.checks.find((q) => q.id === c.id)?.lessonId !== id,
        ),
        progress: { ...d.progress, [id]: fresh() },
      }));
    setPaused(true);
    setMessages([]);
  }
  function exportRecords() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zaizai-unit1-learning-records.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {
    data,
    id,
    progress,
    paused,
    setPaused,
    select,
    start,
    move,
    change,
    messages,
    message,
    record,
    typed,
    draft,
    setDraft,
    check,
    review,
    clear,
    restart,
    exportRecords,
    storageError,
  };
}
export type UnitCourseState = ReturnType<typeof useUnitCourse>;
