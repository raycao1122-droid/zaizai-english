import { useEffect, useRef, useState } from "react";
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
import {
  LearningArchive,
  createArchiveView,
} from "./components/LearningArchive";
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
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const aiRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    aiRequest.current?.abort();
    setAiBusy(false);
  }, [state.step, state.paused, state.exited]);
  useEffect(() => () => aiRequest.current?.abort(), []);
  const [libraryRecent, setLibraryRecent] = useState<string[]>([]);
  const [librarySelection, setLibrarySelection] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [materials, setMaterials] =
    useState<CurriculumMaterial[]>(mockMaterials);
  const [reportSession, setReportSession] = useState<MockSession>(
    mockHistory[0],
  );
  const [archiveView, setArchiveView] = useState(createArchiveView);
  const [reportFromArchive, setReportFromArchive] = useState(false);
  const voice = state.paused
    ? "paused"
    : state.muted
      ? "muted"
      : state.baseVoice;
  async function sendAnswer(text: string) {
    if (!aiEnabled) {
      dispatch({ type: "answer", text });
      return true;
    }
    if (state.paused || state.exited || aiBusy) return false;
    const controller = new AbortController();
    aiRequest.current = controller;
    setAiBusy(true);
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch("/api/classroom/reply", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          prompt: context.prompt,
          history: state.messages.slice(-8).map((m) => ({
            role: m.speaker === "Emma" ? "assistant" : "user",
            content: m.text.slice(0, 500),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.text !== "string")
        throw new Error(result.error || "AI 服务暂不可用。");
      if (controller.signal.aborted) return false;
      dispatch({
        type: "ai-reply",
        text,
        reply: result.text,
        step: state.step,
      });
      return true;
    } catch (error) {
      if (!controller.signal.aborted)
        setToast(
          error instanceof Error ? error.message : "AI 连接失败，请重试。",
        );
      return false;
    } finally {
      clearTimeout(timeout);
      if (aiRequest.current === controller) setAiBusy(false);
    }
  }
  async function enableAi(enabled: boolean) {
    aiRequest.current?.abort();
    if (!enabled) {
      setAiEnabled(false);
      setAiBusy(false);
      setAiStatus("已恢复 M2 演示模式。");
      return;
    }
    try {
      const response = await fetch("/api/health", {
        signal: AbortSignal.timeout(5000),
      });
      const health = await response.json();
      if (!response.ok || !health.configured)
        throw new Error("AI 服务尚未配置。请先启动并配置课堂后端。");
      setAiEnabled(true);
      setAiStatus("已开启 AI 文字对话；语音仍为演示。");
      setToast("已启用真实 AI 文字对话；课件按钮、语音和报告仍为模拟。");
    } catch {
      setAiStatus("AI 服务未就绪，请先配置并启动课堂后端。");
      setToast("AI 服务未就绪，当前仍为 M2 演示。需先配置并启动课堂后端。");
    }
  }
  function audio() {
    if (!state.paused && !state.muted)
      dispatch({ type: "voice", value: "speaking" });
    setToast("音频播放状态模拟：尚未接入音频或语音 API。");
  }

  function navigate(index: number, historicalSession?: MockSession) {
    if (state.paused) {
      setToast("课堂已暂停，请先继续课堂后切换环节。");
      return false;
    }
    if (state.exited) dispatch({ type: "resume" });
    if (index === 9) {
      setReportSession(historicalSession ?? mockHistory[0]);
      setReportFromArchive(Boolean(historicalSession));
    }
    dispatch({ type: "navigate", index });
    setToast("");
    return true;
  }
  function reset() {
    aiRequest.current?.abort();
    setAiBusy(false);
    dispatch({ type: "reset" });
    setReportSession(mockHistory[0]);
    setReportFromArchive(false);
    setArchiveView(createArchiveView());
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
      if (state.exited) dispatch({ type: "resume" });
      else if (state.step >= 9) navigate(state.lastLessonStep);
    } else if (name === "学习报告") {
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
                  fromArchive={reportFromArchive}
                />
              ) : context.step.id === "archive" ? (
                <LearningArchive
                  view={archiveView}
                  onViewChange={(patch) =>
                    setArchiveView((current) => ({ ...current, ...patch }))
                  }
                  reviewed={reviewed}
                  onReview={review}
                  onOpenReport={(session) => {
                    navigate(9, session);
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
                    navigate(9);
                  }}
                />
              )}
            </LessonStage>
            <ConversationPanel
              hidden={state.collapsed}
              disabled={state.paused || aiBusy}
              isAi={aiEnabled}
              waiting={aiBusy}
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
              onSend={sendAnswer}
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
          title={modal === "课程" ? "课程与教材" : modal}
          className={modal === "课程" ? "curriculum-modal" : ""}
          titleIcon={
            modal === "课程" ? (
              <BookOpen size={32} color="#327ef3" aria-hidden="true" />
            ) : undefined
          }
          footer={
            modal === "课程" ? (
              <>
                <div className="library-actions">
                  <button
                    className="soft-button"
                    onClick={() => setModal(null)}
                  >
                    继续本次课堂
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      reset();
                      setModal(null);
                    }}
                  >
                    从头演示 Animals 示例课
                  </button>
                </div>
                <p className="shelf-footer-note">
                  从头演示会清空课堂草稿和笔记；选择教材不会生成课程。
                </p>
              </>
            ) : undefined
          }
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
                <span>真实 AI 文字对话（M3）</span>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(event) => void enableAi(event.target.checked)}
                />
              </label>
              {aiStatus && (
                <p className="notice-copy" role="status">
                  {aiStatus}
                </p>
              )}
              <p className="muted-copy">
                开启后，仅输入框对话使用
                AI；需启动课堂后端。课件按钮、语音、评分与报告仍为演示。
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
                的纠音、报告和档案为模拟内容；真实文字对话按上方开关配置；语音、摄像头与学习数据服务尚未接入。
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
              recent={libraryRecent}
              selected={librarySelection}
              onSelect={setLibrarySelection}
              onUse={(id) =>
                setLibraryRecent((current) => [
                  id,
                  ...current.filter((item) => item !== id),
                ])
              }
              materials={materials}
              onAdd={(items) =>
                setMaterials((current) => [...current, ...items])
              }
              onRemove={(id) =>
                setMaterials((current) =>
                  current.filter((item) => item.id !== id),
                )
              }
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
