#!/usr/bin/env python3
"""
Truth Social API Helper - 使用 truthbrush 获取 Truth Social 帖子
需要配置环境变量：
- TRUTHSOCIAL_USERNAME
- TRUTHSOCIAL_PASSWORD
或
- TRUTHSOCIAL_TOKEN
"""
import sys
import json
import os

try:
    from truthbrush import api
except ImportError:
    print(json.dumps({'error': 'truthbrush not installed. Run: pip install truthbrush'}))
    sys.exit(1)

def get_user_posts(handle, limit=20):
    """获取 Truth Social 用户的帖子"""
    try:
        # 检查是否配置了认证信息
        if not os.getenv('TRUTHSOCIAL_USERNAME') and not os.getenv('TRUTHSOCIAL_TOKEN'):
            return {'error': 'Truth Social credentials not configured'}
        
        # 初始化 API 客户端
        client = api.TruthSocial()
        
        # 获取用户信息
        user_info = client.user(handle)
        if not user_info:
            return {'error': f'User @{handle} not found'}
        
        # 获取用户的帖子
        posts = []
        for status in client.statuses(handle):
            post = {
                'id': status.get('id', ''),
                'text': status.get('content', ''),
                'created_at': status.get('created_at', ''),
                'reblogs_count': status.get('reblogs_count', 0),
                'favourites_count': status.get('favourites_count', 0),
                'replies_count': status.get('replies_count', 0),
                'url': status.get('url', ''),
            }
            
            # 提取媒体
            media_attachments = status.get('media_attachments', [])
            if media_attachments:
                post['media'] = [
                    {
                        'type': m.get('type', 'image'),
                        'url': m.get('url', '')
                    }
                    for m in media_attachments
                ]
            
            posts.append(post)
            
            # 限制数量
            if len(posts) >= limit:
                break
        
        return {'posts': posts}
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: truthsocial_api_helper.py get_posts <handle> [limit]'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'get_posts':
        handle = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        result = get_user_posts(handle, limit)
        print(json.dumps(result))
    else:
        print(json.dumps({'error': f'Unknown command: {command}'}))
        sys.exit(1)
