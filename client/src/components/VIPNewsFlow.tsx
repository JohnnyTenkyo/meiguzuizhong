import { useState, useEffect, useCallback } from "react";

// ============================================================
// 类型定义
// ============================================================
interface VIPPerson {
  id: string;
  name: string;
  nameZh: string;
  title: string;
  titleZh: string;
  org: string;
  category: string;
  avatarEmoji: string;
  twitterHandle?: string;
  relatedTickers: string[];
}

interface NewsItem {
  title: string;
  titleZh?: string;
  link: string;
  pubDate: string;
  source: string;
  type: "news" | "social";
}

// ============================================================
// 辅助函数
// ============================================================
function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString("zh-CN");
  } catch {
    return dateStr;
  }
}

// ============================================================
// VIPNewsFlow 组件
// ============================================================
export default function VIPNewsFlow({ watchlistTickers = [] }: { watchlistTickers?: string[] }) {
  const [vipList, setVipList] = useState<VIPPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<VIPPerson | null>(null);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVip, setLoadingVip] = useState(true);
  const [activeTab, setActiveTab] = useState<"vip" | "watchlist">("vip");
  const [watchlistPeople, setWatchlistPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("全部");

  // 获取 VIP 列表
  useEffect(() => {
    setLoadingVip(true);
    fetch("/api/trpc/newsflow.getVIPList")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.result?.data?.json || data?.result?.data || [];
        setVipList(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length > 0 && !selectedPerson) {
          setSelectedPerson(list[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingVip(false));
  }, []);

  // 获取收藏股票关联人物
  useEffect(() => {
    if (watchlistTickers.length === 0) return;
    const input = encodeURIComponent(JSON.stringify({ json: { tickers: watchlistTickers } }));
    fetch(`/api/trpc/newsflow.getWatchlistFeed?input=${input}`)
      .then((r) => r.json())
      .then((data) => {
        const wp = data?.result?.data?.json || data?.result?.data || [];
        setWatchlistPeople(Array.isArray(wp) ? wp : []);
      })
      .catch(console.error);
  }, [watchlistTickers]);

  // 获取选中人物的新闻
  const fetchPersonFeed = useCallback(async (person: { name: string; twitterHandle?: string }) => {
    setLoading(true);
    setNewsFeed([]);
    try {
      const input = encodeURIComponent(
        JSON.stringify({
          json: {
            personName: person.name,
            twitterHandle: person.twitterHandle || "",
            limit: 12,
          }
        })
      );
      const resp = await fetch(`/api/trpc/newsflow.getPersonFeed?input=${input}`);
      const data = await resp.json();
      const feed = data?.result?.data?.json || data?.result?.data || [];
      setNewsFeed(Array.isArray(feed) ? feed : []);
    } catch (err) {
      console.error("Error fetching feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 选中人物时加载新闻
  useEffect(() => {
    if (selectedPerson) {
      fetchPersonFeed(selectedPerson);
    }
  }, [selectedPerson, fetchPersonFeed]);

  const categories = ["全部", "政治", "科技", "金融", "商业"];
  const filteredVip = vipList.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameZh.includes(searchQuery) ||
      p.org.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "全部" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <section
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 100%)",
        borderRadius: 16,
        border: "1px solid #2a3a4e",
        overflow: "hidden",
        marginBottom: 24,
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #2a3a4e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(15, 23, 42, 0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📡</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
            重要人物信息流
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              fontWeight: 600,
            }}
          >
            LIVE
          </span>
        </div>
        {/* Tab 切换 */}
        <div style={{ display: "flex", gap: 4, background: "rgba(30,41,59,0.5)", padding: 3, borderRadius: 8 }}>
          <button
            onClick={() => setActiveTab("vip")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "vip" ? "#3b82f6" : "transparent",
              color: activeTab === "vip" ? "#fff" : "#94a3b8",
            }}
          >
            🌟 重要人物
          </button>
          <button
            onClick={() => setActiveTab("watchlist")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "watchlist" ? "#3b82f6" : "transparent",
              color: activeTab === "watchlist" ? "#fff" : "#94a3b8",
            }}
          >
            ⭐ 自选关联 {watchlistPeople.length > 0 && `(${watchlistPeople.length})`}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: 500, flexDirection: "column" }} className="vip-news-container">
        <style>{`
          @media (min-width: 768px) {
            .vip-news-container {
              flex-direction: row !important;
            }
            .vip-news-left {
              width: 280px !important;
              border-right: 1px solid #2a3a4e !important;
              border-bottom: none !important;
              max-height: 600px !important;
            }
            .vip-news-right {
              border-left: none !important;
            }
          }
        `}</style>
        {/* 左侧人物列表 */}
        <div
          className="vip-news-left"
          style={{
            width: "100%",
            borderBottom: "1px solid #2a3a4e",
            overflowY: "auto",
            maxHeight: 300,
            flexShrink: 0,
          }}
        >
          {activeTab === "vip" && (
            <>
              {/* 搜索和过滤 */}
              <div style={{ padding: "12px 12px 8px" }}>
                <input
                  type="text"
                  placeholder="搜索人物..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30,41,59,0.5)",
                    color: "#e2e8f0",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ padding: "0 12px 8px", display: "flex", gap: 4, flexWrap: "wrap" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 12,
                      border: "none",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: categoryFilter === cat ? "#3b82f6" : "rgba(30,41,59,0.5)",
                      color: categoryFilter === cat ? "#fff" : "#94a3b8",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* 人物列表 */}
              {loadingVip ? (
                <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>加载中...</div>
              ) : (
                filteredVip.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => setSelectedPerson(person)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(42,58,78,0.3)",
                      background:
                        selectedPerson?.id === person.id
                          ? "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                      borderLeft:
                        selectedPerson?.id === person.id
                          ? "3px solid #3b82f6"
                          : "3px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{person.avatarEmoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#e2e8f0",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {person.nameZh}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {person.titleZh}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 8,
                          background:
                            person.category === "政治"
                              ? "rgba(239,68,68,0.15)"
                              : person.category === "科技"
                              ? "rgba(59,130,246,0.15)"
                              : person.category === "金融"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(139,92,246,0.15)",
                          color:
                            person.category === "政治"
                              ? "#ef4444"
                              : person.category === "科技"
                              ? "#3b82f6"
                              : person.category === "金融"
                              ? "#f59e0b"
                              : "#8b5cf6",
                          fontWeight: 600,
                        }}
                      >
                        {person.category}
                      </span>
                    </div>
                    {person.relatedTickers.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {person.relatedTickers.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "rgba(16,185,129,0.1)",
                              color: "#10b981",
                              fontWeight: 600,
                            }}
                          >
                            ${t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "watchlist" && (
            <>
              {watchlistPeople.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
                  <div>收藏股票后，将自动显示</div>
                  <div>该公司 CEO 等关键人物的信息流</div>
                </div>
              ) : (
                watchlistPeople.map((person: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedPerson({
                        id: person.name.toLowerCase().replace(/\s+/g, "_"),
                        name: person.name,
                        nameZh: person.nameZh,
                        title: person.title,
                        titleZh: person.titleZh,
                        org: "",
                        category: "商业",
                        avatarEmoji: person.avatarEmoji,
                        relatedTickers: [person.ticker],
                      });
                    }}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(42,58,78,0.3)",
                      background:
                        selectedPerson?.name === person.name
                          ? "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                      borderLeft:
                        selectedPerson?.name === person.name
                          ? "3px solid #3b82f6"
                          : "3px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{person.avatarEmoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                          {person.nameZh}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{person.titleZh}</div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(16,185,129,0.1)",
                          color: "#10b981",
                          fontWeight: 600,
                        }}
                      >
                        ${person.ticker}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* 右侧新闻流 */}
        <div className="vip-news-right" style={{ flex: 1, overflowY: "auto", maxHeight: 600, width: "100%" }}>
          {selectedPerson && (
            <>
              {/* 人物信息头 */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #2a3a4e",
                  background: "rgba(15, 23, 42, 0.4)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 36 }}>{selectedPerson.avatarEmoji}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>
                      {selectedPerson.nameZh}
                      <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>
                        {selectedPerson.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      {selectedPerson.titleZh}
                      <span style={{ color: "#475569", marginLeft: 6 }}>
                        ({selectedPerson.title})
                      </span>
                    </div>
                    {selectedPerson.twitterHandle && (
                      <a
                        href={`https://x.com/${selectedPerson.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 12,
                          color: "#3b82f6",
                          textDecoration: "none",
                          marginTop: 4,
                          display: "inline-block",
                        }}
                      >
                        @{selectedPerson.twitterHandle} on X
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 信息流列表 */}
              <div style={{ padding: "12px 16px" }}>
                {loading ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        border: "3px solid #2a3a4e",
                        borderTop: "3px solid #3b82f6",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 12px",
                      }}
                    />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      正在获取 {selectedPerson.nameZh} 的最新动态...
                    </div>
                  </div>
                ) : newsFeed.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    暂无相关新闻
                  </div>
                ) : (
                  newsFeed.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        padding: "14px 16px",
                        borderRadius: 12,
                        marginBottom: 8,
                        background: "rgba(26, 35, 50, 0.5)",
                        border: "1px solid rgba(42, 58, 78, 0.4)",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6";
                        (e.currentTarget as HTMLElement).style.background = "rgba(30, 41, 59, 0.7)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(42, 58, 78, 0.4)";
                        (e.currentTarget as HTMLElement).style.background = "rgba(26, 35, 50, 0.5)";
                      }}
                    >
                      {/* 类型标签和时间 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 8,
                              fontWeight: 600,
                              background:
                                item.type === "social"
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                              color: item.type === "social" ? "#3b82f6" : "#f59e0b",
                            }}
                          >
                            {item.type === "social" ? "💬 言论/社交" : "📰 新闻"}
                          </span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{item.source}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {timeAgo(item.pubDate)}
                        </span>
                      </div>

                      {/* 英文原文 */}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#e2e8f0",
                          lineHeight: 1.5,
                          marginBottom: 6,
                        }}
                      >
                        {item.title}
                      </div>

                      {/* 中文翻译 */}
                      {item.titleZh && item.titleZh !== item.title && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#94a3b8",
                            lineHeight: 1.5,
                            paddingLeft: 10,
                            borderLeft: "2px solid #334155",
                          }}
                        >
                          🇨🇳 {item.titleZh}
                        </div>
                      )}
                    </a>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
