import { useState } from "react";
import { BookMarked, RotateCcw, Volume2 } from "lucide-react";
import { animals } from "../data/mockLesson";
import { mockVocabulary } from "../data/mockReports";
import type { ChoiceEvidence } from "../hooks/useClassroom";

export function WordBook({
  mistakes,
  evidence,
  reviewed,
  onReview,
  onAudio,
  onPractice,
}: {
  mistakes: boolean;
  evidence: ChoiceEvidence[];
  reviewed: string[];
  onReview: (word: string) => void;
  onAudio: () => void;
  onPractice: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const wrong = evidence.filter((item) => !item.correct);
  const words = mockVocabulary.filter(
    (item) =>
      filter !== "review" || item.status === "需复习" || item.status === "新词",
  );
  return (
    <section
      className="word-book"
      aria-label={mistakes ? "错题与复习" : "单词本"}
    >
      <div className="library-intro">
        {mistakes ? <RotateCcw size={30} /> : <BookMarked size={30} />}
        <div>
          <h3>{mistakes ? "错题与复习" : "今天的动物单词"}</h3>
          <p>复习标记保存在本次页面中，不代表已掌握。</p>
        </div>
        <span className="simulation-label">模拟学习资料</span>
      </div>
      {mistakes && (
        <div className="report-card">
          <h2>
            本页点选记录 <small>仅记录识词点击</small>
          </h2>
          {wrong.length === 0 ? (
            <p className="empty-state">
              本页还没有选错的记录，可以先去课堂试一试。
            </p>
          ) : (
            wrong.map((item, index) => (
              <div className="mistake-row" key={index}>
                <span>第 {index + 1} 条</span>
                <span>
                  目标 <strong>{item.target}</strong>
                </span>
                <span>
                  选了 <strong>{item.answer}</strong>
                </span>
              </div>
            ))
          )}
          <p className="report-small-copy">
            这些是当前页面的图片点选记录，不是发音或听力评估。
          </p>
        </div>
      )}
      <div className="word-filter">
        <button
          onClick={() => setFilter("all")}
          className={filter === "all" ? "active" : ""}
          aria-pressed={filter === "all"}
        >
          全部示例单词
        </button>
        <button
          onClick={() => setFilter("review")}
          className={filter === "review" ? "active" : ""}
          aria-pressed={filter === "review"}
        >
          待复习示例
        </button>
      </div>
      <div className="word-book-grid">
        {words.map((item) => (
          <article key={item.word}>
            <img
              src={animals.find((a) => a.id === item.word)!.image}
              alt={item.word}
            />
            <div>
              <strong>{item.word}</strong>
              <button
                className="small-audio"
                onClick={onAudio}
                aria-label={`模拟播放单词本 ${item.word}`}
              >
                <Volume2 size={16} />
              </button>
            </div>
            <p>{item.note}</p>
            <button
              className={`review-mark ${reviewed.includes(item.word) ? "marked" : ""}`}
              aria-pressed={reviewed.includes(item.word)}
              onClick={() => onReview(item.word)}
            >
              {reviewed.includes(item.word) ? "已标记复习" : "标记复习"}
            </button>
          </article>
        ))}
      </div>
      <div className="library-actions">
        <span className="report-small-copy">
          列表状态与建议为预设模拟示例。
        </span>
        <button className="primary-button" onClick={onPractice}>
          去课堂复习
        </button>
      </div>
    </section>
  );
}
