import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  ChartNoAxesCombined,
  History,
  RotateCcw,
} from "lucide-react";
import {
  mockHistory,
  mockVocabulary,
  type MockSession,
} from "../data/mockReports";
import { animals } from "../data/mockLesson";

export function LearningArchive({
  reviewed,
  onReview,
  onOpenReport,
}: {
  reviewed: string[];
  onReview: (word: string) => void;
  onOpenReport: (session: MockSession) => void;
}) {
  const [tab, setTab] = useState("progress");
  const [limit, setLimit] = useState(5);
  const [selected, setSelected] = useState(mockHistory[0].id);
  const history = mockHistory.slice(0, limit).reverse();
  const metric = tab === "pronunciation" ? "pronunciation" : "vocabulary";
  const points = history.map((item, index) => ({
    ...item,
    x: 50 + (index / Math.max(1, history.length - 1)) * 520,
    y: 190 - item[metric] * 1.5,
  }));
  const selectedSession = mockHistory.find((item) => item.id === selected)!;
  return (
    <section className="learning-archive" aria-label="长期英语档案">
      <div className="report-heading">
        <div>
          <span className="stage-kicker">ZAIZAI’S LEARNING JOURNEY</span>
          <h1>学习档案</h1>
          <p>慢慢积累，让每一次练习都有迹可循。</p>
        </div>
        <span className="simulation-label">模拟历史 · 非真实学习数据</span>
      </div>
      <div className="report-tabs" role="tablist" aria-label="学习档案内容">
        {[
          { id: "progress", text: "学习进度" },
          { id: "pronunciation", text: "发音成长" },
          { id: "review", text: "错题与复习" },
          { id: "history", text: "课堂记录" },
        ].map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`archive-${item.id}`}
            id={`archive-tab-${item.id}`}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.text}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`archive-${tab}`}
        aria-labelledby={`archive-tab-${tab}`}
      >
        {(tab === "progress" || tab === "pronunciation") && (
          <>
            <div className="chart-heading">
              <h2>
                <ChartNoAxesCombined size={18} />
                {tab === "progress" ? "模拟学习进度趋势" : "模拟发音成长趋势"}
              </h2>
              <div className="period-switch">
                {[3, 5].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setLimit(count);
                      if (
                        !mockHistory
                          .slice(0, count)
                          .some((item) => item.id === selected)
                      )
                        setSelected(mockHistory[0].id);
                    }}
                    aria-pressed={limit === count}
                    className={limit === count ? "active" : ""}
                  >
                    近 {count} 次
                  </button>
                ))}
              </div>
            </div>
            <div className="archive-chart">
              <svg
                viewBox="0 0 620 225"
                role="img"
                aria-label={`模拟趋势：${history.map((item) => `${item.date} 示例值 ${item[metric]}`).join("；")}`}
              >
                {[0, 25, 50, 75, 100].map((value) => (
                  <g key={value}>
                    <line
                      x1="50"
                      x2="585"
                      y1={190 - value * 1.5}
                      y2={190 - value * 1.5}
                      stroke="#e1ebfa"
                      strokeDasharray="3 4"
                    />
                    <text x="38" y={194 - value * 1.5} textAnchor="end">
                      {value}
                    </text>
                  </g>
                ))}
                <polyline
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#327ef3"
                  strokeWidth="3"
                />
                {points.map((point) => (
                  <g key={point.id}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={selected === point.id ? 6 : 4}
                      fill="#327ef3"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text x={point.x} y="214" textAnchor="middle">
                      {point.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="chart-dates">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={selected === item.id ? "active" : ""}
                    aria-pressed={selected === item.id}
                  >
                    {item.date.slice(5)}
                  </button>
                ))}
              </div>
            </div>
            <p className="selected-session" role="status">
              {selectedSession.date} · 模拟示例值 {selectedSession[metric]} /
              100
            </p>
            <p className="report-small-copy">
              曲线与数值均来自预设数据，不是本次录音、发音成绩或掌握率。
            </p>
          </>
        )}
        {tab === "review" && (
          <div className="report-card">
            <h2>
              <RotateCcw size={18} />
              重点复习标记 <small>模拟示例</small>
            </h2>
            <ReviewItems reviewed={reviewed} onReview={onReview} />
          </div>
        )}
        {tab === "history" && (
          <div className="report-card">
            <h2>
              <History size={18} />
              模拟课堂记录
            </h2>
            {mockHistory.map((item) => (
              <div className="archive-history-row" key={item.id}>
                <div>
                  <strong>Lesson 01 · Animals</strong>
                  <small>
                    {item.date} · 示例 {item.minutes} 分钟
                  </small>
                </div>
                <button
                  className="soft-button"
                  onClick={() => onOpenReport(item)}
                >
                  查看模拟报告
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {tab !== "review" && tab !== "history" && (
        <div className="report-card">
          <h2>
            <Bookmark size={18} />
            接下来可以复习 <small>模拟标记</small>
          </h2>
          <ReviewItems reviewed={reviewed} onReview={onReview} />
        </div>
      )}
    </section>
  );
}

function ReviewItems({
  reviewed,
  onReview,
}: {
  reviewed: string[];
  onReview: (word: string) => void;
}) {
  return (
    <div className="review-items">
      {mockVocabulary
        .filter((item) => item.word === "rabbit" || item.word === "fish")
        .map((item) => (
          <div key={item.word}>
            <img
              src={animals.find((a) => a.id === item.word)!.image}
              alt={item.word}
            />
            <div>
              <strong>{item.word}</strong>
              <small>{item.note}</small>
            </div>
            <button
              className={
                reviewed.includes(item.word)
                  ? "review-mark marked"
                  : "review-mark"
              }
              aria-pressed={reviewed.includes(item.word)}
              onClick={() => onReview(item.word)}
            >
              {reviewed.includes(item.word) ? "已标记复习" : "标记复习"}
            </button>
          </div>
        ))}
    </div>
  );
}
