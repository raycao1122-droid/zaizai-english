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
  onServiceConfig,
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
  onServiceConfig: () => void;
  tab: PanelTab;
  draft: string;
  notes: string;
  onTabChange: (tab: PanelTab) => void;
  onDraftChange: (draft: string) => void;
  onNotesChange: (notes: string) => void;
  onCollapse: () => void;
  onAudio: () => void;
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
                : p.configured
                  ? " · 待验证"
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
              <button onClick={onServiceConfig}>AI 服务配置</button>
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
                  disabled={voiceBlocked || realtime.locked}
                  onClick={() => {
                    if (
                      !realtime.authorized ||
                      !realtime.selectedProvider.configured
                    )
                      onServiceConfig();
                    else void realtime.connect();
                  }}
                >
                  {realtime.status === "error" ? "重新连接" : "连接语音"}
                </button>
              )}
            </div>
            <p
              className={`voice-connection-status ${realtime.status === "error" ? "has-error" : ""}`}
              role="status"
            >
              {realtime.message}
            </p>
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
                      <button
                        className="small-audio"
                        aria-label={`模拟播放${message.speaker}对话`}
                        onClick={onAudio}
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <div className="message-bubble">
                      <p>{message.text}</p>
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
                <button key={a.id} onClick={onAudio}>
                  <img src={a.image} alt="" />
                  <span>
                    {a.id}
                    <small>{a.chinese}</small>
                  </span>
                  <Volume2 size={16} />
                </button>
              ))}
            </div>
            <p className="muted-copy">音频按钮仅演示播放状态。</p>
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
