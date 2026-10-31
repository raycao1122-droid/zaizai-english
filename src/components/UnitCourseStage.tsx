import { useState } from "react";
import { BookOpen, Volume2 } from "lucide-react";
import {
  stageImage,
  unitLesson,
  unitTeaching,
  unitStages,
  unitAsset,
  type HintLevel,
} from "../data/unit1";
import type { UnitCourseState } from "../hooks/useUnitCourse";
import "./unit-course.css";
export function UnitCourseStage({
  unit,
  onStart,
  onTeach,
  voiceStatus,
}: {
  unit: UnitCourseState;
  onStart: () => void;
  onTeach: () => void;
  voiceStatus: string;
}) {
  const [showRecords, setShowRecords] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const id = unit.id!;
  const lesson = unitLesson(id);
  const plan = unitTeaching.lessons[id];
  const p = unit.progress;
  const image = stageImage(id, p.stage, p.scenario, p.hint);
  const hint =
    p.hint === "H1"
      ? plan.hint
      : p.hint === "H2"
        ? plan.stem
        : p.hint === "H3"
          ? plan.model
          : null;
  const checks = unitTeaching.checks.filter(
    (q) => id === "L4" || q.lessonId === id,
  );
  const records = unit.data.records.filter((r) => r.lessonId === id);
  const correct = checks.filter(
    (q) =>
      unit.data.checks.filter((c) => c.id === q.id).at(-1)?.answer === q.answer,
  ).length;
  const independent = records.filter(
    (r) =>
      r.source === "voice-asr" &&
      ["warmup", "mission"].includes(r.stageId) &&
      r.hintRequested === "H0" &&
      r.review.verified &&
      r.review.correct === "yes" &&
      r.review.hint === "H0",
  );
  const mastered = [
    "understanding",
    "name",
    "age",
    "friend",
    "initiative",
    "dialogue",
  ].filter(
    (skill) =>
      new Set(
        independent
          .filter((r) => r.review.ability === skill)
          .map((r) => r.scenarioId),
      ).size >= 2,
  );
  return (
    <section className="unit-activity" aria-label="Unit 1 真实教材课堂">
      <div className="unit-heading">
        <span>
          真实教材 · {id} · 学生书 p.{plan.pages.join(" / ")}
        </span>
        <a
          href={
            unitAsset("Zaizai_English_Unit1_StudentBook.pdf") +
            `#page=${plan.pages[0]}`
          }
          target="_blank"
          rel="noreferrer"
        >
          查看教材
        </a>
      </div>
      <h1>{lesson.title}</h1>
      <p>{plan.goal}</p>
      <div className="unit-actions">
        <button
          className="primary-button"
          onClick={onStart}
          disabled={!unit.paused}
        >
          {" "}
          {!unit.paused ? "学习中" : p.visited.length ? "继续学习" : "开始学习"}
        </button>
        <button
          className="soft-button"
          onClick={onTeach}
          disabled={unit.paused}
        >
          <Volume2 size={17} />请 Emma 开始本环节
        </button>
        <button
          className="soft-button"
          onClick={() => setShowChecks(!showChecks)}
          aria-expanded={showChecks}
        >
          知识检查
        </button>
        <button
          className="soft-button"
          onClick={() => setShowRecords(!showRecords)}
          aria-expanded={showRecords}
        >
          学习记录（{records.length}）
        </button>
      </div>
      <p className="unit-boundary">
        {voiceStatus} · 课程由你切换环节；AI 按教案交流。未接入自动口语评分。
      </p>
      <div className="unit-stage-tabs" aria-label="真实课程阶段">
        {unitStages.map((s, i) => (
          <button
            key={s}
            aria-current={p.stage === i ? "step" : undefined}
            disabled={unit.paused}
            onClick={() => unit.move(i)}
          >
            {i + 1}. {unitTeaching.stageLabels[s]}
          </button>
        ))}
      </div>
      <div className="unit-controls">
        <label>
          教学情境
          <select
            aria-label="教学情境"
            value={p.scenario}
            disabled={unit.paused}
            onChange={(e) =>
              unit.change({ scenario: e.target.value as "school" | "birthday" })
            }
          >
            <option value="school">学校见面</option>
            <option value="birthday">生日会</option>
          </select>
        </label>
        <label>
          显示的帮助
          <select
            aria-label="提示等级"
            value={p.hint}
            disabled={unit.paused}
            onChange={(e) => unit.change({ hint: e.target.value as HintLevel })}
          >
            <option value="H0">H0 不显示提示</option>
            <option value="H1">H1 图片/关键词</option>
            <option value="H2">H2 半句</option>
            <option value="H3">H3 完整示范</option>
          </select>
        </label>
      </div>
      {image ? (
        <figure className="unit-scene-image">
          <img
            src={unitAsset(image)}
            alt={`${lesson.title} · ${unitTeaching.stageLabels[unitStages[p.stage]]}教材情境图`}
          />
          <figcaption>教材原图含示范文字 · 不据此认定独立掌握</figcaption>
        </figure>
      ) : (
        <div className="unit-independent">
          <BookOpen size={25} />
          <strong>
            {p.stage === 3
              ? "独立迁移：先试着自己说"
              : unitTeaching.stageLabels[unitStages[p.stage]]}
          </strong>
          <p>答案与情境插画已隐藏，请听 Emma 提问。需要帮助时再打开提示。</p>
        </div>
      )}
      {hint && (
        <p className="unit-hint" role="note">
          {p.hint} 提示：{hint}
        </p>
      )}
      {p.stage === 4 && (
        <p>
          已记录本课回答 {records.length}{" "}
          条。尚未复核的口语不算正确；下一阶段不代表已经掌握。
        </p>
      )}
      <form
        className="unit-written"
        onSubmit={(e) => {
          e.preventDefault();
          unit.typed(plan.question);
        }}
      >
        <label>
          文字补充回答（单独记录，不计口语）：{plan.question}
          <input
            aria-label="教材文字回答"
            value={unit.draft}
            disabled={unit.paused}
            maxLength={1000}
            onChange={(e) => unit.setDraft(e.target.value)}
          />
        </label>
        <button
          className="soft-button"
          disabled={unit.paused || !unit.draft.trim()}
        >
          记录文字回答
        </button>
      </form>
      {showChecks && (
        <section className="unit-checks" aria-label="教材知识检查">
          <h2>教材知识检查</h2>
          <p>
            按 PDF
            第13页题目、第17页答案改编为选择题；结果仅代表本次点选，不是口语成绩。
          </p>
          {checks.map((q) => {
            const answer = unit.data.checks.filter((c) => c.id === q.id).at(-1);
            return (
              <fieldset key={q.id} disabled={unit.paused}>
                <legend>
                  {q.id}: {q.prompt}
                </legend>
                {q.options.map((a) => (
                  <button
                    type="button"
                    className="soft-button"
                    key={a}
                    aria-pressed={answer?.answer === a}
                    onClick={() => unit.check(q.id, a)}
                  >
                    {a}
                  </button>
                ))}
                {answer && (
                  <p role="status">
                    {answer.answer === q.answer
                      ? "本次选择正确"
                      : "本次选择需重试"}{" "}
                    · 原题 p.{q.page} / 答案 p.{q.answerPage}
                  </p>
                )}
              </fieldset>
            );
          })}
          <p>
            已作答{" "}
            {
              checks.filter((q) => unit.data.checks.some((c) => c.id === q.id))
                .length
            }
            /{checks.length}；最近一次正确 {correct} 题。未作答不算错误。
          </p>
        </section>
      )}
      {showRecords && (
        <section className="unit-records" aria-label="本机学习记录">
          <h2>真实操作与回答记录</h2>
          <p>
            {unit.storageError
              ? "本机保存失败，当前仅本页保留，请导出。"
              : "本机保存，未同步到云端。"}{" "}
            语音记录是模型转写，不是已核实的逐字录音。点击下一环节只记录访问进度。
          </p>
          <p>
            已人工复核、在两个情境均有 H0 正确证据的能力：
            {mastered.length
              ? mastered
                  .map(
                    (k) =>
                      (
                        ({
                          understanding: "听懂问题",
                          name: "姓名表达",
                          age: "年龄表达",
                          friend: "介绍朋友",
                          initiative: "主动提问",
                          dialogue: "迁移对话",
                        }) as Record<string, string>
                      )[k],
                  )
                  .join("、")
              : "暂无"}
            ；发音分：未实现。
          </p>
          <button className="soft-button" onClick={unit.exportRecords}>
            导出学习记录
          </button>
          <button
            className="soft-button"
            onClick={() => {
              if (
                window.confirm(
                  "清除此课本机回答、检查和进度？此操作不能撤销，可先导出。",
                )
              )
                unit.clear();
            }}
          >
            清除此课本机记录
          </button>
          {records.length === 0 && <p>尚无真实回答，不生成示例记录。</p>}
          {records
            .slice()
            .reverse()
            .map((r) => (
              <article key={r.id}>
                <strong>
                  {r.source === "voice-asr"
                    ? r.review.verified
                      ? "语音转写 · 已人工核对"
                      : "语音转写 · 待核对"
                    : "文字输入 · 非口语"}{" "}
                  · {unitTeaching.stageLabels[r.stageId]} ·{" "}
                  {r.scenarioId === "school" ? "学校" : "生日会"}
                </strong>
                <small>{new Date(r.at).toLocaleString()}</small>
                <p>对应问题：{r.question || "未捕获完整教师问题"}</p>
                <blockquote>{r.answer}</blockquote>
                <label>
                  人工正确性
                  <select
                    aria-label={`复核正确性 ${r.id}`}
                    value={r.review.correct}
                    onChange={(e) =>
                      unit.review(r.id, {
                        correct: e.target.value as "yes" | "no" | "pending",
                      })
                    }
                  >
                    <option value="pending">待复核</option>
                    <option value="yes">人工确认正确</option>
                    <option value="no">人工确认需重试</option>
                  </select>
                </label>
                <label>
                  实际帮助
                  <select
                    aria-label={`复核提示 ${r.id}`}
                    value={r.review.hint}
                    onChange={(e) =>
                      unit.review(r.id, {
                        hint: e.target.value as HintLevel | "unknown",
                      })
                    }
                  >
                    <option value="unknown">尚未确认</option>
                    {["H0", "H1", "H2", "H3"].map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
                <label>
                  能力
                  <select
                    aria-label={`复核能力 ${r.id}`}
                    value={r.review.ability}
                    onChange={(e) =>
                      unit.review(r.id, { ability: e.target.value })
                    }
                  >
                    {[
                      ["unassigned", "请选择能力"],
                      ["understanding", "听懂问题"],
                      ["name", "姓名表达"],
                      ["age", "年龄表达"],
                      ["friend", "介绍朋友"],
                      ["initiative", "主动提问"],
                      ["dialogue", "迁移对话"],
                    ].map(([k, t]) => (
                      <option value={k} key={k}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={r.review.verified}
                    disabled={r.source !== "voice-asr"}
                    onChange={(e) =>
                      unit.review(r.id, { verified: e.target.checked })
                    }
                  />
                  已听取实际回答并核对转写与提示情况（人工复核）
                </label>
              </article>
            ))}
        </section>
      )}
    </section>
  );
}
