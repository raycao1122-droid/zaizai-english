import type { AnimalId, VoiceState } from "./mockLesson";

export type StageKind =
  | "preparation"
  | "greeting"
  | "vocabulary"
  | "listening"
  | "pronunciation"
  | "sentence"
  | "scenario"
  | "review"
  | "student-summary"
  | "parent-report"
  | "archive";
export type LessonStep = {
  id: StageKind;
  title: string;
  english: string;
  prompt: string;
  translation: string;
  target: AnimalId;
  voice: VoiceState;
};

export const lessonSteps: LessonStep[] = [
  {
    id: "preparation",
    title: "课堂准备",
    english: "Welcome",
    prompt: "Welcome to our English class!",
    translation: "欢迎来到英语课堂！",
    target: "dog",
    voice: "idle",
  },
  {
    id: "greeting",
    title: "自然问候",
    english: "Hello, Zaizai!",
    prompt: "How are you today?",
    translation: "你今天感觉怎么样？",
    target: "dog",
    voice: "listening",
  },
  {
    id: "vocabulary",
    title: "认识动物",
    english: "Look and Say",
    prompt: "Look! This is a dog.",
    translation: "看，这是一只小狗。",
    target: "dog",
    voice: "speaking",
  },
  {
    id: "listening",
    title: "听说互动",
    english: "Listen and Choose",
    prompt: "Can you find the dog?",
    translation: "你能找到小狗吗？",
    target: "dog",
    voice: "listening",
  },
  {
    id: "pronunciation",
    title: "发音纠正",
    english: "Let’s Say It",
    prompt: "Let’s say “cat” together.",
    translation: "我们一起练习 cat。",
    target: "cat",
    voice: "correcting",
  },
  {
    id: "sentence",
    title: "句型练习",
    english: "Make a Sentence",
    prompt: "What’s this?",
    translation: "这是什么？",
    target: "bird",
    voice: "listening",
  },
  {
    id: "scenario",
    title: "情景对话",
    english: "Let’s Talk",
    prompt: "Do you have a pet?",
    translation: "你有宠物吗？",
    target: "dog",
    voice: "listening",
  },
  {
    id: "review",
    title: "课堂复习",
    english: "Let’s Review",
    prompt: "Which animal can fly?",
    translation: "哪一种动物会飞？",
    target: "bird",
    voice: "listening",
  },
  {
    id: "student-summary",
    title: "在在的课后总结",
    english: "Great Job!",
    prompt: "Great job, Zaizai!",
    translation: "一起回顾今天的示例课堂吧。",
    target: "rabbit",
    voice: "speaking",
  },
  {
    id: "parent-report",
    title: "家长学习报告",
    english: "Lesson Report",
    prompt: "Lesson 01 · Animals",
    translation: "给家长的模拟课后报告",
    target: "cat",
    voice: "idle",
  },
  {
    id: "archive",
    title: "长期英语档案",
    english: "Learning Journey",
    prompt: "Your learning journey",
    translation: "模拟学习历史与复习计划",
    target: "rabbit",
    voice: "idle",
  },
];

export const listeningTargets: AnimalId[] = ["dog", "cat", "bird", "rabbit"];
export const reviewQuestions: {
  prompt: string;
  translation: string;
  target: AnimalId;
  choices: AnimalId[];
}[] = [
  {
    prompt: "Which animal can fly?",
    translation: "哪一种动物会飞？",
    target: "bird",
    choices: ["fish", "rabbit", "bird", "cat"],
  },
  {
    prompt: "Which animal has long ears?",
    translation: "哪一种动物有长耳朵？",
    target: "rabbit",
    choices: ["cat", "bird", "fish", "rabbit"],
  },
];
export const greetingChoices = [
  "I’m good!",
  "I’m happy!",
  "I’m a little sleepy.",
];
export const sentenceChoices = ["It’s a bird.", "I like birds.", "It can fly."];
export const petChoices = [
  { id: "dog", answer: "Yes, I have a dog.", image: "pet-dog.svg" },
  { id: "cat", answer: "Yes, I have a cat.", image: "pet-cat.svg" },
  { id: "none", answer: "No, I don’t.", image: "pet-none.svg" },
];
