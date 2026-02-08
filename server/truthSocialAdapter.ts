import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const PYTHON_SCRIPT = path.join(__dirname, "truthsocial_api_helper.py");
const PYTHON_CMD = process.env.PYTHON_PATH || "python3";

/**
 * 检查 Truth Social 是否已配置
 */
export function isTruthSocialConfigured(): boolean {
  return !!(process.env.TRUTHSOCIAL_USERNAME || process.env.TRUTHSOCIAL_TOKEN);
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

    const { stdout } = await execAsync(`${PYTHON_CMD} ${PYTHON_SCRIPT} get_posts ${handle} ${limit}`);
    const result = JSON.parse(stdout);
    
    if (result.error) {
      console.error(`Failed to get Truth Social posts for @${handle}:`, result.error);
      return [];
    }
    
    return result.posts || [];
  } catch (error) {
    console.error(`Error fetching Truth Social posts for @${handle}:`, error);
    return [];
  }
}
