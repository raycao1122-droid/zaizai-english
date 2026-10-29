import { assetUrl } from "../lib/assets";
import { lessonSteps } from "./lessonFlow";

export type AnimalId = "dog" | "cat" | "bird" | "rabbit" | "fish";
export type PanelTab = "conversation" | "tips" | "notes";
export type VoiceState =
  | "speaking"
  | "listening"
  | "thinking"
  | "correcting"
  | "muted"
  | "paused"
  | "disconnected"
  | "idle";
export type Message = {
  id: string;
  speaker: "Emma" | "在在";
  text: string;
  translation?: string;
};

export const animals: {
  id: AnimalId;
  chinese: string;
  hint: string;
  image: string;
}[] = [
  {
    id: "dog",
    chinese: "小狗",
    hint: "Look for the puppy with floppy ears. 找一找垂着耳朵的小狗。",
    image: assetUrl("dog.svg"),
  },
  {
    id: "cat",
    chinese: "小猫",
    hint: "Look for the kitten with whiskers. 找一找有胡须的小猫。",
    image: assetUrl("cat.svg"),
  },
  {
    id: "bird",
    chinese: "小鸟",
    hint: "Look for the animal with blue wings. 找一找有蓝色翅膀的小动物。",
    image: assetUrl("bird.svg"),
  },
  {
    id: "rabbit",
    chinese: "兔子",
    hint: "Look for the animal with long ears. 找一找长耳朵的小动物。",
    image: assetUrl("rabbit.svg"),
  },
  {
    id: "fish",
    chinese: "小鱼",
    hint: "Look for the animal that swims. 找一找在水里游的小动物。",
    image: assetUrl("fish.svg"),
  },
];

export const mockLesson = {
  title: "Lesson 01 · Animals",
  unit: "Unit 1",
  name: "Amazing Animals",
  steps: lessonSteps,
};

export const mockConversation: Message[] = [
  {
    id: "welcome",
    speaker: "Emma",
    text: "Hi, Zaizai! Welcome to our English class! Are you ready to meet some animals?",
    translation: "你好，在在！欢迎来到英语课堂。准备好认识一些动物了吗？",
  },
];

export const mockStudentProgress = {
  level: 1,
  stars: 3,
  total: 10,
  simulated: true,
};
export const voiceLabels: Record<VoiceState, string> = {
  speaking: "Emma 正在说话",
  listening: "正在聆听",
  thinking: "Emma 正在思考",
  correcting: "纠错状态",
  muted: "麦克风已静音",
  paused: "课堂已暂停",
  disconnected: "连接已断开",
  idle: "准备就绪",
};
export const voiceCycle: VoiceState[] = [
  "listening",
  "speaking",
  "thinking",
  "correcting",
  "disconnected",
  "idle",
];
