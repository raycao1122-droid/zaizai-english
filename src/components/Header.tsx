import {
  BookOpen,
  Home,
  BookMarked,
  ClipboardCheck,
  NotebookPen,
  ChartNoAxesCombined,
  ChevronDown,
  Star,
} from "lucide-react";
import { mockStudentProgress } from "../data/mockLesson";
import { assetUrl } from "../lib/assets";

export function Header({
  onNavigate,
  onSettings,
  active = "上课",
}: {
  onNavigate: (name: string) => void;
  onSettings: () => void;
  active?: string;
}) {
  const nav = [
    { text: "上课", Icon: Home },
    { text: "课程", Icon: BookMarked },
    { text: "单词本", Icon: NotebookPen },
    { text: "错题本", Icon: ClipboardCheck },
    { text: "学习报告", Icon: ChartNoAxesCombined },
  ];
  return (
    <header className="header">
      <a className="brand" href="#classroom" aria-label="在在的英语课堂首页">
        <BookOpen className="brand-icon" size={46} strokeWidth={1.9} />
        <span>
          <strong>在在的英语课堂</strong>
          <small>Zaizai’s AI English Class</small>
        </span>
      </a>
      <nav aria-label="主导航">
        {nav.map(({ text, Icon }) => (
          <button
            key={text}
            className={`nav-item ${text === active ? "active" : ""}`}
            onClick={() => onNavigate(text)}
            aria-current={text === active ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{text}</span>
          </button>
        ))}
      </nav>
      <div className="student-progress" title="模拟学习进度">
        <Star size={23} fill="#ffc95c" color="#ffb740" />
        <span>Lv.{mockStudentProgress.level}</span>
        <span className="mini-track">
          <i
            style={{
              width: `${(mockStudentProgress.stars / mockStudentProgress.total) * 100}%`,
            }}
          />
        </span>
        <span>3/10</span>
        <span className="tiny-sim">模拟</span>
      </div>
      <button
        className="profile"
        onClick={onSettings}
        aria-label="在在的课堂设置"
      >
        <img src={assetUrl("student.svg")} alt="在在的设计稿头像" />
        <strong>在在</strong>
        <ChevronDown size={19} />
      </button>
    </header>
  );
}
