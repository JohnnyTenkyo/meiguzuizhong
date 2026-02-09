import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

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
  truthSocialHandle?: string;
  relatedTickers: string[];
}

interface NewsItem {
  title: string;
  titleZh?: string;
  link: string;
  pubDate: string;
  source: string;
  type: "news" | "social";
  isRetweet?: boolean;
  isReply?: boolean;
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    quotes?: number;
  };
}

type ContentTab = "original" | "retweets" | "truthsocial" | "news";

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
  const [contentTab, setContentTab] = useState<ContentTab>("original");
  const [originalTweets, setOriginalTweets] = useState<NewsItem[]>([]);
  const [retweetsReplies, setRetweetsReplies] = useState<NewsItem[]>([]);
  const [truthSocialPosts, setTruthSocialPosts] = useState<NewsItem[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  // AI 摘要功能已移除（确保网站完全免费）
  const [loading, setLoading] = useState(false);
  const [loadingVip, setLoadingVip] = useState(true);
  const [activeTab, setActiveTab] = useState<"vip" | "watchlist" | "custom">("vip");
  const [watchlistPeople, setWatchlistPeople] = useState<any[]>([]);
  const [customPeople, setCustomPeople] = useState<VIPPerson[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("全部");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPerson, setNewPerson] = useState({
    name: "",
    nameZh: "",
    title: "",
    titleZh: "",
    twitterHandle: "",
    truthSocialHandle: "",
    category: "其他" as "政治" | "科技" | "金融" | "商业" | "其他",
    avatarEmoji: "👤",
  });

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

  // 获取自定义追踪人物
  useEffect(() => {
    fetch("/api/trpc/newsflow.getTrackedPeople")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.result?.data?.json || data?.result?.data || [];
        const formattedList = Array.isArray(list) ? list.map((p: any) => ({
          id: `custom_${p.id}`,
          name: p.name,
          nameZh: p.nameZh || p.name,
          title: p.title || "",
          titleZh: p.titleZh || p.title || "",
          org: "",
          category: p.category,
          avatarEmoji: p.avatarEmoji || "👤",
          twitterHandle: p.twitterHandle,
          truthSocialHandle: p.truthSocialHandle,
          relatedTickers: [],
          dbId: p.id, // 保存数据库 ID 用于删除
        })) : [];
        setCustomPeople(formattedList);
      })
      .catch(console.error);
  }, []);

  // 获取选中人物的内容
  const fetchPersonContent = useCallback(async (person: VIPPerson) => {
    setLoading(true);
    setOriginalTweets([]);
    setRetweetsReplies([]);
    setTruthSocialPosts([]);
    setNewsFeed([]);

    try {
      // 1. 获取原创推文
      if (person.twitterHandle) {
        const input1 = encodeURIComponent(
          JSON.stringify({
            json: {
              twitterHandle: person.twitterHandle,
              limit: 20,
            }
          })
        );
        const resp1 = await fetch(`/api/trpc/newsflow.getPersonOriginalTweets?input=${input1}`);
        const data1 = await resp1.json();
        const tweets = data1?.result?.data?.json || data1?.result?.data || [];
        setOriginalTweets(Array.isArray(tweets) ? tweets : []);

        // 2. 获取所有推文（用于分离转发和评论）
        const input2 = encodeURIComponent(
          JSON.stringify({
            json: {
              twitterHandle: person.twitterHandle,
              limit: 40,
            }
          })
        );
        const resp2 = await fetch(`/api/trpc/newsflow.getPersonTwitter?input=${input2}`);
        const data2 = await resp2.json();
        const allTweets = data2?.result?.data?.json || data2?.result?.data || [];
        const retweets = Array.isArray(allTweets) ? allTweets.filter((t: NewsItem) => t.isRetweet || t.isReply) : [];
        setRetweetsReplies(retweets);
      }

      // 3. 获取 Truth Social 帖子
      if (person.truthSocialHandle) {
        const input3 = encodeURIComponent(
          JSON.stringify({
            json: {
              truthSocialHandle: person.truthSocialHandle,
              limit: 20,
            }
          })
        );
        const resp3 = await fetch(`/api/trpc/newsflow.getPersonTruthSocial?input=${input3}`);
        const data3 = await resp3.json();
        const posts = data3?.result?.data?.json || data3?.result?.data || [];
        setTruthSocialPosts(Array.isArray(posts) ? posts : []);
      }

      // 4. 获取新闻
      const input4 = encodeURIComponent(
        JSON.stringify({
          json: {
            personName: person.name,
            limit: 15,
          }
        })
      );
      const resp4 = await fetch(`/api/trpc/newsflow.getPersonNews?input=${input4}`);
      const data4 = await resp4.json();
      const news = data4?.result?.data?.json || data4?.result?.data || [];
      setNewsFeed(Array.isArray(news) ? news : []);
    } catch (err) {
      console.error("Error fetching content:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 选中人物时加载内容
  useEffect(() => {
    if (selectedPerson) {
      fetchPersonContent(selectedPerson);
    }
  }, [selectedPerson, fetchPersonContent]);

  const categories = ["全部", "政治", "科技", "金融", "商业"];
  const filteredVip = vipList.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameZh.includes(searchQuery) ||
      p.org.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "全部" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // 根据当前标签页获取要显示的内容
  const getCurrentContent = (): NewsItem[] => {
    switch (contentTab) {
      case "original":
        return originalTweets;
      case "retweets":
        return retweetsReplies;
      case "truthsocial":
        return truthSocialPosts;
      case "news":
        return newsFeed;

      default:
        return [];
    }
  };

  // AI 摘要功能已移除（确保网站完全免费）

  const currentContent = getCurrentContent();

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
          <button
            onClick={() => setActiveTab("custom")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "custom" ? "#3b82f6" : "transparent",
              color: activeTab === "custom" ? "#fff" : "#94a3b8",
            }}
          >
            ➕ 自定义追踪 {customPeople.length > 0 && `(${customPeople.length})`}
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
                        twitterHandle: person.twitterHandle,
                        truthSocialHandle: person.truthSocialHandle,
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

          {activeTab === "custom" && (
            <>
              {/* 添加按钮 */}
              <div style={{ padding: 12 }}>
                <button
                  onClick={() => setShowAddDialog(true)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: 8,
                    border: "2px dashed #3b82f6",
                    background: "rgba(59, 130, 246, 0.05)",
                    color: "#3b82f6",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>➕</span>
                  添加追踪人物
                </button>
              </div>
              {/* 自定义人物列表 */}
              {customPeople.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
                  <div>暂无自定义追踪人物</div>
                  <div>点击上方按钮添加</div>
                </div>
              ) : (
                customPeople.map((person) => (
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
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* 右侧内容流 */}
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
                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                      {selectedPerson.twitterHandle && (
                        <a
                          href={`https://x.com/${selectedPerson.twitterHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12,
                            color: "#3b82f6",
                            textDecoration: "none",
                          }}
                        >
                          @{selectedPerson.twitterHandle} on X
                        </a>
                      )}
                      {selectedPerson.truthSocialHandle && (
                        <a
                          href={`https://truthsocial.com/@${selectedPerson.truthSocialHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12,
                            color: "#ef4444",
                            textDecoration: "none",
                          }}
                        >
                          @{selectedPerson.truthSocialHandle} on Truth Social
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 内容分类标签页 */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a3a4e", background: "rgba(15, 23, 42, 0.2)" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedPerson.twitterHandle && (
                    <>
                      <button
                        onClick={() => setContentTab("original")}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: contentTab === "original" ? "#3b82f6" : "rgba(30,41,59,0.5)",
                          color: contentTab === "original" ? "#fff" : "#94a3b8",
                          transition: "all 0.2s",
                        }}
                      >
                        💬 原创推文 {originalTweets.length > 0 && `(${originalTweets.length})`}
                      </button>
                      <button
                        onClick={() => setContentTab("retweets")}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: contentTab === "retweets" ? "#3b82f6" : "rgba(30,41,59,0.5)",
                          color: contentTab === "retweets" ? "#fff" : "#94a3b8",
                          transition: "all 0.2s",
                        }}
                      >
                        🔄 转发/评论 {retweetsReplies.length > 0 && `(${retweetsReplies.length})`}
                      </button>
                    </>
                  )}
                  {selectedPerson.truthSocialHandle && (
                    <button
                      onClick={() => setContentTab("truthsocial")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: contentTab === "truthsocial" ? "#ef4444" : "rgba(30,41,59,0.5)",
                        color: contentTab === "truthsocial" ? "#fff" : "#94a3b8",
                        transition: "all 0.2s",
                      }}
                    >
                      🇺🇸 Truth Social {truthSocialPosts.length > 0 && `(${truthSocialPosts.length})`}
                    </button>
                  )}
                  {/* AI 摘要功能已移除（确保网站完全免费） */}
                  <button
                    onClick={() => setContentTab("news")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: contentTab === "news" ? "#f59e0b" : "rgba(30,41,59,0.5)",
                      color: contentTab === "news" ? "#fff" : "#94a3b8",
                      transition: "all 0.2s",
                    }}
                  >
                    📰 新闻报道 {newsFeed.length > 0 && `(${newsFeed.length})`}
                  </button>
                </div>
              </div>

              {/* 内容列表 */}
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
                ) : currentContent.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    暂无相关内容
                  </div>
                ) : (
                  currentContent.map((item, idx) => (
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
                                item.source === "Truth Social"
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : item.type === "social"
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                              color: 
                                item.source === "Truth Social"
                                  ? "#ef4444"
                                  : item.type === "social" 
                                  ? "#3b82f6" 
                                  : "#f59e0b",
                            }}
                          >
                            {item.source === "Truth Social" 
                              ? "🇺🇸 Truth Social" 
                              : item.type === "social" 
                              ? "💬 社交媒体" 
                              : "📰 新闻"}
                          </span>
                          {item.isRetweet && (
                            <span style={{ fontSize: 10, color: "#64748b" }}>🔄 转发</span>
                          )}
                          {item.isReply && (
                            <span style={{ fontSize: 10, color: "#64748b" }}>💬 回复</span>
                          )}
                          <span style={{ fontSize: 11, color: "#64748b" }}>{item.source}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {timeAgo(item.pubDate)}
                        </span>
                      </div>

                      {/* 内容文本 */}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#e2e8f0",
                          lineHeight: 1.5,
                          marginBottom: item.titleZh && item.titleZh !== item.title ? 6 : 0,
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

                      {/* 互动数据 */}
                      {item.engagement && (
                        <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11, color: "#64748b" }}>
                          {item.engagement.likes !== undefined && item.engagement.likes > 0 && (
                            <span>❤️ {item.engagement.likes.toLocaleString()}</span>
                          )}
                          {item.engagement.retweets !== undefined && item.engagement.retweets > 0 && (
                            <span>🔄 {item.engagement.retweets.toLocaleString()}</span>
                          )}
                          {item.engagement.replies !== undefined && item.engagement.replies > 0 && (
                            <span>💬 {item.engagement.replies.toLocaleString()}</span>
                          )}
                          {item.engagement.quotes !== undefined && item.engagement.quotes > 0 && (
                            <span>💭 {item.engagement.quotes.toLocaleString()}</span>
                          )}
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

      {/* 添加人物对话框 */}
      {showAddDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddDialog(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              borderRadius: 16,
              border: "1px solid #2a3a4e",
              padding: 24,
              maxWidth: 500,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 18 }}>➕ 添加追踪人物</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  姓名（英文）*
                </label>
                <input
                  type="text"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                  placeholder="e.g., Jerome Powell"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  姓名（中文）
                </label>
                <input
                  type="text"
                  value={newPerson.nameZh}
                  onChange={(e) => setNewPerson({ ...newPerson, nameZh: e.target.value })}
                  placeholder="e.g., 杰罗姆·鲍威尔"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  职位（英文）
                </label>
                <input
                  type="text"
                  value={newPerson.title}
                  onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })}
                  placeholder="e.g., Chair of the Federal Reserve"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  职位（中文）
                </label>
                <input
                  type="text"
                  value={newPerson.titleZh}
                  onChange={(e) => setNewPerson({ ...newPerson, titleZh: e.target.value })}
                  placeholder="e.g., 美联储主席"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  Twitter 账号
                </label>
                <input
                  type="text"
                  value={newPerson.twitterHandle}
                  onChange={(e) => setNewPerson({ ...newPerson, twitterHandle: e.target.value })}
                  placeholder="e.g., federalreserve"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  Truth Social 账号
                </label>
                <input
                  type="text"
                  value={newPerson.truthSocialHandle}
                  onChange={(e) => setNewPerson({ ...newPerson, truthSocialHandle: e.target.value })}
                  placeholder="e.g., realDonaldTrump"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  分类
                </label>
                <select
                  value={newPerson.category}
                  onChange={(e) => setNewPerson({ ...newPerson, category: e.target.value as any })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  <option value="政治">政治</option>
                  <option value="科技">科技</option>
                  <option value="金融">金融</option>
                  <option value="商业">商业</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
                  Emoji 头像
                </label>
                <input
                  type="text"
                  value={newPerson.avatarEmoji}
                  onChange={(e) => setNewPerson({ ...newPerson, avatarEmoji: e.target.value })}
                  placeholder="e.g., 🏬"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "rgba(30, 41, 59, 0.5)",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => {
                    if (!newPerson.name) {
                      alert("请输入姓名（英文）");
                      return;
                    }
                    fetch("/api/trpc/newsflow.addTrackedPerson", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ json: newPerson }),
                    })
                      .then((r) => r.json())
                      .then(() => {
                        setShowAddDialog(false);
                        setNewPerson({
                          name: "",
                          nameZh: "",
                          title: "",
                          titleZh: "",
                          twitterHandle: "",
                          truthSocialHandle: "",
                          category: "其他",
                          avatarEmoji: "👤",
                        });
                        // 重新加载自定义人物列表
                        fetch("/api/trpc/newsflow.getTrackedPeople")
                          .then((r) => r.json())
                          .then((data) => {
                            const list = data?.result?.data?.json || data?.result?.data || [];
                            const formattedList = Array.isArray(list) ? list.map((p: any) => ({
                              id: `custom_${p.id}`,
                              name: p.name,
                              nameZh: p.nameZh || p.name,
                              title: p.title || "",
                              titleZh: p.titleZh || p.title || "",
                              org: "",
                              category: p.category,
                              avatarEmoji: p.avatarEmoji || "👤",
                              twitterHandle: p.twitterHandle,
                              truthSocialHandle: p.truthSocialHandle,
                              relatedTickers: [],
                              dbId: p.id,
                            })) : [];
                            setCustomPeople(formattedList);
                          });
                      })
                      .catch((err) => {
                        console.error(err);
                        alert("添加失败，请重试");
                      });
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: "none",
                    background: "#3b82f6",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setShowAddDialog(false);
                    setNewPerson({
                      name: "",
                      nameZh: "",
                      title: "",
                      titleZh: "",
                      twitterHandle: "",
                      truthSocialHandle: "",
                      category: "其他",
                      avatarEmoji: "👤",
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #2a3a4e",
                    background: "transparent",
                    color: "#94a3b8",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
