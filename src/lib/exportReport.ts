import { mockVocabulary, type MockSession } from "../data/mockReports";

export function exportMockReport(session: MockSession) {
  const rows = [
    ["在在的英语课堂", "模拟报告 / 非真实学习评估"],
    ["示例课程", "Lesson 01 · Animals"],
    ["示例日期", session.date],
    ["示例时长（分钟）", String(session.minutes)],
    ["独立回答（模拟次数）", String(session.independent)],
    ["提示（模拟次数）", String(session.hints)],
    ["单词", "模拟练习状态", "示例复习建议"],
    ...mockVocabulary.map((item) => [item.word, item.status, item.note]),
    [
      "说明",
      "所有报告数据均为预设模拟值；未采集音频、未进行发音或掌握度评估。",
    ],
  ];
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `zaizai-animals-mock-report-${session.date}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
