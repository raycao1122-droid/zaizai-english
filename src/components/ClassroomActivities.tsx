import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";
import { animals } from "../data/mockLesson";
import {
  greetingChoices,
  petChoices,
  sentenceChoices,
} from "../data/lessonFlow";
import { assetUrl } from "../lib/assets";
import { stageContext, type ClassroomState } from "../hooks/useClassroom";
import type { AnimalId } from "../data/mockLesson";
import { InteractiveMaterial } from "./InteractiveMaterial";
import { PronunciationFeedback } from "./PronunciationFeedback";

type Props = {
  state: ClassroomState;
  onSelect: (animal: AnimalId) => void;
  onAnswer: (answer: string) => void;
  onAudio: () => void;
  onHint: () => void;
  onRetry: () => void;
  onQuestion: () => void;
  onStart: () => void;
  onReset: () => void;
  onReport: () => void;
};

function Prompt({
  title,
  translation,
  showTranslation,
  onAudio,
}: {
  title: string;
  translation: string;
  showTranslation: boolean;
  onAudio: () => void;
}) {
  return (
    <div className="activity-prompt">
      <h1>{title}</h1>
      <button
        className="audio-button"
        onClick={onAudio}
        aria-label="模拟播放课堂提问"
      >
        <Volume2 size={23} />
      </button>
      {showTranslation && <p>{translation}</p>}
    </div>
  );
}

export function ClassroomActivities(props: Props) {
  const { state, onSelect, onAnswer, onAudio } = props;
  const context = stageContext(state);
  const animal = animals.find((a) => a.id === context.target)!;
  const showTranslation = state.translate || state.hint;
  const kind = context.step.id;

  if (kind === "listening" || kind === "review")
    return (
      <>
        <div className="scene-topline">
          <span className="lesson-tag">{context.step.english}</span>
          <span className="activity-description">
            {kind === "review" ? "换个问题，再想一想" : "看一看，说一说"}
          </span>
          <span className="demo-badge">模拟课堂</span>
        </div>
        <div className="question-line">
          <h1>{context.prompt}</h1>
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
            {showTranslation
              ? context.translation
              : "Listen, look, and choose."}
          </div>
          <button
            className={`hint-button ${state.hint ? "on" : ""}`}
            onClick={props.onHint}
            aria-expanded={state.hint}
          >
            <Lightbulb size={20} fill="#ffda73" color="#eebd43" />
            {state.hint ? "收起提示" : "提示我一下"}
          </button>
        </div>
        <div className="feedback-space" aria-live="polite">
          {state.hint && state.selected !== context.target ? (
            <div className="hint-text">{animal.hint}</div>
          ) : state.selected ? (
            <div
              className={`feedback ${state.selected === context.target ? "success" : "retry"}`}
            >
              <CheckCircle2 size={19} />
              <span>
                {state.selected === context.target
                  ? `Great! That’s right. It’s a ${context.target}!`
                  : "Not quite. Look carefully and try again."}
              </span>
            </div>
          ) : (
            <span className="choose-note">点击动物图片，和 Emma 一起练习</span>
          )}
        </div>
        <InteractiveMaterial
          selected={state.selected}
          target={context.target}
          choices={context.choices}
          disabled={state.paused}
          onSelect={onSelect}
        />
        <button
          className="question-switch"
          onClick={props.onQuestion}
          disabled={state.paused}
        >
          <RefreshCw size={14} />
          换一题<span>本地识词演示</span>
        </button>
      </>
    );

  if (kind === "pronunciation")
    return (
      <PronunciationFeedback
        attempts={state.retries}
        paused={state.paused}
        onRetry={props.onRetry}
        onAudio={onAudio}
      />
    );

  if (kind === "preparation")
    return (
      <div className="welcome-stage activity-card">
        <span className="simulation-label">
          M2 模拟课堂 · Lesson 01 · Animals
        </span>
        <img
          className="welcome-emma"
          src={assetUrl("emma-avatar.svg")}
          alt="原始设计中的 Emma"
        />
        <span className="stage-kicker">HI, ZAIZAI!</span>
        <h1>
          Welcome to
          <br />
          our English class!
        </h1>
        <p>
          Meet animals. Try a sentence.
          <br />
          Let’s learn together.
        </p>
        {showTranslation && (
          <p className="translation">
            今天一起认识动物，再试着用一句话表达吧。
          </p>
        )}
        <div className="welcome-animals">
          {animals
            .filter((a) => a.id !== "fish")
            .map((a) => (
              <img src={a.image} alt={a.id} key={a.id} />
            ))}
        </div>
        <button
          className="primary-button"
          onClick={props.onStart}
          disabled={state.paused}
        >
          开始上课
          <ArrowRight size={20} />
        </button>
        <p className="stage-footnote">
          课堂与语音均为模拟状态，未接入 AI 或设备。
        </p>
      </div>
    );

  if (kind === "student-summary")
    return (
      <section
        className="summary-stage activity-card"
        aria-label="给在在的课后总结"
      >
        <span className="simulation-label">示例课后总结 · 模拟文案</span>
        <div className="summary-trophy">
          <Trophy size={60} />
          <Star size={23} />
        </div>
        <h1>Great job, Zaizai!</h1>
        <p>
          今天的示例课堂里，我们一起认识了动物，
          <br />
          也练习了用完整的句子表达。
        </p>
        <div className="summary-words">
          {animals.map((a) => (
            <div key={a.id}>
              <img src={a.image} alt={a.id} />
              <strong>{a.id}</strong>
            </div>
          ))}
        </div>
        <p className="summary-next">
          下一次，可以换一张图片，再试着说说你的想法。
          <br />
          慢一点、自然一点，都没关系。
        </p>
        <div className="session-evidence">
          <strong>本页演示操作记录</strong>
          <span>
            点选 {state.choices.length} 次 · 提示 {state.hintRequests} 次 ·
            模拟重试 {state.retries} 次
          </span>
          <small>只记录页面操作，不表示发音成绩或知识掌握程度。</small>
        </div>
        <div className="summary-actions">
          <button className="soft-button" onClick={props.onReset}>
            再练一次
          </button>
          <button className="primary-button" onClick={props.onReport}>
            家长学习报告
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    );

  if (kind === "vocabulary")
    return (
      <div className="vocabulary-stage activity-card">
        <div className="activity-heading">
          <span className="stage-kicker">LOOK AND SAY</span>
          <span className="simulation-label">认词与发音状态模拟</span>
        </div>
        <Prompt
          title={context.prompt}
          translation={context.translation}
          showTranslation={showTranslation}
          onAudio={onAudio}
        />
        <div className={`featured-animal animal-${animal.id}`}>
          <img src={animal.image} alt={animal.id} />
          <div>
            <strong>{animal.id}</strong>
            <button
              className="audio-button"
              onClick={onAudio}
              aria-label={`模拟播放 ${animal.id}`}
            >
              <Volume2 size={23} />
            </button>
          </div>
        </div>
        <div className="vocabulary-thumbnails">
          {animals
            .filter((a) => a.id !== "fish")
            .map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                disabled={state.paused}
                aria-pressed={state.learnedAnimal === a.id}
                className={state.learnedAnimal === a.id ? "active" : ""}
              >
                <img src={a.image} alt={a.id} />
                <strong>{a.id}</strong>
              </button>
            ))}
        </div>
        <p className="stage-footnote">
          选择图片切换示例单词；音频按钮只切换状态。
        </p>
      </div>
    );

  if (kind === "greeting")
    return (
      <div className="greeting-stage activity-card">
        <span className="stage-kicker">HELLO, ZAIZAI!</span>
        <Prompt
          title={context.prompt}
          translation={context.translation}
          showTranslation={showTranslation}
          onAudio={onAudio}
        />
        <img
          className="greeting-avatar"
          src={assetUrl("student.svg")}
          alt="在在的原始设计头像"
        />
        <div className="answer-choices greeting-choices">
          {greetingChoices.map((answer) => (
            <button
              key={answer}
              disabled={state.paused}
              aria-pressed={state.greeting === answer}
              className={state.greeting === answer ? "chosen" : ""}
              onClick={() => onAnswer(answer)}
            >
              {answer}
            </button>
          ))}
        </div>
        {state.greeting && (
          <p className="activity-response" role="status">
            Thanks for sharing! Let’s meet some animals.
          </p>
        )}
        <p className="stage-footnote">
          点击一个预设回答，演示自然问候；未进行语音识别。
        </p>
      </div>
    );

  if (kind === "sentence")
    return (
      <div className="sentence-stage activity-card">
        <span className="stage-kicker">MAKE A SENTENCE</span>
        <Prompt
          title={context.prompt}
          translation={context.translation}
          showTranslation={showTranslation}
          onAudio={onAudio}
        />
        <div className="sentence-picture">
          <img src={assetUrl("bird.svg")} alt="bird" />
          <strong>{state.sentence || "It’s a bird."}</strong>
          {showTranslation && <small>这是一只小鸟。</small>}
        </div>
        <div className="answer-choices sentence-choices">
          {sentenceChoices.map((answer) => (
            <button
              key={answer}
              disabled={state.paused}
              className={state.sentence === answer ? "chosen" : ""}
              aria-pressed={state.sentence === answer}
              onClick={() => onAnswer(answer)}
            >
              <Volume2 size={16} />
              {answer}
            </button>
          ))}
        </div>
        <p className="stage-footnote">
          选择示例句型，不代表系统识别或评价了你的口语。
        </p>
      </div>
    );

  if (kind === "scenario")
    return (
      <div className="scenario-stage activity-card">
        <span className="stage-kicker">LET’S TALK</span>
        <Prompt
          title={context.prompt}
          translation={context.translation}
          showTranslation={showTranslation}
          onAudio={onAudio}
        />
        <p className="scenario-invitation">
          Tell Emma a little about your pets.
        </p>
        <div className="pet-options">
          {petChoices.map((pet) => (
            <button
              key={pet.id}
              aria-label={pet.answer}
              disabled={state.paused}
              onClick={() => onAnswer(pet.answer)}
              aria-pressed={state.pet === pet.answer}
              className={state.pet === pet.answer ? "chosen" : ""}
            >
              <img
                src={assetUrl(pet.image)}
                alt={`原始设计中的${pet.id === "none" ? "在在" : `在在与 ${pet.id}`}`}
              />
              <span>{pet.answer}</span>
            </button>
          ))}
        </div>
        {state.pet && (
          <div className="activity-response" role="status">
            Thanks! We can talk about our favourite animals.
          </div>
        )}
        <div className="scenario-language">
          <BookOpen size={22} />
          <p>
            <strong>I like …</strong>
            <span>Try talking about an animal you like.</span>
          </p>
        </div>
        <p className="stage-footnote">
          预设选项与固定对话示例 · 未接入 AI 对话。
        </p>
      </div>
    );

  return null;
}
