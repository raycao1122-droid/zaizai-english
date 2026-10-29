import { useReducer } from "react";
import {
  animals,
  mockConversation,
  type AnimalId,
  type Message,
  type PanelTab,
  type VoiceState,
} from "../data/mockLesson";
import {
  greetingChoices,
  lessonSteps,
  listeningTargets,
  petChoices,
  reviewQuestions,
  sentenceChoices,
} from "../data/lessonFlow";

export type ChoiceEvidence = {
  stage: string;
  target: AnimalId;
  answer: AnimalId;
  correct: boolean;
};
export type ClassroomState = {
  step: number;
  lastLessonStep: number;
  selected: AnimalId | null;
  hint: boolean;
  learnedAnimal: AnimalId;
  quizRound: number;
  reviewRound: number;
  greeting: string;
  sentence: string;
  pet: string;
  retries: number;
  hintRequests: number;
  choices: ChoiceEvidence[];
  messages: Message[];
  collapsed: boolean;
  panelTab: PanelTab;
  draft: string;
  notes: string;
  baseVoice: VoiceState;
  muted: boolean;
  paused: boolean;
  exited: boolean;
  mood: string;
  speed: string;
  translate: boolean;
};
type Action =
  | { type: "navigate"; index: number }
  | { type: "select"; animal: AnimalId }
  | { type: "answer"; text: string }
  | {
      type: "voice-message";
      message: { id: string; speaker: "Emma" | "在在"; text: string };
    }
  | { type: "ai-reply"; text: string; reply: string; step: number }
  | { type: "question" }
  | { type: "retry" }
  | { type: "hint" }
  | { type: "reset" | "resume" | "exit" | "pause" | "mute" }
  | { type: "voice"; value: VoiceState }
  | {
      type: "patch";
      patch: Partial<
        Pick<
          ClassroomState,
          | "collapsed"
          | "panelTab"
          | "draft"
          | "notes"
          | "mood"
          | "speed"
          | "translate"
        >
      >;
    };

function initialState(): ClassroomState {
  return {
    step: 0,
    lastLessonStep: 0,
    selected: null,
    hint: false,
    learnedAnimal: "dog",
    quizRound: 0,
    reviewRound: 0,
    greeting: "",
    sentence: "",
    pet: "",
    retries: 0,
    hintRequests: 0,
    choices: [],
    messages: mockConversation,
    collapsed: false,
    panelTab: "conversation",
    draft: "",
    notes: "",
    baseVoice: "idle",
    muted: false,
    paused: false,
    exited: false,
    mood: "speaking",
    speed: "normal",
    translate: false,
  };
}

export function stageContext(state: ClassroomState) {
  const step = lessonSteps[state.step];
  const review = reviewQuestions[state.reviewRound % reviewQuestions.length];
  const target =
    step.id === "vocabulary"
      ? state.learnedAnimal
      : step.id === "listening"
        ? listeningTargets[state.quizRound % listeningTargets.length]
        : step.id === "review"
          ? review.target
          : step.target;
  const animal = animals.find((a) => a.id === target)!;
  const prompt =
    step.id === "vocabulary"
      ? `Look! This is a ${target}.`
      : step.id === "listening"
        ? `Can you find the ${target}?`
        : step.id === "review"
          ? review.prompt
          : step.prompt;
  const translation =
    step.id === "vocabulary"
      ? `看，这是一只${animal.chinese}。`
      : step.id === "listening"
        ? `你能找到${animal.chinese}吗？`
        : step.id === "review"
          ? review.translation
          : step.translation;
  return {
    step,
    target,
    prompt,
    translation,
    choices: step.id === "review" ? review.choices : listeningTargets,
  };
}

function conversation(
  state: ClassroomState,
  ...entries: Omit<Message, "id">[]
) {
  return [
    ...state.messages,
    ...entries.map((entry, index) => ({
      ...entry,
      id: `message-${state.messages.length + index}`,
    })),
  ];
}

function choose(state: ClassroomState, animal: AnimalId): ClassroomState {
  if (state.paused || state.exited) return state;
  const context = stageContext(state);
  if (context.step.id === "vocabulary") {
    return {
      ...state,
      learnedAnimal: animal,
      baseVoice: "speaking",
      messages: conversation(state, {
        speaker: "Emma",
        text: `This is a ${animal}. Let’s say it together.`,
        translation: "这是示例认词与跟读提示，未播放或采集音频。",
      }),
    };
  }
  if (context.step.id !== "listening" && context.step.id !== "review")
    return state;
  const correct = animal === context.target;
  return {
    ...state,
    selected: animal,
    baseVoice: "speaking",
    mood: correct ? "encouraging" : "thinking",
    choices: [
      ...state.choices,
      {
        stage: context.step.id,
        target: context.target,
        answer: animal,
        correct,
      },
    ],
    messages: conversation(
      state,
      { speaker: "在在", text: animal },
      {
        speaker: "Emma",
        text: correct
          ? `Great! That’s right. It’s a ${animal}!`
          : `Good try! That’s a ${animal}. Look again and find the ${context.target}.`,
        translation: correct
          ? "答对了，这是本页点选反馈，不代表口语或掌握度评估。"
          : "再观察一下，也可以打开提示。",
      },
    ),
  };
}

function reducer(state: ClassroomState, action: Action): ClassroomState {
  const context = stageContext(state);
  switch (action.type) {
    case "reset":
      return initialState();
    case "resume":
      return { ...state, exited: false, paused: false };
    case "exit":
      return { ...state, exited: true };
    case "pause":
      return { ...state, paused: !state.paused };
    case "mute":
      return { ...state, muted: !state.muted };
    case "patch":
      return { ...state, ...action.patch };
    case "voice":
      return {
        ...state,
        paused: action.value === "paused",
        muted: action.value === "muted",
        baseVoice:
          action.value === "paused" || action.value === "muted"
            ? state.baseVoice
            : action.value,
      };
    case "hint":
      return {
        ...state,
        hint: !state.hint,
        hintRequests: state.hintRequests + (state.hint ? 0 : 1),
      };
    case "navigate": {
      if (
        state.paused ||
        state.exited ||
        !lessonSteps[action.index] ||
        action.index === state.step
      )
        return state;
      const next = {
        ...state,
        step: action.index,
        lastLessonStep: action.index < 9 ? action.index : state.lastLessonStep,
        selected: null,
        hint: false,
        collapsed: action.index >= 9 ? true : state.collapsed,
        baseVoice: lessonSteps[action.index].voice,
        mood: action.index === 4 ? "thinking" : "speaking",
      };
      const nextContext = stageContext(next);
      return {
        ...next,
        messages: conversation(state, {
          speaker: "Emma",
          text: nextContext.prompt,
          translation: nextContext.translation,
        }),
      };
    }
    case "select":
      return choose(state, action.animal);
    case "question": {
      if (
        state.paused ||
        state.exited ||
        !["listening", "review"].includes(context.step.id)
      )
        return state;
      const next = {
        ...state,
        selected: null,
        hint: false,
        quizRound: state.quizRound + (context.step.id === "listening" ? 1 : 0),
        reviewRound: state.reviewRound + (context.step.id === "review" ? 1 : 0),
        baseVoice: "listening" as const,
      };
      const nextContext = stageContext(next);
      return {
        ...next,
        messages: conversation(state, {
          speaker: "Emma",
          text: nextContext.prompt,
          translation: nextContext.translation,
        }),
      };
    }
    case "retry": {
      if (state.paused || state.exited || context.step.id !== "pronunciation")
        return state;
      return {
        ...state,
        retries: state.retries + 1,
        baseVoice: "correcting",
        messages: conversation(state, {
          speaker: "Emma",
          text: "Let’s try this example together: cat.",
          translation: "切换一次模拟跟读示例；未录音、识别或评分。",
        }),
      };
    }
    case "voice-message": {
      if (state.paused || state.exited) return state;
      const item: Message = {
        ...action.message,
        source: "voice",
        translation: "实时语音字幕；未进行发音评分，未写入学习档案。",
      };
      const index = state.messages.findIndex((m) => m.id === item.id);
      return {
        ...state,
        messages:
          index < 0
            ? [...state.messages, item]
            : state.messages.map((m) => (m.id === item.id ? item : m)),
      };
    }
    case "ai-reply": {
      if (state.paused || state.exited || state.step !== action.step)
        return state;
      return {
        ...state,
        draft: "",
        panelTab: "conversation",
        baseVoice: "idle",
        messages: conversation(
          state,
          { speaker: "在在", text: action.text },
          {
            speaker: "Emma",
            text: action.reply,
            translation: "AI 文字回复；未采集音频或进行发音评分。",
          },
        ),
      };
    }
    case "answer": {
      if (state.paused || state.exited || !action.text.trim()) return state;
      const text = action.text.trim();
      const animal = animals.find((a) => a.id === text.toLowerCase());
      if (
        animal &&
        ["listening", "review", "vocabulary"].includes(context.step.id)
      )
        return choose(
          { ...state, draft: "", panelTab: "conversation" },
          animal.id,
        );
      const greeting =
        context.step.id === "greeting" && greetingChoices.includes(text);
      const sentence =
        context.step.id === "sentence" && sentenceChoices.includes(text);
      const pet =
        context.step.id === "scenario" &&
        petChoices.some((p) => p.answer === text);
      const reply = greeting
        ? "Thanks for sharing! Let’s meet some animals."
        : sentence
          ? "Nice example! We can use a whole sentence."
          : pet
            ? "Thanks! Let’s talk about our favourite animals."
            : "Let’s try one of the example answers on the lesson card.";
      return {
        ...state,
        greeting: greeting ? text : state.greeting,
        sentence: sentence ? text : state.sentence,
        pet: pet ? text : state.pet,
        draft: "",
        panelTab: "conversation",
        baseVoice: "speaking",
        messages: conversation(
          state,
          { speaker: "在在", text },
          {
            speaker: "Emma",
            text: reply,
            translation: "本地固定示例回复，未进行 AI 理解或语音评估。",
          },
        ),
      };
    }
  }
}

export function useClassroom() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  return { state, dispatch, context: stageContext(state) };
}
