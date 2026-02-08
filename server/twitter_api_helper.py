#!/usr/bin/env python3
"""
Twitter API Helper - 使用 Manus 内置的免费 Twitter API
"""
import sys
import json
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

def get_user_profile(username):
    """获取 Twitter 用户信息"""
    try:
        client = ApiClient()
        response = client.call_api('Twitter/get_user_profile_by_username', query={'username': username})
        
        if not response or 'result' not in response:
            return None
            
        user_data = response.get('result', {}).get('data', {}).get('user', {}).get('result', {})
        if not user_data:
            return None
            
        core = user_data.get('core', {})
        legacy = user_data.get('legacy', {})
        avatar = user_data.get('avatar', {})
        verification = user_data.get('verification', {})
        
        return {
            'rest_id': user_data.get('rest_id', ''),
            'screen_name': core.get('screen_name', username),
            'name': core.get('name', legacy.get('name', username)),
            'description': legacy.get('description'),
            'followers_count': legacy.get('followers_count', 0),
            'verified': verification.get('verified', False) or user_data.get('is_blue_verified', False),
            'profile_image_url': avatar.get('image_url'),
        }
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return None

def get_user_tweets(user_id, count=20, cursor=None):
    """获取 Twitter 用户的推文"""
    try:
        client = ApiClient()
        query_params = {
            'user': str(user_id),
            'count': str(count),
        }
        
        if cursor:
            query_params['cursor'] = cursor
            
        response = client.call_api('Twitter/get_user_tweets', query=query_params)
        
        if not response or 'result' not in response:
            return {'tweets': [], 'nextCursor': None}
            
        tweets = []
        next_cursor = None
        
        timeline = response.get('result', {}).get('timeline', {})
        instructions = timeline.get('instructions', [])
        
        for instruction in instructions:
            if instruction.get('type') == 'TimelineAddEntries':
                entries = instruction.get('entries', [])
                for entry in entries:
                    entry_id = entry.get('entryId', '')
                    if entry_id.startswith('tweet-'):
                        content = entry.get('content', {})
                        tweet_results = content.get('itemContent', {}).get('tweet_results', {})
                        tweet_data = tweet_results.get('result', {})
                        
                        if tweet_data:
                            legacy = tweet_data.get('legacy', {})
                            tweet = {
                                'id': legacy.get('id_str', tweet_data.get('rest_id', '')),
                                'text': legacy.get('full_text', ''),
                                'created_at': legacy.get('created_at', ''),
                                'retweet_count': legacy.get('retweet_count', 0),
                                'favorite_count': legacy.get('favorite_count', 0),
                                'reply_count': legacy.get('reply_count', 0),
                                'quote_count': legacy.get('quote_count', 0),
                                'is_retweet': bool(legacy.get('retweeted_status_result')),
                                'is_reply': bool(legacy.get('in_reply_to_status_id_str')),
                            }
                            
                            # 提取媒体
                            entities = legacy.get('entities', {})
                            media = entities.get('media', [])
                            if media:
                                tweet['media'] = [
                                    {
                                        'type': m.get('type', 'photo'),
                                        'url': m.get('media_url_https', m.get('media_url', ''))
                                    }
                                    for m in media
                                ]
                            
                            tweets.append(tweet)
                    elif entry_id.startswith('cursor-bottom-'):
                        cursor_content = entry.get('content', {})
                        if cursor_content.get('value'):
                            next_cursor = cursor_content['value']
        
        return {'tweets': tweets, 'nextCursor': next_cursor}
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return {'tweets': [], 'nextCursor': None}

def get_tweets_by_username(username, count=20):
    """通过用户名获取推文（组合接口）"""
    try:
        # 首先获取用户信息
        user_profile = get_user_profile(username)
        if not user_profile or not user_profile.get('rest_id'):
            return []
        
        # 然后获取推文
        result = get_user_tweets(user_profile['rest_id'], count)
        return result.get('tweets', [])
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return []

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: twitter_api_helper.py <command> <args>'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'get_profile':
        username = sys.argv[2]
        result = get_user_profile(username)
        print(json.dumps(result))
    elif command == 'get_tweets':
        username = sys.argv[2]
        count = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        result = get_tweets_by_username(username, count)
        print(json.dumps(result))
    else:
        print(json.dumps({'error': f'Unknown command: {command}'}))
        sys.exit(1)
