import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const PYTHON_SCRIPT = path.join(__dirname, "twitter_api_helper.py");
const PYTHON_CMD = process.env.PYTHON_PATH || "python3";

/**
 * 获取 Twitter 用户信息
 */
export async function getTwitterUserProfile(username: string): Promise<TwitterUser | null> {
  try {
    const { stdout } = await execAsync(`${PYTHON_CMD} ${PYTHON_SCRIPT} get_profile ${username}`);
    const result = JSON.parse(stdout);
    
    if (!result || result.error) {
      console.error(`Failed to get Twitter profile for @${username}:`, result?.error);
      return null;
    }
    
    return result as TwitterUser;
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
    const { stdout } = await execAsync(`${PYTHON_CMD} ${PYTHON_SCRIPT} get_tweets ${username} ${count}`);
    const result = JSON.parse(stdout);
    
    if (!result || result.error) {
      console.error(`Failed to get tweets for @${username}:`, result?.error);
      return [];
    }
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`Error fetching tweets for @${username}:`, error);
    return [];
  }
}
