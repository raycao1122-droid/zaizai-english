import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  LogOut,
  Play,
  Settings2,
} from "lucide-react";
import { Header } from "./components/Header";
import { EmmaAvatar } from "./components/EmmaAvatar";
import { LessonStage } from "./components/LessonStage";
import { ClassroomActivities } from "./components/ClassroomActivities";
import { ConversationPanel } from "./components/ConversationPanel";
import { VoiceControlBar } from "./components/VoiceControlBar";
import { ParentLessonReport } from "./components/ParentLessonReport";
import { LearningArchive } from "./components/LearningArchive";
import { CurriculumLibrary } from "./components/CurriculumLibrary";
import { WordBook } from "./components/WordBook";
import { Modal } from "./components/Modal";
import { useClassroom } from "./hooks/useClassroom";
import { lessonSteps } from "./data/lessonFlow";
import {
  mockHistory,
  mockMaterials,
  type CurriculumMaterial,
  type MockSession,
} from "./data/mockReports";
import { voiceCycle } from "./data/mockLesson";

export default function App() {
  const { state, dispatch, context } = useClassroom();
  const [modal, setModal] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [materials, setMaterials] =
    useState<CurriculumMaterial[]>(mockMaterials);
  const [reportSession, setReportSession] = useState<MockSession>(
    mockHistory[0],
  );
  const voice = state.paused
    ? "paused"
    : state.muted
      ? "muted"
      : state.baseVoice;
  function audio() {
    if (!state.paused && !state.muted)
      dispatch({ type: "voice", value: "speaking" });
    setToast("音频播放状态模拟：尚未接入音频或语音 API。");
  }

  function navigate(index: number) {
    if (state.paused) {
      setToast("课堂已暂停，请先继续课堂后切换环节。");
      return false;
    }
    if (state.exited) dispatch({ type: "resume" });
    dispatch({ type: "navigate", index });
    setToast("");
    return true;
  }
  function reset() {
    dispatch({ type: "reset" });
    setReportSession(mockHistory[0]);
    setToast("演示已重置，当前课堂草稿和笔记已清空。");
  }
  function review(word: string) {
    setReviewed((items) =>
      items.includes(word)
        ? items.filter((item) => item !== word)
        : [...items, word],
    );
  }
  function headerNavigate(name: string) {
    if (name === "上课") {
      dispatch({ type: "resume" });
      if (state.step >= 8) dispatch({ type: "navigate", index: 3 });
    } else if (name === "学习报告") {
      setReportSession(mockHistory[0]);
      navigate(9);
    } else setModal(name);
  }
  function next() {
    if (state.paused) return;
    if (state.step === lessonSteps.length - 1) setModal("退出课堂");
    else navigate(state.step + 1);
  }
  return (
    <div className="app-shell">
      <Header
        active={state.step >= 9 && !state.exited ? "学习报告" : "上课"}
        onNavigate={headerNavigate}
        onSettings={() => setModal("课堂设置")}
      />
      {state.exited ? (
        <main className="reentry">
          <div className="reentry-card">
            <BookOpen size={52} />
            <span className="demo-badge">M2 模拟课堂</span>
            <h1>课堂已退出</h1>
            <p>Emma 在这里等你。准备好了，就回来继续吧。</p>
            <p className="muted-copy">
              本次课堂环节、笔记和未发送的回答仍保留。
            </p>
            <div className="reentry-actions">
              <button
                className="primary-button"
                onClick={() => dispatch({ type: "resume" })}
              >
                <Play size={19} />
                重新进入课堂
              </button>
              <button className="soft-button" onClick={reset}>
                从头开始
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          <main
            className={`classroom-layout ${state.collapsed ? "panel-collapsed" : ""}`}
          >
            <EmmaAvatar
              voice={voice}
              mood={state.mood}
              onMood={(mood) => {
                dispatch({ type: "patch", patch: { mood } });
                if (mood === "thinking" || mood === "speaking") {
                  if (!state.paused && !state.muted)
                    dispatch({
                      type: "voice",
                      value: mood === "thinking" ? "thinking" : "speaking",
                    });
                }
              }}
              onAudio={audio}
            />
            <LessonStage
              index={state.step}
              panelCollapsed={state.collapsed}
              onDirectory={() => setModal("课程目录")}
              onExpand={() =>
                dispatch({ type: "patch", patch: { collapsed: false } })
              }
            >
              {context.step.id === "parent-report" ? (
                <ParentLessonReport
                  key={reportSession.id}
                  session={reportSession}
                  onAudio={audio}
                  onArchive={() => navigate(10)}
                />
              ) : context.step.id === "archive" ? (
                <LearningArchive
                  reviewed={reviewed}
                  onReview={review}
                  onOpenReport={(session) => {
                    setReportSession(session);
                    navigate(9);
                  }}
                />
              ) : (
                <ClassroomActivities
                  state={state}
                  onSelect={(animal) => {
                    dispatch({ type: "select", animal });
                    if (context.step.id !== "vocabulary")
                      setToast(
                        animal === context.target
                          ? "选对了！这是本地图片练习反馈。"
                          : "再试一次，可以打开提示观察图片。",
                      );
                  }}
                  onAnswer={(text) => dispatch({ type: "answer", text })}
                  onAudio={audio}
                  onHint={() => dispatch({ type: "hint" })}
                  onRetry={() => dispatch({ type: "retry" })}
                  onQuestion={() => dispatch({ type: "question" })}
                  onStart={() => navigate(1)}
                  onReset={reset}
                  onReport={() => {
                    setReportSession(mockHistory[0]);
                    navigate(9);
                  }}
                />
              )}
            </LessonStage>
            <ConversationPanel
              hidden={state.collapsed}
              disabled={state.paused}
              tab={state.panelTab}
              draft={state.draft}
              notes={state.notes}
              onTabChange={(panelTab) =>
                dispatch({ type: "patch", patch: { panelTab } })
              }
              onDraftChange={(draft) =>
                dispatch({ type: "patch", patch: { draft } })
              }
              onNotesChange={(notes) =>
                dispatch({ type: "patch", patch: { notes } })
              }
              messages={state.messages}
              target={context.target}
              translate={state.translate || state.hint}
              onCollapse={() =>
                dispatch({ type: "patch", patch: { collapsed: true } })
              }
              onAudio={audio}
              onSend={(text) => dispatch({ type: "answer", text })}
            />
            {state.paused && (
              <div className="pause-notice" role="status">
                <Play size={22} />
                <strong>课堂已暂停</strong>
                <button onClick={() => dispatch({ type: "pause" })}>
                  继续课堂
                </button>
              </div>
            )}
          </main>
          <VoiceControlBar
            voice={voice}
            muted={state.muted}
            paused={state.paused}
            speed={state.speed}
            nextLabel={
              state.step === 0
                ? "开始上课"
                : state.step === 10
                  ? "结束课堂"
                  : "下一步"
            }
            onExit={() => setModal("退出课堂")}
            onCamera={() => setModal("摄像头")}
            onMute={() => dispatch({ type: "mute" })}
            onPause={() => dispatch({ type: "pause" })}
            onCycle={() =>
              dispatch({
                type: "voice",
                value:
                  voiceCycle[
                    (voiceCycle.indexOf(state.baseVoice) + 1) %
                      voiceCycle.length
                  ],
              })
            }
            onVoice={(value) => dispatch({ type: "voice", value })}
            onSpeed={(speed) => {
              dispatch({ type: "patch", patch: { speed } });
              setToast(
                `语速已设为${speed === "slow" ? "慢速" : speed === "fast" ? "快速" : "正常"}（模拟）。`,
              );
            }}
            onReset={reset}
            onNext={next}
          />
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="关闭状态提示">
            ×
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={modal}
          wide={["课程", "单词本", "错题本"].includes(modal)}
          onClose={() => setModal(null)}
        >
          {modal === "退出课堂" ? (
            <>
              <div className="modal-illustration">
                <LogOut size={34} />
              </div>
              <p>
                要暂时离开课堂吗？当前环节、笔记和未发送的回答会保留在本次页面中。
              </p>
              <div className="modal-actions">
                <button className="soft-button" onClick={() => setModal(null)}>
                  继续学习
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    dispatch({ type: "exit" });
                    setModal(null);
                    setToast("");
                  }}
                >
                  确认退出
                </button>
              </div>
            </>
          ) : modal === "课堂设置" ? (
            <>
              <p className="muted-copy">
                以下仅改变本次前端演示，不访问任何设备。
              </p>
              <label className="setting-row">
                <span>显示中文翻译</span>
                <input
                  type="checkbox"
                  checked={state.translate}
                  onChange={(event) =>
                    dispatch({
                      type: "patch",
                      patch: { translate: event.target.checked },
                    })
                  }
                />
              </label>
              <div className="setting-row">
                <span>语音交互</span>
                <strong>连续语音 · 状态模拟</strong>
              </div>
              <div className="setting-row">
                <span>Emma 展示</span>
                <span>原图静态裁切 + CSS 微动</span>
              </div>
              <p className="notice-copy">
                M2
                的纠音、报告和档案为模拟内容；AI、语音、摄像头及后台尚未接入。
              </p>
            </>
          ) : modal === "课程目录" ? (
            <>
              <p className="muted-copy">
                Lesson 01 · Animals — 11 个模拟课堂环节。
              </p>
              <div className="directory-list">
                {lessonSteps.map((step, index) => (
                  <button
                    key={step.id}
                    disabled={state.paused}
                    aria-current={state.step === index ? "step" : undefined}
                    onClick={() => {
                      if (navigate(index)) setModal(null);
                    }}
                  >
                    <span className="step-number">{index + 1}</span>
                    <span>{step.title}</span>
                    {state.step === index ? (
                      <Check size={21} />
                    ) : (
                      <ArrowRight size={19} />
                    )}
                  </button>
                ))}
              </div>
              {state.paused && (
                <p className="notice-copy">
                  课堂已暂停，请先继续课堂后再切换练习。
                </p>
              )}
              <p className="notice-copy">
                全部为前端模拟。完整 11 环节不等于真实 AI 授课。
              </p>
            </>
          ) : modal === "课程" ? (
            <CurriculumLibrary
              materials={materials}
              onAdd={(items) =>
                setMaterials((current) => [...current, ...items])
              }
              onRemove={(id) =>
                setMaterials((current) =>
                  current.filter((item) => item.id !== id),
                )
              }
              onStart={() => {
                reset();
                setModal(null);
              }}
              onClose={() => setModal(null)}
            />
          ) : modal === "单词本" || modal === "错题本" ? (
            <WordBook
              mistakes={modal === "错题本"}
              evidence={state.choices}
              reviewed={reviewed}
              onReview={review}
              onAudio={audio}
              onPractice={() => {
                if (navigate(7)) setModal(null);
              }}
            />
          ) : (
            <>
              <div className="modal-illustration">
                <Settings2 size={34} />
              </div>
              <p>摄像头尚未接入。</p>
              <p className="muted-copy">
                本阶段不会请求摄像头或麦克风权限，底部只展示模拟状态。
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
