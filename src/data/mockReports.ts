import type { AnimalId } from "./mockLesson";

export type MockSession = {
  id: string;
  date: string;
  minutes: number;
  independent: number;
  hints: number;
  vocabulary: number;
  pronunciation: number;
  participation: number;
};
export const mockHistory: MockSession[] = [
  {
    id: "demo-1028",
    date: "2026-10-28",
    minutes: 20,
    independent: 8,
    hints: 3,
    vocabulary: 82,
    pronunciation: 78,
    participation: 92,
  },
  {
    id: "demo-1022",
    date: "2026-10-22",
    minutes: 18,
    independent: 6,
    hints: 5,
    vocabulary: 75,
    pronunciation: 72,
    participation: 88,
  },
  {
    id: "demo-1015",
    date: "2026-10-15",
    minutes: 20,
    independent: 5,
    hints: 6,
    vocabulary: 68,
    pronunciation: 65,
    participation: 85,
  },
  {
    id: "demo-1008",
    date: "2026-10-08",
    minutes: 16,
    independent: 4,
    hints: 7,
    vocabulary: 61,
    pronunciation: 58,
    participation: 82,
  },
  {
    id: "demo-1001",
    date: "2026-10-01",
    minutes: 15,
    independent: 3,
    hints: 8,
    vocabulary: 52,
    pronunciation: 49,
    participation: 78,
  },
];
export const mockVocabulary: {
  word: AnimalId;
  status: string;
  note: string;
}[] = [
  { word: "dog", status: "已练习", note: "换一张图片再认一认。" },
  { word: "cat", status: "已练习", note: "关注短元音 /æ/ 和结尾 /t/。" },
  { word: "bird", status: "已练习", note: "试着说 It’s a bird.。" },
  { word: "rabbit", status: "需复习", note: "把两个音节连起来练习。" },
  { word: "fish", status: "新词", note: "和生活里的小鱼建立联系。" },
];
export const pronunciationNotes = [
  {
    word: "cat",
    focus: "/æ/",
    note: "嘴巴自然张开，声音短而清楚；结尾 /t/ 轻轻收住。",
  },
  {
    word: "rabbit",
    focus: "/ˈræb.ɪt/",
    note: "先慢读两个音节，再轻轻连起来，不必反复纠正每个音。",
  },
  {
    word: "three",
    focus: "/θ/",
    note: "下一节的示例复习项：舌尖轻触上下齿间，轻轻送气。",
  },
];
export type CurriculumMaterial = {
  id: string;
  name: string;
  kind: string;
  size: number | null;
  local: boolean;
};
export const mockMaterials: CurriculumMaterial[] = [
  {
    id: "sample-lesson",
    name: "Lesson 01 · Animals 示例课件",
    kind: "示例课程",
    size: null,
    local: false,
  },
  {
    id: "sample-book",
    name: "四年级英语教材 · 示例条目",
    kind: "教材入口",
    size: null,
    local: false,
  },
];
