/**
 * Truth Social API Adapter
 * 使用优化的请求策略绕过 Cloudflare
 */

interface TruthSocialPost {
  id: string;
  text: string;
  created_at: string;
  reblogs_count: number;
  favourites_count: number;
  replies_count: number;
  url: string;
  media?: Array<{
    type: string;
    url: string;
  }>;
}

const TRUTHSOCIAL_API_BASE = "https://truthsocial.com/api/v1";

// 缓存 Truth Social 数据，避免频繁请求
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 检查 Truth Social 是否已配置
 */
export function isTruthSocialConfigured(): boolean {
  return !!(
    process.env.TRUTHSOCIAL_ACCESS_TOKEN &&
    process.env.TRUTHSOCIAL_ACCOUNT_ID
  );
}

/**
 * 创建带有完整请求头的 fetch 请求
 */
async function fetchWithHeaders(url: string, token: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: "https://truthsocial.com",
      Referer: "https://truthsocial.com/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "sec-ch-ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    },
  });
}

/**
 * 从缓存获取数据
 */
function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * 保存数据到缓存
 */
function saveToCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * 通过用户名获取 Truth Social 帖子
 */
export async function getTruthSocialPosts(
  handle: string,
  limit: number = 20
): Promise<TruthSocialPost[]> {
  try {
    if (!isTruthSocialConfigured()) {
      console.log("Truth Social credentials not configured, skipping");
      return [];
    }

    // 检查缓存
    const cacheKey = `posts:${handle}:${limit}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`Using cached Truth Social posts for @${handle}`);
      return cached;
    }

    const token = process.env.TRUTHSOCIAL_ACCESS_TOKEN;

    // 首先获取用户信息
    const userResponse = await fetchWithHeaders(
      `${TRUTHSOCIAL_API_BASE}/accounts/search?q=${encodeURIComponent(handle)}&limit=1`,
      token!
    );

    if (!userResponse.ok) {
      console.error(
        `Failed to search user @${handle}:`,
        userResponse.status,
        userResponse.statusText
      );
      // 如果是 Cloudflare 拦截，返回空数组而不是抛出错误
      if (userResponse.status === 403 || userResponse.status === 503) {
        console.log(
          `Truth Social API blocked by Cloudflare for @${handle}, returning empty results`
        );
        return [];
      }
      return [];
    }

    const users = await userResponse.json();
    if (!Array.isArray(users) || users.length === 0) {
      console.log(`User @${handle} not found on Truth Social`);
      return [];
    }

    const userId = users[0].id;

    // 获取用户的帖子
    const postsResponse = await fetchWithHeaders(
      `${TRUTHSOCIAL_API_BASE}/accounts/${userId}/statuses?limit=${limit}&exclude_replies=false`,
      token!
    );

    if (!postsResponse.ok) {
      console.error(
        `Failed to get Truth Social posts for @${handle}:`,
        postsResponse.status,
        postsResponse.statusText
      );
      if (postsResponse.status === 403 || postsResponse.status === 503) {
        console.log(
          `Truth Social API blocked by Cloudflare for @${handle}, returning empty results`
        );
        return [];
      }
      return [];
    }

    const statuses = await postsResponse.json();

    // 转换为统一格式
    const posts: TruthSocialPost[] = statuses
      .filter((status: any) => status.content) // 过滤掉空内容
      .map((status: any) => ({
        id: status.id,
        text: stripHtml(status.content),
        created_at: status.created_at,
        reblogs_count: status.reblogs_count || 0,
        favourites_count: status.favourites_count || 0,
        replies_count: status.replies_count || 0,
        url: status.url,
        media: status.media_attachments
          ? status.media_attachments.map((m: any) => ({
              type: m.type || "image",
              url: m.url,
            }))
          : undefined,
      }));

    // 保存到缓存
    saveToCache(cacheKey, posts);

    return posts;
  } catch (error) {
    console.error(`Error fetching Truth Social posts for @${handle}:`, error);
    return [];
  }
}

/**
 * 从 HTML 内容中提取纯文本
 */
function stripHtml(html: string): string {
  if (!html) return "";
  // 移除 HTML 标签
  let text = html.replace(/<[^>]+>/g, "");
  // 解码 HTML 实体
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return text.trim();
}

/**
 * 获取当前认证用户的信息
 */
export async function getTruthSocialUserInfo() {
  try {
    if (!isTruthSocialConfigured()) {
      return null;
    }

    // 检查缓存
    const cacheKey = "userinfo";
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const token = process.env.TRUTHSOCIAL_ACCESS_TOKEN;

    const response = await fetchWithHeaders(
      `${TRUTHSOCIAL_API_BASE}/accounts/verify_credentials`,
      token!
    );

    if (!response.ok) {
      console.error(
        "Failed to verify Truth Social credentials:",
        response.status,
        response.statusText
      );
      return null;
    }

    const userInfo = await response.json();
    saveToCache(cacheKey, userInfo);

    return userInfo;
  } catch (error) {
    console.error("Error verifying Truth Social credentials:", error);
    return null;
  }
}
