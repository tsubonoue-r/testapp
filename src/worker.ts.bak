/**
 * Cloudflare Workers Entry Point
 * Expressアプリのラッパー
 */

import app from './server.js';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      // Expressアプリを使ってリクエストを処理
      // Note: このアプローチはNode.js互換性モードが必要

      // 簡易的なヘルスチェックレスポンス
      const url = new URL(request.url);

      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          service: '工事看板写真システム API (Cloudflare Workers)',
          platform: 'Cloudflare Workers'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // その他のルートについては、まだ実装中
      return new Response(JSON.stringify({
        message: 'Cloudflare Workers deployment in progress',
        note: 'Full Express app migration coming soon',
        availableEndpoints: ['/api/health']
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  },
};
