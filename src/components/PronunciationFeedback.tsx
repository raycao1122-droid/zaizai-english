import { Mic, RefreshCw, Volume2, CheckCircle2 } from "lucide-react";

function DemoWave({ pink = false }: { pink?: boolean }) {
  return (
    <div
      className={`demo-wave ${pink ? "pink-wave" : ""}`}
      aria-label="静态示例波形，非真实录音"
    >
      {[13, 24, 35, 19, 42, 28, 16, 32, 22, 11, 25, 15].map((height, index) => (
        <i key={index} style={{ height }} />
      ))}
    </div>
  );
}

export function PronunciationFeedback({
  attempts,
  paused,
  onRetry,
  onAudio,
}: {
  attempts: number;
  paused: boolean;
  onRetry: () => void;
  onAudio: () => void;
}) {
  return (
    <section
      className="pronunciation-stage activity-card"
      aria-label="模拟发音纠正"
    >
      <div className="activity-heading">
        <span className="stage-kicker">LET’S SAY IT TOGETHER</span>
        <span className="simulation-label">模拟示例 · 未录音 / 未评分</span>
      </div>
      <div className="pronunciation-word">
        <span>cat</span>
        <span className="phonetic">/kæt/</span>
        <button
          className="audio-button"
          aria-label="模拟播放 cat 示范"
          onClick={onAudio}
        >
          <Volume2 size={23} />
        </button>
      </div>
      <div className="wave-comparison">
        <div>
          <strong>示例跟读</strong>
          <DemoWave pink />
          <small>静态演示波形</small>
        </div>
        <div>
          <strong>目标示范</strong>
          <DemoWave />
          <small>静态演示波形</small>
        </div>
      </div>
      <div className="pronunciation-tips">
        <h2>一次关注一个发音</h2>
        <ol>
          <li>
            <span>1</span>嘴巴自然张开，把 /æ/ 发得短而清楚。
          </li>
          <li>
            <span>2</span>结尾 /t/ 轻轻收住，不额外加一个音节。
          </li>
          <li>
            <span>3</span>先慢慢练习，再放回 It’s a cat. 中。
          </li>
        </ol>
      </div>
      <div className="pronunciation-actions">
        <button className="primary-button" disabled={paused} onClick={onRetry}>
          {attempts ? <RefreshCw size={19} /> : <Mic size={19} />}模拟再试一次
        </button>
        <span>示例切换 {attempts} 次</span>
      </div>
      {attempts > 0 && (
        <div className="demo-result" role="status">
          <CheckCircle2 size={20} />
          <p>
            示例反馈：
            {attempts % 2
              ? "可以先把注意力放在短元音上，再把整个单词连起来。"
              : "接下来把单词放进一句话里练习，保持自然的节奏。"}
            <small>这是预设指导示例，不是对你发音的识别结果。</small>
          </p>
        </div>
      )}
      <p className="stage-footnote">
        本阶段不采集音频，不生成真实识别结果或发音分数。
      </p>
    </section>
  );
}
