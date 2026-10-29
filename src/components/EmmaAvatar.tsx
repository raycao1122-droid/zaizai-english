import { Heart, Smile, Lightbulb, Sparkles, Volume2 } from "lucide-react";
import type { VoiceState } from "../data/mockLesson";
import { assetUrl } from "../lib/assets";

export function EmmaAvatar({
  voice,
  mood,
  onMood,
  onAudio,
}: {
  voice: VoiceState;
  mood: string;
  onMood: (mood: string) => void;
  onAudio: () => void;
}) {
  const moods = [
    { id: "speaking", label: "正在说话", Icon: Smile },
    { id: "smile", label: "微笑", Icon: Smile },
    { id: "thinking", label: "思考", Icon: Lightbulb },
    { id: "encouraging", label: "鼓励", Icon: Heart },
  ];
  return (
    <aside className="emma-panel" aria-label="Emma 老师">
      <div
        className={`emma-portrait mood-${mood} ${voice === "speaking" ? "is-speaking" : ""}`}
      >
        <img
          className="emma-image"
          src={assetUrl("emma.svg")}
          alt="Emma：棕色盘发、米白针织衫，拿着英语书向在在挥手"
        />
        <div className="emma-bubble">
          <p>
            Hi, Zaizai!
            <br />
            Let’s learn
            <br />
            about animals!
          </p>
          <button
            className="audio-button"
            aria-label="回放 Emma 最近语音"
            onClick={onAudio}
          >
            <Volume2 size={22} />
          </button>
        </div>
        <div className="emma-name">
          <strong>
            Emma <Heart size={18} fill="#ff7f9e" color="#ff7f9e" />
          </strong>
          <span>AI English Teacher</span>
        </div>
        <div className="portrait-note">静态角色 · CSS 微动</div>
        {mood === "encouraging" && (
          <Sparkles className="emma-sparkle" size={42} />
        )}
      </div>
      <div className="emma-moods" aria-label="Emma 表情模拟">
        {moods.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-pressed={mood === id}
            className={mood === id ? "selected" : ""}
            onClick={() => onMood(id)}
          >
            <span>
              <Icon size={24} />
            </span>
            <small>{label}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
