import { callDataApi } from "./_core/dataApi";

interface TwitterUser {
  rest_id: string;
  screen_name: string;
  name: string;
  description?: string;
  followers_count: number;
  verified: boolean;
  profile_image_url?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  retweet_count: number;
  favorite_count: number;
  reply_count: number;
  quote_count: number;
  is_retweet: boolean;
  is_reply: boolean;
  media?: Array<{
    type: string;
    url: string;
  }>;
}

/**
 * 获取 Twitter 用户信息
 */
export async function getTwitterUserProfile(username: string): Promise<TwitterUser | null> {
  try {
    const result = await callDataApi("Twitter/get_user_profile_by_username", {
      query: { username },
    });

    if (!result) {
      console.error(`Failed to get Twitter profile for @${username}`);
      return null;
    }

    // 解析嵌套结构: result.data.user.result
    const userData = (result as any).result?.data?.user?.result;
    if (!userData) {
      console.error(`No user data found for @${username}`);
      return null;
    }

    const core = userData.core || {};
    const legacy = userData.legacy || {};

    return {
      rest_id: userData.rest_id || "",
      screen_name: core.screen_name || username,
      name: core.name || "",
      description: legacy.description || "",
      followers_count: legacy.followers_count || 0,
      verified: userData.verification?.verified || false,
      profile_image_url: userData.avatar?.image_url || "",
    };
  } catch (error) {
    console.error(`Error fetching Twitter profile for @${username}:`, error);
    return null;
  }
}

/**
 * 通过用户名获取推文
 */
export async function getTwitterTweetsByUsername(
  username: string,
  count: number = 20
): Promise<TwitterTweet[]> {
  try {
    // 首先获取用户信息以获取 rest_id
    const userProfile = await getTwitterUserProfile(username);
    if (!userProfile) {
      console.error(`Failed to get user profile for @${username}`);
      return [];
    }

    // 使用 rest_id 获取推文
    const result = await callDataApi("Twitter/get_user_tweets", {
      query: {
        user: userProfile.rest_id,
        count: count.toString(),
      },
    });

    if (!result) {
      console.error(`Failed to get tweets for @${username}`);
      return [];
    }

    // 解析推文数据
    const tweets: TwitterTweet[] = [];
    const timeline = (result as any).result?.timeline;
    if (!timeline) {
      return tweets;
    }

    const instructions = timeline.instructions || [];
    for (const instruction of instructions) {
      if (instruction.type === "TimelineAddEntries") {
        const entries = instruction.entries || [];
        for (const entry of entries) {
          if (entry.entryId?.startsWith("tweet-")) {
            const content = entry.content || {};
            const tweetResults = content.itemContent?.tweet_results;
            if (tweetResults?.result) {
              const tweetData = tweetResults.result;
              const legacy = tweetData.legacy || {};

              tweets.push({
                id: legacy.id_str || tweetData.rest_id || "",
                text: legacy.full_text || "",
                created_at: legacy.created_at || "",
                retweet_count: legacy.retweet_count || 0,
                favorite_count: legacy.favorite_count || 0,
                reply_count: legacy.reply_count || 0,
                quote_count: legacy.quote_count || 0,
                is_retweet: !!legacy.retweeted_status_result,
                is_reply: !!legacy.in_reply_to_status_id_str,
                media: (legacy.entities?.media || []).map((m: any) => ({
                  type: m.type || "photo",
                  url: m.media_url_https || m.url || "",
                })),
              });
            }
          }
        }
      }
    }

    return tweets.slice(0, count);
  } catch (error) {
    console.error(`Error fetching tweets for @${username}:`, error);
    return [];
  }
}
