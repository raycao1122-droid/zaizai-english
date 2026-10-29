import { useState } from "react";
import {
  BookOpen,
  Check,
  Download,
  Lightbulb,
  MessageCircle,
  Star,
  Volume2,
} from "lucide-react";
import { animals } from "../data/mockLesson";
import {
  mockVocabulary,
  pronunciationNotes,
  type MockSession,
} from "../data/mockReports";
import { exportMockReport } from "../lib/exportReport";

export function ParentLessonReport({
  session,
  onAudio,
  onArchive,
}: {
  session: MockSession;
  onAudio: () => void;
  onArchive: () => void;
}) {
  const [tab, setTab] = useState("summary");
  const tabs = [
    { id: "summary", text: "本节课总结" },
    { id: "data", text: "学习数据" },
    { id: "pronunciation", text: "发音分析" },
    { id: "participation", text: "课堂表现" },
    { id: "next", text: "下节课建议" },
  ];
  return (
    <section className="parent-report" aria-label="家长学习报告">
      <div className="report-heading">
        <div>
          <span className="stage-kicker">PARENT LESSON REPORT</span>
          <h1>Lesson 01 · Animals</h1>
          <p>
            {session.date} · 示例课时 {session.minutes} 分钟
          </p>
        </div>
        <button
          className="soft-button"
          onClick={() => exportMockReport(session)}
        >
          <Download size={17} />
          导出模拟报告
        </button>
      </div>
      <div className="report-notice">
        <span className="simulation-label">全部数据为模拟</span>
        <p>未采集真实音频，不代表在在的实际成绩、发音水平或掌握程度。</p>
      </div>
      <div className="report-tabs" role="tablist" aria-label="学习报告内容">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`report-${item.id}`}
            id={`report-tab-${item.id}`}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.text}
          </button>
        ))}
      </div>
      <div
        className="report-tab-content"
        role="tabpanel"
        id={`report-${tab}`}
        aria-labelledby={`report-tab-${tab}`}
      >
        {tab === "summary" && (
          <div className="report-columns">
            <div>
              <section className="report-card">
                <h2>
                  <BookOpen size={17} />
                  词汇练习情况 <small>模拟</small>
                </h2>
                <div className="report-vocabulary">
                  {mockVocabulary.map((item) => (
                    <div key={item.word}>
                      <img
                        src={animals.find((a) => a.id === item.word)!.image}
                        alt={item.word}
                      />
                      <strong>{item.word}</strong>
                      <span
                        className={`word-status ${item.status === "需复习" ? "review" : ""}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="report-card">
                <h2>
                  <MessageCircle size={17} />
                  句型练习 <small>模拟</small>
                </h2>
                {[
                  "What’s this?",
                  "It’s a …",
                  "I like …",
                  "Do you have a pet?",
                ].map((sentence, index) => (
                  <div className="sentence-report-row" key={sentence}>
                    <span>{sentence}</span>
                    {index === 2 ? (
                      <small>示例：需提示</small>
                    ) : (
                      <Check size={16} />
                    )}
                  </div>
                ))}
              </section>
            </div>
            <div>
              <section className="report-card">
                <h2>
                  发音关注点 <small>示例，不是实测</small>
                </h2>
                {pronunciationNotes.slice(0, 2).map((item) => (
                  <div className="pronunciation-report-row" key={item.word}>
                    <strong>{item.word}</strong>
                    <span>{item.focus}</span>
                    <button
                      className="small-audio"
                      aria-label={`模拟播放报告单词 ${item.word}`}
                      onClick={onAudio}
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                ))}
                <p className="report-small-copy">
                  cat 的短元音与 rabbit 的音节连接是预设示例提示。
                </p>
              </section>
              <section className="report-card next-report-card">
                <h2>
                  <Lightbulb size={17} />
                  下节课建议
                </h2>
                <p>
                  换一组图片复习动物；把单词放进 I like …
                  中；在轻松对话里再练习一次。
                </p>
              </section>
            </div>
          </div>
        )}
        {tab === "data" && (
          <>
            <div className="report-metrics">
              {[
                { label: "示例时长", value: `${session.minutes} 分钟` },
                {
                  label: "独立回答 · 模拟",
                  value: `${session.independent} 次`,
                },
                { label: "提示次数 · 模拟", value: `${session.hints} 次` },
                { label: "示例词汇", value: "5 个" },
              ].map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="report-card">
              <h2>数据说明</h2>
              <p>
                这里展示预设的家长报告样例，与本次页面里点击了多少次无关。真正的课堂证据、独立回答和发音分析需要后续服务支持。
              </p>
            </div>
          </>
        )}
        {tab === "pronunciation" && (
          <div className="report-card">
            <h2>
              重点发音提示 <small>模拟分析文案</small>
            </h2>
            {pronunciationNotes.map((item) => (
              <div className="report-pronunciation-detail" key={item.word}>
                <div>
                  <strong>{item.word}</strong>
                  <span>{item.focus}</span>
                  <button
                    className="small-audio"
                    aria-label={`模拟播放发音提示 ${item.word}`}
                    onClick={onAudio}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                <p>{item.note}</p>
              </div>
            ))}
            <p className="report-small-copy">
              无录音、无识别结果、无真实发音评分。
            </p>
          </div>
        )}
        {tab === "participation" && (
          <div className="report-card">
            <h2>
              课堂表现 <small>预设模拟</small>
            </h2>
            {["课堂参与", "听力理解", "口语表达", "学习态度"].map(
              (label, index) => (
                <div className="participation-row" key={label}>
                  <span>{label}</span>
                  <span aria-label={`${4 - (index % 2)}颗模拟星星`}>
                    {Array.from({ length: 5 }, (_, star) => (
                      <Star
                        key={star}
                        size={20}
                        fill={star < 4 - (index % 2) ? "#ffca65" : "#e6edf6"}
                        color="transparent"
                      />
                    ))}
                  </span>
                </div>
              ),
            )}
            <p className="report-small-copy">
              星星仅展示报告样式，不是对孩子的真实评价。
            </p>
          </div>
        )}
        {tab === "next" && (
          <div className="report-card next-report-card">
            <h2>下一节，从熟悉的内容自然开始</h2>
            <ol>
              <li>用不同图片复习 rabbit 和 fish，避免只记住原题。</li>
              <li>围绕喜欢的动物，练习 I like … 与完整回答。</li>
              <li>把 /æ/ 放回 cat 和 rabbit 中，少量、自然地练习。</li>
              <li>观察跨情景和间隔复习表现，再判断需要怎样帮助。</li>
            </ol>
            <p className="report-small-copy">
              以上为模拟建议，尚未基于真实学习记录生成。
            </p>
          </div>
        )}
      </div>
      <div className="report-bottom">
        <span>模拟学习报告 · 无正式数据库</span>
        <button className="soft-button" onClick={onArchive}>
          查看学习档案
        </button>
      </div>
    </section>
  );
}
