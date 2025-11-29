/**
 * testapp - Entry Point
 *
 * Autonomous development powered by Miyabi framework
 * 工事看板写真システム
 */

import { ConstructionSignboardAPI } from './api/index.js';
import { ProjectStatus, SignboardTemplate } from './types/index.js';

console.log('🌸 Welcome to testapp!');
console.log('Powered by Miyabi - Autonomous AI Development Framework');
console.log('');
console.log('This project includes:');
console.log('  ✓ 7 AI agents ready to work');
console.log('  ✓ Automatic Issue → PR pipeline');
console.log('  ✓ 53-label state machine');
console.log('  ✓ CI/CD automation');
console.log('');
console.log('📸 工事看板写真システム');
console.log('  ✓ 案件管理機能');
console.log('  ✓ 工事看板作成・編集');
console.log('  ✓ 写真管理（案件ごと）');
console.log('');
console.log('Next steps:');
console.log('  1. Create an issue: gh issue create --title "Your task"');
console.log('  2. Watch agents work: npx miyabi status --watch');
console.log('  3. Review the PR when ready');
console.log('');
console.log('Documentation: See CLAUDE.md and README.md');

export function hello(): string {
  return 'Hello from testapp!';
}

// Example async function
export async function main(): Promise<void> {
  console.log('\n=== 工事看板写真システム デモ ===\n');

  // APIインスタンスを作成
  const api = new ConstructionSignboardAPI();

  console.log('📊 ヘルスチェック:', JSON.stringify(api.health(), null, 2));
  console.log('📌 バージョン:', JSON.stringify(api.version(), null, 2));

  try {
    // デモ: 案件を作成
    console.log('\n🏗️  案件を作成...');
    const project = api.projects.create({
      name: '道路拡張工事',
      description: '国道123号線の拡張工事',
      location: '東京都千代田区',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    });
    console.log('✓ 案件作成完了:', project.name);

    // デモ: 工事看板を作成
    console.log('\n🪧 工事看板を作成...');
    const signboard = api.signboards.create({
      projectId: project.id,
      title: '道路拡張工事看板',
      content: {
        projectName: '道路拡張工事',
        constructionPeriod: '2025年1月〜2025年12月',
        contractor: '株式会社建設テック',
        supervisor: '山田太郎',
        contact: '03-1234-5678',
      },
      template: SignboardTemplate.STANDARD,
    });
    console.log('✓ 工事看板作成完了:', signboard.title);

    // デモ: 写真を登録
    console.log('\n📸 写真を登録...');
    const photo = api.photos.create({
      projectId: project.id,
      signboardId: signboard.id,
      filename: 'site-photo-001.jpg',
      filepath: '/photos/2025/01/site-photo-001.jpg',
      caption: '着工前の現場写真',
      metadata: {
        width: 1920,
        height: 1080,
        size: 2048000,
        format: 'jpg',
      },
      takenAt: new Date(),
    });
    console.log('✓ 写真登録完了:', photo.filename);

    // デモ: 案件のステータスを更新
    console.log('\n🔄 案件ステータスを更新...');
    const updatedProject = api.projects.updateStatus(project.id, ProjectStatus.IN_PROGRESS);
    console.log('✓ ステータス更新:', updatedProject.status);

    // 集計情報を表示
    console.log('\n📊 システム概要:');
    console.log(`  案件数: ${api.projects.list().items.length}`);
    console.log(`  工事看板数: ${api.signboards.list().length}`);
    console.log(`  写真数: ${api.photos.list().items.length}`);

    console.log('\n✅ デモ完了！');
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
