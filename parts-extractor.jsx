import { useState, useRef } from "react";

const SYSTEM_PROMPT = `あなたは電気工事の積算・材料拾いの専門家です。
入力された仕様書・図面テキストから電気工事に必要な部材を抽出し、以下のJSON形式で返してください。
他のテキストは一切含めず、JSONのみを返してください。

{
  "materials": [
    {
      "name": "部材名",
      "spec": "規格・仕様",
      "quantity": 数量(数値),
      "unit": "単位",
      "category": "カテゴリ（ケーブル/器具/盤/配管/その他）",
      "note": "備考（任意）"
    }
  ],
  "summary": "抽出した内容の簡単なサマリー（1〜2文）"
}

数量が明記されていない場合は null を入れてください。
部材が見つからない場合は materials を空配列にしてください。`;

const CATEGORY_COLORS = {
  ケーブル: { bg: "#1a3a5c", accent: "#4a9eff" },
  器具: { bg: "#1a3a2a", accent: "#4aff8a" },
  盤: { bg: "#3a1a1a", accent: "#ff6b4a" },
  配管: { bg: "#2a1a3a", accent: "#c44aff" },
  その他: { bg: "#2a2a1a", accent: "#ffcc4a" },
};

const SAMPLE_TEXT = `電気設備工事仕様書

1. 幹線設備
- 引込開閉器盤（主幹ブレーカー 100A） 1面
- CVケーブル 38mm² 3芯 地中埋設 約25m
- CVケーブル 14mm² 3芯 天井隠蔽 約40m

2. 分電盤
- 住宅用分電盤（主幹50A、回路数20） 1面
- 単相3線式対応

3. コンセント・スイッチ設備
- 埋込コンセント（2P15A） 20個
- 防水コンセント（屋外用） 3個
- 埋込スイッチ（片切） 15個
- 3路スイッチ 4個
- VVFケーブル 2.0mm 2芯 約200m
- VVFケーブル 1.6mm 2芯 約150m
- VVFケーブル 1.6mm 3芯 約80m

4. 照明設備
- LEDダウンライト（60W相当） 24台
- 蛍光灯（FL40W×2） 8台
- 非常用照明器具 4台`;

export default function PartsExtractor() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("すべて");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setInputText(ev.target.result);
    reader.readAsText(file, "utf-8");
  };

  const extract = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: inputText }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((c) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setActiveCategory("すべて");
    } catch (err) {
      setError("抽出に失敗しました。テキストを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const categories = result
    ? ["すべて", ...new Set(result.materials.map((m) => m.category))]
    : [];

  const filtered =
    result?.materials.filter(
      (m) => activeCategory === "すべて" || m.category === activeCategory
    ) || [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0f",
      color: "#e8e6e0",
      fontFamily: "'Courier New', 'Osaka-Mono', monospace",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #2a2a2a",
        padding: "20px 28px 16px",
        display: "flex",
        alignItems: "baseline",
        gap: "12px",
        background: "#0d0d0f",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: "11px", color: "#555", letterSpacing: "3px", textTransform: "uppercase" }}>BizLock</span>
        <span style={{ color: "#2a2a2a" }}>|</span>
        <span style={{ fontSize: "13px", color: "#888", letterSpacing: "1px" }}>AI 部材拾いプロトタイプ</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4aff8a", boxShadow: "0 0 8px #4aff8a" }} />
          <span style={{ fontSize: "10px", color: "#4aff8a" }}>Claude API</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", minHeight: "calc(100vh - 57px)" }}>
        {/* Left: Input */}
        <div style={{ borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px 10px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#555", letterSpacing: "2px" }}>INPUT — 仕様書テキスト</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setInputText(SAMPLE_TEXT)}
                style={{
                  fontSize: "10px", color: "#555", background: "none",
                  border: "1px solid #2a2a2a", padding: "3px 8px",
                  cursor: "pointer", borderRadius: "2px",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.color = "#888"; e.target.style.borderColor = "#444"; }}
                onMouseLeave={e => { e.target.style.color = "#555"; e.target.style.borderColor = "#2a2a2a"; }}
              >
                サンプル挿入
              </button>
              <button
                onClick={() => fileRef.current.click()}
                style={{
                  fontSize: "10px", color: "#555", background: "none",
                  border: "1px solid #2a2a2a", padding: "3px 8px",
                  cursor: "pointer", borderRadius: "2px",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.color = "#888"; e.target.style.borderColor = "#444"; }}
                onMouseLeave={e => { e.target.style.color = "#555"; e.target.style.borderColor = "#2a2a2a"; }}
              >
                TXTファイル
              </button>
              <input ref={fileRef} type="file" accept=".txt" onChange={handleFile} style={{ display: "none" }} />
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={"仕様書や図面の文字起こしを貼り付け...\n\n例：\n・VVFケーブル 2.0mm 2芯 200m\n・埋込コンセント 15個\n・分電盤 主幹50A 1面"}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#c8c4bc",
              fontFamily: "inherit",
              fontSize: "12px",
              lineHeight: "1.8",
              padding: "16px 20px",
              resize: "none",
              outline: "none",
              minHeight: "360px",
            }}
          />
          <div style={{ padding: "12px 20px", borderTop: "1px solid #1a1a1a" }}>
            <button
              onClick={extract}
              disabled={loading || !inputText.trim()}
              style={{
                width: "100%",
                padding: "11px",
                background: loading ? "#1a1a1a" : inputText.trim() ? "#4a9eff" : "#1a1a1a",
                color: loading ? "#444" : inputText.trim() ? "#000" : "#333",
                border: "none",
                cursor: loading || !inputText.trim() ? "not-allowed" : "pointer",
                fontSize: "11px",
                letterSpacing: "3px",
                fontFamily: "inherit",
                fontWeight: "bold",
                borderRadius: "2px",
                transition: "all 0.2s",
              }}
            >
              {loading ? "AI 解析中..." : "▶  部材を抽出する"}
            </button>
            {error && (
              <p style={{ fontSize: "11px", color: "#ff6b4a", margin: "8px 0 0", textAlign: "center" }}>{error}</p>
            )}
          </div>
        </div>

        {/* Right: Result */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px 10px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#555", letterSpacing: "2px" }}>OUTPUT — 抽出部材リスト</span>
            {result && (
              <span style={{ fontSize: "10px", color: "#4aff8a" }}>
                {result.materials.length} 件抽出
              </span>
            )}
          </div>

          {/* Category filter */}
          {result && categories.length > 1 && (
            <div style={{ padding: "10px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {categories.map((cat) => {
                const col = CATEGORY_COLORS[cat] || CATEGORY_COLORS["その他"];
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      fontSize: "10px",
                      padding: "3px 10px",
                      border: `1px solid ${isActive ? col.accent : "#2a2a2a"}`,
                      background: isActive ? col.bg : "transparent",
                      color: isActive ? col.accent : "#555",
                      cursor: "pointer",
                      borderRadius: "2px",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {!result && !loading && (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#333" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>⚡</div>
                <div style={{ fontSize: "11px", lineHeight: "2", letterSpacing: "1px" }}>
                  仕様書テキストを入力して<br />部材を自動抽出します
                </div>
              </div>
            )}

            {loading && (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#444" }}>
                <div style={{ fontSize: "11px", letterSpacing: "2px", animation: "pulse 1.5s ease-in-out infinite" }}>
                  図面を解析中...
                </div>
              </div>
            )}

            {result && (
              <>
                {result.summary && (
                  <div style={{ margin: "8px 16px 4px", padding: "10px 14px", background: "#111", borderLeft: "2px solid #4a9eff", fontSize: "11px", color: "#888", lineHeight: "1.7" }}>
                    {result.summary}
                  </div>
                )}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                      {["カテゴリ", "部材名", "規格", "数量", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#444", letterSpacing: "1px", fontWeight: "normal", fontSize: "10px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m, i) => {
                      const col = CATEGORY_COLORS[m.category] || CATEGORY_COLORS["その他"];
                      return (
                        <tr
                          key={i}
                          style={{ borderBottom: "1px solid #141414", transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#111"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: "9px", padding: "2px 6px", background: col.bg, color: col.accent, borderRadius: "2px", letterSpacing: "1px" }}>
                              {m.category}
                            </span>
                          </td>
                          <td style={{ padding: "9px 12px", color: "#c8c4bc" }}>{m.name}</td>
                          <td style={{ padding: "9px 12px", color: "#666" }}>{m.spec || "—"}</td>
                          <td style={{ padding: "9px 12px", color: "#e8e6e0", whiteSpace: "nowrap" }}>
                            {m.quantity !== null ? `${m.quantity} ${m.unit}` : <span style={{ color: "#444" }}>—</span>}
                          </td>
                          <td style={{ padding: "9px 8px" }}>
                            <button
                              onClick={() => window.open(`https://www.monotaro.com/s/?c=&q=${encodeURIComponent(m.name + " " + (m.spec || ""))}`, "_blank")}
                              style={{
                                fontSize: "9px", color: "#555", background: "none",
                                border: "1px solid #2a2a2a", padding: "2px 7px",
                                cursor: "pointer", borderRadius: "2px",
                                fontFamily: "inherit", whiteSpace: "nowrap",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={e => { e.target.style.color = "#ffcc4a"; e.target.style.borderColor = "#ffcc4a44"; }}
                              onMouseLeave={e => { e.target.style.color = "#555"; e.target.style.borderColor = "#2a2a2a"; }}
                            >
                              検索 →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {result && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid #1a1a1a", display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  const csv = [
                    ["カテゴリ", "部材名", "規格", "数量", "単位", "備考"].join(","),
                    ...result.materials.map(m => [m.category, m.name, m.spec || "", m.quantity ?? "", m.unit, m.note || ""].join(","))
                  ].join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "部材リスト.csv"; a.click();
                }}
                style={{
                  flex: 1, padding: "8px", fontSize: "10px", letterSpacing: "2px",
                  background: "transparent", color: "#666", border: "1px solid #2a2a2a",
                  cursor: "pointer", borderRadius: "2px", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.color = "#4aff8a"; e.target.style.borderColor = "#4aff8a44"; }}
                onMouseLeave={e => { e.target.style.color = "#666"; e.target.style.borderColor = "#2a2a2a"; }}
              >
                CSV 出力
              </button>
              <button
                onClick={() => { setResult(null); setInputText(""); }}
                style={{
                  padding: "8px 16px", fontSize: "10px", letterSpacing: "2px",
                  background: "transparent", color: "#444", border: "1px solid #1e1e1e",
                  cursor: "pointer", borderRadius: "2px", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.color = "#666"; }}
                onMouseLeave={e => { e.target.style.color = "#444"; }}
              >
                リセット
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit:scrollbar-thumb { background: #2a2a2a; }
        textarea::placeholder { color: #333; }
      `}</style>
    </div>
  );
}
