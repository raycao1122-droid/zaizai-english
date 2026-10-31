import type { ReactNode } from "react";
import { ChevronDown, ListTree, PanelRightOpen } from "lucide-react";
import { mockLesson } from "../data/mockLesson";
import { lessonSteps } from "../data/lessonFlow";
import { assetUrl } from "../lib/assets";

export function LessonStage({
  unit,
  index,
  panelCollapsed,
  onDirectory,
  onExpand,
  children,
}: {
  unit?: { title: string; stageLabel: string; stage: number };
  index: number;
  panelCollapsed: boolean;
  onDirectory: () => void;
  onExpand: () => void;
  children: ReactNode;
}) {
  const step = lessonSteps[index];
  const isReport = !unit && index >= 9;
  const isExercise = step.id === "listening" || step.id === "review";
  return (
    <section
      className={`lesson-panel stage-${step.id}`}
      aria-label={unit ? "Zaizai English 第一单元课堂" : "英语动物课堂"}
      id="classroom"
    >
      <div className="lesson-toolbar">
        <button className="unit-selector" onClick={onDirectory}>
          {unit ? "Unit 1" : mockLesson.unit}
          <span>{unit ? unit.title : mockLesson.name}</span>
          <ChevronDown size={18} />
        </button>
        <div className="lesson-progress">
          <span>
            {unit ? unit.stage + 1 : index + 1}/{unit ? 5 : lessonSteps.length}{" "}
            <b>{unit ? unit.stageLabel : step.title}</b>
          </span>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="课程进度"
            aria-valuemin={0}
            aria-valuemax={unit ? 5 : lessonSteps.length}
            aria-valuenow={unit ? unit.stage + 1 : index + 1}
          >
            <i
              style={{
                width: `${unit ? ((unit.stage + 1) / 5) * 100 : ((index + 1) / lessonSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <button
          className="directory-button"
          aria-label="课程目录"
          onClick={onDirectory}
        >
          <ListTree size={17} />
          <span>课程目录</span>
        </button>
        {panelCollapsed && (
          <button
            className="icon-button expand-panel"
            aria-label="展开辅助面板"
            onClick={onExpand}
          >
            <PanelRightOpen size={22} />
          </button>
        )}
      </div>
      <div
        className={`lesson-scene ${isExercise ? "exercise-scene" : "activity-scene"} ${isReport ? "report-scene" : ""}`}
      >
        {!isReport && (
          <div className="garden-fragments" aria-hidden="true">
            {["left", "right", "canopy", "grass"].map((fragment) => (
              <img
                className={`garden-${fragment}`}
                src={assetUrl(`garden-${fragment}.svg`)}
                alt=""
                key={fragment}
              />
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
