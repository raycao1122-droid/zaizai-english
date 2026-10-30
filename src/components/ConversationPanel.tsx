import type { RealtimeVoice } from "../hooks/useRealtimeVoice";
import { useEffect, useRef } from "react";
import {
  MessageCircle,
  Lightbulb,
  NotebookPen,
  PanelRightClose,
  Volume2,
  Send,
  Plus,
} from "lucide-react";
import {
  animals,
  type AnimalId,
  type Message,
  type PanelTab,
} from "../data/mockLesson";
import { assetUrl } from "../lib/assets";
import { navigateTabs } from "../lib/tabNavigation";

export function ConversationPanel({
  messages,
  target,
  translate,
  hidden,
  disabled,
  isAi = false,
  waiting = false,
  realtime,
  voiceBlocked,
  tab,
  draft,
  notes,
  onTabChange,
  onDraftChange,
  onNotesChange,
  onCollapse,
  onAudio,
  onSend,
}: {
  messages: Message[];
  target: AnimalId;
  translate: boolean;
  hidden: boolean;
  disabled: boolean;
  isAi?: boolean;
  waiting?: boolean;
  realtime: RealtimeVoice;
  voiceBlocked: boolean;
  tab: PanelTab;
  draft: string;
  notes: string;
  onTabChange: (tab: PanelTab) => void;
  onDraftChange: (draft: string) => void;
  onNotesChange: (notes: string) => void;
  onCollapse: () => void;
  onAudio: (text?: string) => void;
  onSend: (text: string) => void | boolean | Promise<boolean>;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const tabs = [
    { id: "conversation", label: "课堂对话", Icon: MessageCircle },
    { id: "tips", label: "学习提示", Icon: Lightbulb },
    { id: "notes", label: "课堂笔记", Icon: NotebookPen },
  ] satisfies { id: PanelTab; label: string; Icon: typeof MessageCircle }[];
  return (
    <aside
      className="conversation-panel"
      aria-label="课堂辅助面板"
      hidden={hidden}
    >
      <div className="panel-model-row">
        <span>语音模型</span>
        <select
          aria-label="实时语音模型"
          title={
            realtime.locked
              ? "会话中不可切换；断开后或下次会话选择"
              : "选择下次语音会话使用的模型"
          }
          value={realtime.selected}
          disabled={realtime.locked}
          onChange={(e) =>
            realtime.select(e.target.value as typeof realtime.selected)
          }
        >
          {realtime.providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.id === realtime.selected &&
              (realtime.status === "connected" ||
                realtime.status === "connecting")
                ? " · 会话中"
                : realtime.loading || realtime.catalogError
                  ? " · 待连接"
                  : p.configured
                    ? ""
                    : " · 未配置"}
            </option>
          ))}
        </select>
      </div>
      <div className="panel-top">
        <div
          className="panel-tabs"
          role="tablist"
          aria-label="辅助面板内容"
          onKeyDown={navigateTabs}
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              role="tab"
              aria-selected={tab === id}
              tabIndex={tab === id ? 0 : -1}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => onTabChange(id)}
              title={label}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          className="collapse-button"
          aria-label="收起辅助面板"
          onClick={onCollapse}
        >
          <PanelRightClose size={18} />
        </button>
      </div>
      <div
        className="panel-body"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "conversation" && (
          <>
            <div className="conversation-note">
              {realtime.status === "connected"
                ? "真实语音 · 课件和报告仍为演示"
                : isAi
                  ? "AI 文字对话 · 课件和语音仍为演示"
                  : "本地脚本对话 · 未接入 AI"}
            </div>
            <div className="voice-session-tools">
              {realtime.status === "connected" ||
              realtime.status === "connecting" ? (
                <>
                  <button onClick={() => realtime.disconnect()}>
                    断开语音
                  </button>
                  {realtime.status === "connected" && (
                    <button
                      onClick={realtime.toggleMute}
                      aria-pressed={realtime.muted}
                    >
                      {realtime.muted ? "取消静音" : "语音静音"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  disabled={voiceBlocked || realtime.locked || realtime.loading}
                  onClick={() => void realtime.connect()}
                >
                  {realtime.loading
                    ? "正在准备语音…"
                    : realtime.catalogError
                      ? "重试语音服务"
                      : realtime.status === "error"
                        ? "重新连接"
                        : "开始语音"}
                </button>
              )}
            </div>
            <p
              className={`voice-connection-status ${realtime.status === "error" ? "has-error" : ""}`}
              role="status"
            >
              {realtime.message}
            </p>
            {realtime.status === "connected" && (
              <div className="voice-recording-tools">
                <button
                  className="soft-button"
                  disabled={!realtime.hasRecording}
                  onClick={realtime.previewRecording}
                >
                  回听我的录音
                </button>
                {realtime.soundPaused && (
                  <button
                    className="soft-button"
                    onClick={() => void realtime.resumeAudio()}
                  >
                    恢复声音
                  </button>
                )}
                {!realtime.muted && !realtime.replaying && (
                  <label className="microphone-level">
                    {realtime.inputLevel > 0.008
                      ? "正在收音"
                      : "请对着麦克风说话"}
                    <meter
                      aria-label="麦克风音量"
                      min={0}
                      max={0.1}
                      value={Math.min(0.1, realtime.inputLevel)}
                    />
                  </label>
                )}
              </div>
            )}
            {realtime.preview && (
              <div className="voice-recording-preview">
                <span>
                  我的最近录音 · {realtime.preview.duration.toFixed(1)} 秒
                </span>
                <audio
                  controls
                  preload="metadata"
                  aria-label="最近录音回听"
                  src={realtime.preview.url}
                  onPlay={(e) => realtime.startReplay(e.currentTarget)}
                  onPause={(e) => realtime.finishReplay(e.currentTarget)}
                  onEnded={(e) => realtime.finishReplay(e.currentTarget)}
                  onError={realtime.playbackError}
                />
                <small>仅保留在本次页面，刷新或重置后清除。</small>
              </div>
            )}
            {realtime.liveSubtitle && (
              <p className="voice-live-caption">{realtime.liveSubtitle}</p>
            )}
            <div className="message-list">
              {messages.map((message) => (
                <div
                  className={`message ${message.speaker === "在在" ? "student-message" : ""}`}
                  key={message.id}
                >
                  <img
                    className="message-avatar"
                    src={
                      message.speaker === "Emma"
                        ? assetUrl("emma-avatar.svg")
                        : assetUrl("student.svg")
                    }
                    alt={message.speaker}
                  />
                  <div className="message-content">
                    <div className="message-label">
                      {message.speaker}
                      {message.source === "voice" && (
                        <small className="voice-source-label">实时字幕</small>
                      )}
                      {message.source !== "voice" && (
                        <small className="example-message-label">
                          示例文字
                        </small>
                      )}
                    </div>
                    <div className="message-bubble">
                      <p>{message.text}</p>
                      {realtime.clips[message.id] && (
                        <div className="message-voice-clip">
                          <span>
                            {message.speaker === "在在"
                              ? "回听我的录音"
                              : "播放 Emma 语音"}{" "}
                            · {realtime.clips[message.id].duration.toFixed(1)}{" "}
                            秒
                          </span>
                          <audio
                            controls
                            preload="metadata"
                            aria-label={`${message.speaker}语音回听`}
                            src={realtime.clips[message.id].url}
                            onPlay={(e) =>
                              realtime.startReplay(e.currentTarget)
                            }
                            onPause={(e) =>
                              realtime.finishReplay(e.currentTarget)
                            }
                            onEnded={(e) =>
                              realtime.finishReplay(e.currentTarget)
                            }
                            onError={realtime.playbackError}
                          />
                        </div>
                      )}

                      {translate && message.translation && (
                        <p className="translation">{message.translation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={end} />
            </div>
          </>
        )}
        {tab === "tips" && (
          <div className="tips-content">
            <span className="panel-eyebrow">LOOK & SAY</span>
            <h2>Take your time.</h2>
            <p>先观察图片，再试着读出单词。</p>
            <div className="tip-highlight">
              <Lightbulb size={23} />
              <p>{animals.find((a) => a.id === target)!.hint}</p>
            </div>
            <h3>今天的动物单词</h3>
            <div className="vocab-list">
              {animals.map((a) => (
                <button key={a.id} onClick={() => onAudio(a.id)}>
                  <img src={a.image} alt="" />
                  <span>
                    {a.id}
                    <small>{a.chinese}</small>
                  </span>
                  <Volume2 size={16} />
                </button>
              ))}
            </div>
            <p className="muted-copy">
              {realtime.selectedProvider.configured
                ? "点击单词，请 Emma 朗读；首次使用需允许麦克风。"
                : "音频按钮仅演示播放状态。"}
            </p>
          </div>
        )}
        {tab === "notes" && (
          <div className="notes-content">
            <NotebookPen size={30} />
            <h2>My classroom notes</h2>
            <p>记下你想再练习的单词吧。</p>
            <label htmlFor="class-notes">本次课堂笔记</label>
            <textarea
              id="class-notes"
              placeholder="例如：rabbit — 兔子"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
            <button
              className="soft-button"
              onClick={() =>
                onNotesChange(`${notes}${notes ? "\n" : ""}${target}`)
              }
            >
              <Plus size={17} />
              加入当前单词
            </button>
            <p className="muted-copy">
              笔记只保留在本次页面中，尚未接入保存服务。
            </p>
          </div>
        )}
      </div>
      <form
        className="chat-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!disabled && draft.trim()) {
            const sent = await onSend(draft.trim());
            if (sent !== false) {
              onDraftChange("");
              onTabChange("conversation");
            }
          }
        }}
      >
        <span className="input-indicator">
          <MessageCircle size={22} />
        </span>
        <input
          aria-label={isAi ? "输入英文 AI 回答" : "输入英文模拟回答"}
          placeholder={
            waiting
              ? "Emma 正在思考…"
              : realtime.locked
                ? "语音会话中，请直接说话"
                : disabled
                  ? "已暂停，继续课堂后发送"
                  : "输入英文，练习回答…"
          }
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          disabled={disabled}
          maxLength={160}
        />
        <button
          type="submit"
          aria-label={isAi ? "发送 AI 回答" : "发送模拟回答"}
          disabled={disabled || !draft.trim()}
        >
          <Send size={22} fill="currentColor" />
        </button>
      </form>
    </aside>
  );
}
