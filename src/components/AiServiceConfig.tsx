import { useState } from "react";
import type { RealtimeVoice } from "../hooks/useRealtimeVoice";
export function AiServiceConfig({
  voice,
  blocked,
}: {
  voice: RealtimeVoice;
  blocked: boolean;
}) {
  const [address, setAddress] = useState(voice.base);
  const [code, setCode] = useState("");
  return (
    <section className="ai-service-config" aria-label="AI 服务配置">
      <div className="ai-config-summary">
        <strong>{voice.selectedProvider.name}</strong>
        <span>
          {voice.selectedProvider.configured ? "已配置 · 待实际验证" : "未配置"}{" "}
          ·{" "}
          {voice.status === "connected"
            ? "已连接"
            : voice.status === "connecting"
              ? "连接中"
              : "未连接"}
        </span>
      </div>
      <p className="muted-copy">
        实时语音只负责对话，沿用 Emma 和当前 Animals
        课堂上下文，不修改教材、进度或档案。发音评分未接入。
      </p>
      <label htmlFor="voice-backend">语音后端地址（公开地址，不是密钥）</label>
      <div className="ai-config-input">
        <input
          id="voice-backend"
          type="url"
          placeholder="https://你的后端.onrender.com"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={voice.locked}
        />
        <button
          className="soft-button"
          disabled={voice.locked}
          onClick={() => voice.setBackend(address)}
        >
          保存地址
        </button>
      </div>
      <p className="muted-copy">
        本地开发留空即可；线上须填写已部署的 HTTPS
        后端。此地址和模型偏好可保存在浏览器。
      </p>
      <p role="status" className="notice-copy">
        {voice.configMessage}
      </p>
      <div className="ai-key-help">
        <strong>阿里云 API Key 填在哪里？</strong>
        <p>
          填在
          <strong>
            后端部署平台 → 服务 → Environment → Add Environment Variable
          </strong>
          ，名称为 <code>DASHSCOPE_API_KEY</code>。本网页不接收、不保存 API
          Key。
        </p>
        <p>
          另需设置 <code>DASHSCOPE_WORKSPACE_ID</code>、
          <code>DASHSCOPE_REGION</code> 和 <code>CLASSROOM_ACCESS_CODE</code>
          （至少16位的独立课堂访问口令）。地域和 Key 必须匹配。
        </p>
        <a
          href="https://help.aliyun.com/zh/model-studio/get-api-key"
          target="_blank"
          rel="noreferrer"
        >
          查看百炼官方申请指南 ↗
        </a>
      </div>
      <p className="muted-copy">
        当前服务：{voice.selectedProvider.model || "预留适配接口"}
        {voice.selectedProvider.region
          ? ` · ${voice.selectedProvider.region}`
          : ""}
        <br />
        状态：
        {voice.selectedProvider.missing.join("、") ||
          "配置已提供，尚不代表设备语音验收通过。"}
      </p>
      <label htmlFor="classroom-access-code">
        课堂访问口令（不是 API Key）
      </label>
      <form
        className="ai-config-input"
        onSubmit={async (e) => {
          e.preventDefault();
          const submitted = code;
          setCode("");
          await voice.authorize(submitted);
        }}
      >
        <input
          id="classroom-access-code"
          type="password"
          autoComplete="off"
          maxLength={128}
          placeholder="填写自己设置的 CLASSROOM_ACCESS_CODE"
          value={code}
          disabled={voice.locked}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          className="soft-button"
          type="submit"
          disabled={voice.locked || !code}
        >
          {voice.authorizing ? "验证中…" : "验证访问口令"}
        </button>
      </form>
      <p className="muted-copy">
        {voice.authorized
          ? "已授权 · 仅本次页面内存保留，刷新后需重新验证。"
          : "尚未授权。口令只发给你的后端，不能填写厂商 Key。"}
      </p>
      <div className="ai-config-actions">
        <button
          className="soft-button"
          onClick={() => void voice.refresh()}
          disabled={voice.locked}
        >
          刷新配置
        </button>
        <button
          className="primary-button"
          onClick={() => void voice.testConnection()}
          disabled={
            voice.locked ||
            !voice.authorized ||
            !voice.selectedProvider.configured
          }
        >
          {voice.testing ? "测试中…" : "测试连接"}
        </button>
      </div>
      <p role="status" className="ai-test-result">
        {voice.testResult}
      </p>
      <p className="muted-copy">
        测试连接会建立百炼会话并立即关闭，不录音、不生成示例回复；仍可能产生厂商费用。配置存在不等于连接测试通过。
      </p>
      <div className="ai-config-actions">
        {voice.status === "connected" || voice.status === "connecting" ? (
          <button className="soft-button" onClick={() => voice.disconnect()}>
            断开语音
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={
              voice.locked ||
              blocked ||
              !voice.authorized ||
              !voice.selectedProvider.configured
            }
            onClick={() => void voice.connect()}
          >
            连接真实语音
          </button>
        )}
      </div>
      <p className="notice-copy">
        {voice.message}。每次最长10分钟；断线后停止录音，需手动重新连接。豆包及
        OpenAI Realtime 尚未接入。
      </p>
    </section>
  );
}
