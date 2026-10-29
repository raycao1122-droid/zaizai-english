import { useRef, useState } from "react";
import {
  BookOpen,
  FilePlus2,
  Search,
  Trash2,
  Clock3,
  FolderOpen,
  Languages,
  Calculator,
  UploadCloud,
  Check,
  ChevronRight,
} from "lucide-react";
import type { CurriculumMaterial } from "../data/mockReports";
import { assetUrl } from "../lib/assets";
import "./curriculum-v2.css";

export function CurriculumLibrary({
  materials,
  onAdd,
  onRemove,
  onStart,
  onClose,
  recent,
  onUse,
  selected,
  onSelect,
}: {
  materials: CurriculumMaterial[];
  onAdd: (items: CurriculumMaterial[]) => void;
  onRemove: (id: string) => void;
  onStart: () => void;
  onClose: () => void;
  recent: string[];
  onUse: (id: string) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("推荐课程");
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [chapters, setChapters] = useState(false);
  const [sort, setSort] = useState("default");
  const [grade, setGrade] = useState("all");
  const visible = materials.filter(
    (item) =>
      item.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (category !== "我的资料" || item.local) &&
      (category !== "最近使用" || recent.includes(item.id)) &&
      !["语文教材", "数学教材"].includes(category) &&
      (category !== "英语教材" || !item.local) &&
      (grade === "all" || (!item.local && item.id === "sample-book")),
  );
  if (sort === "name")
    visible.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (sort === "recent")
    visible.sort((a, b) => {
      const order = (id: string) =>
        recent.includes(id) ? recent.indexOf(id) : Infinity;
      return order(a.id) - order(b.id);
    });
  const preview = materials.find((item) => item.id === detail);
  const recentItems = recent
    .map((id) => materials.find((item) => item.id === id))
    .filter((item): item is CurriculumMaterial => Boolean(item));
  function choose(item: CurriculumMaterial) {
    onSelect(item.id);
    onUse(item.id);
  }
  function info(item: CurriculumMaterial, directory = false) {
    setDetail(item.id);
    setChapters(directory);
    onUse(item.id);
  }
  function cover(item: CurriculumMaterial) {
    return (
      <div
        className={`shelf-cover ${item.id === "sample-book" ? "shelf-cover-gold" : item.local ? "shelf-cover-local" : ""}`}
        aria-label="示意封面，非真实教材封面"
      >
        <small>{item.local ? item.kind : "DEMO EDITION"}</small>
        <strong>
          {item.local
            ? "我的资料"
            : item.id === "sample-book"
              ? "英语"
              : "Animals"}
        </strong>
        {item.local ? (
          <FolderOpen size={35} />
        ) : (
          <img
            src={assetUrl(item.id === "sample-book" ? "cat.svg" : "dog.svg")}
            alt=""
          />
        )}
        <span>{item.local ? "仅文件信息" : "示例封面"}</span>
      </div>
    );
  }
  return (
    <section
      className="curriculum-library shelf-v2"
      aria-label="课程与教材资料入口"
    >
      <p className="shelf-subtitle">选择教材和课程，与 Emma 一起探索英语世界</p>
      <div className="shelf-layout">
        <nav className="shelf-nav" aria-label="教材分类">
          {[
            { name: "推荐课程", Icon: BookOpen },
            { name: "英语教材", Icon: Languages },
            { name: "语文教材", Icon: BookOpen },
            { name: "数学教材", Icon: Calculator },
            { name: "我的资料", Icon: FolderOpen },
            { name: "最近使用", Icon: Clock3 },
          ].map(({ name, Icon }) => (
            <button
              key={name}
              className={category === name ? "active" : ""}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              <Icon size={21} />
              <span>{name}</span>
            </button>
          ))}
          <p>
            前端演示书架
            <br />
            未接入教材与同步服务
          </p>
        </nav>
        <div className="shelf-main">
          <div className="shelf-banner">
            <img src={assetUrl("emma.svg")} alt="项目原有 Emma 角色" />
            <div>
              <span>LEARN WITH EMMA</span>
              <h3>选择教材，开始学习吧！</h3>
              <p>从熟悉的内容出发，发现每一天的小进步。</p>
              <small>课程内容为示例，尚未根据教材生成教学内容。</small>
            </div>
            <BookOpen className="shelf-banner-book" size={75} />
          </div>
          <div className="library-toolbar shelf-search">
            <label>
              <Search size={18} />
              <input
                aria-label="搜索资料"
                placeholder="搜索教材或资料名称"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span>全部为示例条目或本页文件信息</span>
          </div>
          {category === "推荐课程" && !query && (
            <section className="shelf-recent" aria-label="最近使用">
              <div className="shelf-section-title">
                <h3>
                  <Clock3 size={20} />
                  最近使用
                </h3>
                <button onClick={() => setCategory("最近使用")}>
                  查看全部 <ChevronRight size={15} />
                </button>
              </div>
              {recentItems.length ? (
                <div className="shelf-recent-grid">
                  {recentItems.slice(0, 3).map((item) => (
                    <article key={item.id}>
                      {cover(item)}
                      <div>
                        <h4>{item.name}</h4>
                        <small>本页最近查看 / 选择</small>
                        <p>尚未记录学习进度</p>
                        <button onClick={() => info(item)}>
                          再次查看 <ChevronRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="shelf-empty-recent">
                  <Clock3 size={25} />
                  <div>
                    <strong>还没有最近使用的资料</strong>
                    <p>
                      选择教材或查看信息后，会显示在这里。记录仅保留在本页。
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}
          <section aria-label="教材书架">
            <div className="shelf-section-title">
              <h3>
                <BookOpen size={21} />
                {category === "推荐课程" ? "推荐教材" : category}
              </h3>
              <div className="shelf-filters">
                <select
                  aria-label="筛选年级"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  <option value="all">全部年级</option>
                  <option value="four">四年级 · 示例</option>
                </select>
                <select
                  aria-label="教材排序"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="default">默认排序</option>
                  <option value="name">名称排序</option>
                  <option value="recent">本页最近使用</option>
                </select>
              </div>
            </div>
            <div className="material-list shelf-grid">
              {!visible.length && (
                <p className="empty-state">
                  {category === "语文教材" || category === "数学教材"
                    ? "此分类尚无资料，未接入真实教材库。"
                    : "没有匹配的资料，试试其他名称或分类。"}
                </p>
              )}
              {visible.map((item) => (
                <article
                  className={`material-row shelf-card ${selected === item.id ? "selected" : ""}`}
                  key={item.id}
                >
                  <button
                    className="shelf-card-select"
                    aria-label={`选择教材 ${item.name}`}
                    aria-pressed={selected === item.id}
                    onClick={() => choose(item)}
                  >
                    {cover(item)}
                    <div>
                      <strong>{item.name}</strong>
                      <span className="shelf-chip">
                        {item.local ? item.kind : "示例教材"}
                      </span>
                      <small>
                        {item.local
                          ? `${formatSize(item.size || 0)} · 仅本页登记`
                          : "非官方教材 · 无真实学习进度"}
                      </small>
                    </div>
                    {selected === item.id && (
                      <Check className="shelf-selected-icon" size={22} />
                    )}
                  </button>
                  <div className="shelf-card-actions">
                    <button className="soft-button" onClick={() => info(item)}>
                      查看信息
                    </button>
                    <button onClick={() => info(item, true)}>章节目录</button>
                    {item.local && (
                      <button
                        className="icon-button"
                        aria-label={`移除资料 ${item.name}`}
                        onClick={() => {
                          onRemove(item.id);
                          if (detail === item.id) setDetail(null);
                          if (selected === item.id) onSelect(null);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    className={`shelf-choose ${selected === item.id ? "active" : ""}`}
                    onClick={() => choose(item)}
                  >
                    {selected === item.id ? (
                      <>
                        <Check size={16} />
                        已选择
                      </>
                    ) : (
                      "选择教材"
                    )}
                  </button>
                </article>
              ))}
            </div>
          </section>
          {preview && (
            <section className="material-preview shelf-detail" role="status">
              <div className="shelf-section-title">
                <strong>{preview.name}</strong>
                <button onClick={() => setDetail(null)}>收起资料信息</button>
              </div>
              <div className="shelf-detail-tabs">
                <button
                  aria-pressed={!chapters}
                  onClick={() => setChapters(false)}
                >
                  资料信息
                </button>
                <button
                  aria-pressed={chapters}
                  onClick={() => setChapters(true)}
                >
                  章节目录
                </button>
              </div>
              <p>
                {chapters
                  ? "尚无可用章节目录。真实教材解析尚未接入，不会凭空生成章节。"
                  : preview.local
                    ? "已读取文件名、类型和大小；没有读取文件正文、上传文件或解析教材。"
                    : "这是展示资料库结构的模拟条目，不代表已导入学校教材。"}
              </p>
            </section>
          )}
          <section className="shelf-upload" aria-label="上传本地资料">
            <UploadCloud size={42} />
            <div>
              <h3>上传本地资料</h3>
              <p>选择 PDF、图片、Word / PPT、音视频文件</p>
              <small>仅在本页登记文件信息：未上传、未解析、未同步。</small>
            </div>
            <button
              className="soft-button"
              onClick={() => input.current?.click()}
            >
              <FilePlus2 size={18} />
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
                setCategory("我的资料");
                setGrade("all");
                setQuery("");
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
          </section>
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
            从头演示会清空本次课堂草稿和笔记；选择教材不会切换课堂或生成课程。
          </p>
        </div>
      </div>
    </section>
  );
}
function formatSize(size: number) {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
