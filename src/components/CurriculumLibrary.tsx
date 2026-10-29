import { useRef, useState } from "react";
import { BookOpen, FilePlus2, FolderOpen, Search, Trash2 } from "lucide-react";
import type { CurriculumMaterial } from "../data/mockReports";

export function CurriculumLibrary({
  materials,
  onAdd,
  onRemove,
  onStart,
  onClose,
}: {
  materials: CurriculumMaterial[];
  onAdd: (items: CurriculumMaterial[]) => void;
  onRemove: (id: string) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const visible = materials.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  const preview = materials.find((item) => item.id === selected);
  return (
    <section className="curriculum-library" aria-label="课程与教材资料入口">
      <div className="library-intro">
        <BookOpen size={34} />
        <div>
          <h3>课程与教材资料</h3>
          <p>学校教材、教辅和课堂资料的统一入口。</p>
        </div>
        <span className="simulation-label">M2 入口演示</span>
      </div>
      <div className="curriculum-notice">
        本阶段只展示示例课程和本机文件信息。所选文件不会上传，也不会解析内容。
      </div>
      <div className="library-toolbar">
        <label>
          <Search size={18} />
          <input
            aria-label="搜索资料"
            placeholder="搜索资料名称"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className="primary-button"
          onClick={() => input.current?.click()}
        >
          <FilePlus2 size={17} />
          选择本机资料
        </button>
        <input
          ref={input}
          className="sr-only"
          type="file"
          multiple
          aria-label="选择教材文件"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.mp3,.wav,.mp4"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            const accepted = files.filter((file) =>
              /\.(pdf|docx?|pptx?|png|jpe?g|mp3|wav|mp4)$/i.test(file.name),
            );
            onAdd(
              accepted.map((file) => ({
                id: crypto.randomUUID(),
                name: file.name,
                kind: file.name.split(".").pop()!.toUpperCase(),
                size: file.size,
                local: true,
              })),
            );
            setMessage(
              `${accepted.length} 个文件已在本页登记，未上传、未解析。${files.length !== accepted.length ? "部分不支持的类型已忽略。" : ""}`,
            );
            event.target.value = "";
          }}
        />
      </div>
      <div className="material-list">
        {visible.length === 0 && (
          <p className="empty-state">没有匹配的资料，试试其他名称。</p>
        )}
        {visible.map((item) => (
          <div className="material-row" key={item.id}>
            <FolderOpen size={25} />
            <div>
              <strong>{item.name}</strong>
              <small>
                {item.kind} ·{" "}
                {item.local
                  ? `${formatSize(item.size || 0)} · 仅本页登记`
                  : "模拟条目，不包含实际文件"}
              </small>
              <span>{item.local ? "未上传 · 未解析" : "示例数据"}</span>
            </div>
            <button
              className="soft-button"
              onClick={() => setSelected(item.id)}
            >
              查看信息
            </button>
            {item.local && (
              <button
                className="icon-button"
                aria-label={`移除资料 ${item.name}`}
                onClick={() => {
                  onRemove(item.id);
                  if (selected === item.id) setSelected(null);
                }}
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
        ))}
      </div>
      {preview && (
        <div className="material-preview" role="status">
          <strong>{preview.name}</strong>
          <p>
            {preview.local
              ? "已读取文件名、类型和大小；没有读取文件正文、上传文件或解析教材。"
              : "这是展示资料库结构的模拟条目，不代表已导入学校教材。"}
          </p>
          <button className="soft-button" onClick={() => setSelected(null)}>
            收起资料信息
          </button>
        </div>
      )}
      {message && (
        <p className="library-message" role="status">
          {message}
        </p>
      )}
      <div className="library-actions">
        <button className="soft-button" onClick={onClose}>
          继续本次课堂
        </button>
        <button className="primary-button" onClick={onStart}>
          从头演示 Animals 示例课
        </button>
      </div>
      <p className="stage-footnote">
        从头演示会清空本次课堂草稿和笔记；资料登记只在当前页面保留。
      </p>
    </section>
  );
}
function formatSize(size: number) {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
