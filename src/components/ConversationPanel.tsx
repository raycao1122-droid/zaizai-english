import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Lightbulb,
  NotebookPen,
  PanelRightClose,
  Volume2,
  Send,
  Plus,
} from "lucide-react";
import { animals, type AnimalId, type Message } from "../data/mockLesson";

export function ConversationPanel({
  messages,
  target,
  translate,
  hidden,
  onCollapse,
  onAudio,
  onSend,
}: {
  messages: Message[];
  target: AnimalId;
  translate: boolean;
  hidden: boolean;
  onCollapse: () => void;
  onAudio: () => void;
  onSend: (text: string) => void;
}) {
  const [tab, setTab] = useState("conversation");
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const tabs = [
    { id: "conversation", label: "课堂对话", Icon: MessageCircle },
    { id: "tips", label: "学习提示", Icon: Lightbulb },
    { id: "notes", label: "课堂笔记", Icon: NotebookPen },
  ];
  return (
    <aside
      className="conversation-panel"
      aria-label="课堂辅助面板"
      hidden={hidden}
    >
      <div className="panel-top">
        <div className="panel-tabs" role="tablist" aria-label="辅助面板内容">
          {tabs.map(({ id, label, Icon }) => (
            <button
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
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
      >
        {tab === "conversation" && (
          <>
            <div className="conversation-note">本地脚本对话 · 未接入 AI</div>
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
                        ? "/assets/emma-avatar.svg"
                        : "/assets/student.svg"
                    }
                    alt={message.speaker}
                  />
                  <div className="message-content">
                    <div className="message-label">
                      {message.speaker}
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
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              className="soft-button"
              onClick={() => setNotes((n) => `${n}${n ? "\n" : ""}${target}`)}
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
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            onSend(draft.trim());
            setDraft("");
            setTab("conversation");
          }
        }}
      >
        <span className="input-indicator">
          <MessageCircle size={22} />
        </span>
        <input
          aria-label="输入英文模拟回答"
          placeholder="输入英文，练习回答…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={160}
        />
        <button
          type="submit"
          aria-label="发送模拟回答"
          disabled={!draft.trim()}
        >
          <Send size={22} fill="currentColor" />
        </button>
      </form>
    </aside>
  );
}
