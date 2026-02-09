/**
 * Truth Social API Adapter
 * 使用 REST API 直接调用 Truth Social
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

    const token = process.env.TRUTHSOCIAL_ACCESS_TOKEN;

    // 首先获取用户信息
    const userResponse = await fetch(
      `${TRUTHSOCIAL_API_BASE}/accounts/search?q=${encodeURIComponent(handle)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!userResponse.ok) {
      console.error(
        `Failed to search user @${handle}:`,
        userResponse.statusText
      );
      return [];
    }

    const users = await userResponse.json();
    if (!Array.isArray(users) || users.length === 0) {
      console.log(`User @${handle} not found on Truth Social`);
      return [];
    }

    const userId = users[0].id;

    // 获取用户的帖子
    const postsResponse = await fetch(
      `${TRUTHSOCIAL_API_BASE}/accounts/${userId}/statuses?limit=${limit}&exclude_replies=false`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!postsResponse.ok) {
      console.error(
        `Failed to get Truth Social posts for @${handle}:`,
        postsResponse.statusText
      );
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

    const token = process.env.TRUTHSOCIAL_ACCESS_TOKEN;

    const response = await fetch(`${TRUTHSOCIAL_API_BASE}/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to verify Truth Social credentials:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error verifying Truth Social credentials:", error);
    return null;
  }
}
