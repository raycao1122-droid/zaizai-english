import {
  ChevronDown,
  ListTree,
  Lightbulb,
  Volume2,
  CheckCircle2,
  RotateCcw,
  PanelRightOpen,
} from "lucide-react";
import { animals, mockLesson, type AnimalId } from "../data/mockLesson";
import { InteractiveMaterial } from "./InteractiveMaterial";

export function LessonStage({
  step,
  selected,
  hint,
  panelCollapsed,
  disabled,
  onSelect,
  onHint,
  onAudio,
  onDirectory,
  onExpand,
}: {
  step: number;
  selected: AnimalId | null;
  hint: boolean;
  panelCollapsed: boolean;
  disabled: boolean;
  onSelect: (id: AnimalId) => void;
  onHint: () => void;
  onAudio: () => void;
  onDirectory: () => void;
  onExpand: () => void;
}) {
  const target = mockLesson.steps[step].target;
  const animal = animals.find((a) => a.id === target)!;
  return (
    <section className="lesson-panel" aria-label="英语动物课堂" id="classroom">
      <div className="lesson-toolbar">
        <button className="unit-selector" onClick={onDirectory}>
          {mockLesson.unit}
          <span>{mockLesson.name}</span>
          <ChevronDown size={18} />
        </button>
        <div className="lesson-progress">
          <span>
            {step + 1}/5 <b>{mockLesson.steps[step].title}</b>
          </span>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="课程进度"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={step + 1}
          >
            <i style={{ width: `${(step + 1) * 20}%` }} />
          </div>
        </div>
        <button className="directory-button" onClick={onDirectory}>
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
      <div className="lesson-scene">
        <div className="garden-fragments" aria-hidden="true">
          <img className="garden-left" src="/assets/garden-left.svg" alt="" />
          <img className="garden-right" src="/assets/garden-right.svg" alt="" />
          <img
            className="garden-canopy"
            src="/assets/garden-canopy.svg"
            alt=""
          />
          <img className="garden-grass" src="/assets/garden-grass.svg" alt="" />
        </div>
        <div className="scene-topline">
          <span className="lesson-tag">Look and Say</span>
          <span className="activity-description">看一看，说一说</span>
          <span className="demo-badge">模拟课堂</span>
        </div>
        <div className="question-line">
          <h1>Can you find the {target}?</h1>
          <button
            className="audio-button"
            aria-label="模拟播放课堂提问"
            onClick={onAudio}
          >
            <Volume2 size={26} />
          </button>
        </div>
        <div className="help-line">
          <div className="question-translation">
            {hint
              ? `你能找到${animal.chinese}吗？`
              : "Listen, look, and choose."}
          </div>
          <button
            className={`hint-button ${hint ? "on" : ""}`}
            onClick={onHint}
            aria-expanded={hint}
          >
            <Lightbulb size={21} fill="#ffda73" color="#eebd43" />
            {hint ? "收起提示" : "提示我一下"}
          </button>
        </div>
        <div className="feedback-space" aria-live="polite">
          {selected ? (
            <div
              className={`feedback ${selected === target ? "success" : "retry"}`}
            >
              {selected === target ? (
                <CheckCircle2 size={20} />
              ) : (
                <RotateCcw size={19} />
              )}
              <span>
                {selected === target
                  ? `Great! That’s right. It’s a ${target}!`
                  : "Not quite. Look carefully and try again."}
              </span>
            </div>
          ) : hint ? (
            <div className="hint-text">{animal.hint}</div>
          ) : (
            <span className="choose-note">点击动物图片，和 Emma 一起练习</span>
          )}
        </div>
        <InteractiveMaterial
          selected={selected}
          target={target}
          disabled={disabled}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}
