export type AnimalId = "dog" | "cat" | "bird" | "rabbit";
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
    image: "/assets/dog.svg",
  },
  {
    id: "cat",
    chinese: "小猫",
    hint: "Look for the kitten with whiskers. 找一找有胡须的小猫。",
    image: "/assets/cat.svg",
  },
  {
    id: "bird",
    chinese: "小鸟",
    hint: "Look for the animal with blue wings. 找一找有蓝色翅膀的小动物。",
    image: "/assets/bird.svg",
  },
  {
    id: "rabbit",
    chinese: "兔子",
    hint: "Look for the animal with long ears. 找一找长耳朵的小动物。",
    image: "/assets/rabbit.svg",
  },
];

export const mockLesson = {
  title: "Lesson 01 · Animals",
  unit: "Unit 1",
  name: "Amazing Animals",
  steps: [
    { title: "认识动物", target: "dog" },
    { title: "找一找小猫", target: "cat" },
    { title: "找一找小鸟", target: "bird" },
    { title: "找一找兔子", target: "rabbit" },
    { title: "动物小复习", target: "dog" },
  ] as { title: string; target: AnimalId }[],
};

export const mockConversation: Message[] = [
  {
    id: "welcome",
    speaker: "Emma",
    text: "Hi, Zaizai! Today we’re learning about animals. Can you find the dog?",
    translation: "你好，在在！我们今天学习动物。你能找到小狗吗？",
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
