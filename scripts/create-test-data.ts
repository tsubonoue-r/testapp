/**
 * テストデータ作成スクリプト
 * 本番環境でテストするためのサンプルデータを作成します
 */

const API_BASE_URL = process.env.API_URL || 'https://testapp.tsubonoue-r.workers.dev';

interface Project {
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  startDate: string;
  endDate?: string;
}

interface Sign {
  projectId: number;
  name: string;
  location: string;
  type: 'construction' | 'safety' | 'information';
}

interface Photo {
  signId: number;
  title: string;
  description: string;
  category: 'before' | 'during' | 'after' | 'inspection';
}

async function createProject(project: Project): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const data = await response.json();
  return data.data.id;
}

async function createSign(sign: Sign): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/signs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sign),
  });
  const data = await response.json();
  return data.data.id;
}

async function createPhoto(photo: Photo & { file: Blob }): Promise<void> {
  const formData = new FormData();
  formData.append('file', photo.file);
  formData.append('signId', photo.signId.toString());
  formData.append('title', photo.title);
  formData.append('description', photo.description);
  formData.append('category', photo.category);

  await fetch(`${API_BASE_URL}/api/photos`, {
    method: 'POST',
    body: formData,
  });
}

async function createTestData() {
  console.log('🌸 テストデータ作成開始...\n');

  try {
    // プロジェクト作成
    console.log('📁 プロジェクトを作成中...');
    const project1Id = await createProject({
      name: '渋谷駅前道路工事',
      description: '渋谷駅前の道路拡張工事プロジェクト',
      status: 'in_progress',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
    });
    console.log(`✓ プロジェクト1作成完了 (ID: ${project1Id})`);

    const project2Id = await createProject({
      name: '新宿ビル建設',
      description: '新宿エリアの高層ビル建設プロジェクト',
      status: 'in_progress',
      startDate: '2025-02-01',
    });
    console.log(`✓ プロジェクト2作成完了 (ID: ${project2Id})\n`);

    // 看板作成
    console.log('🪧 看板を作成中...');
    const sign1Id = await createSign({
      projectId: project1Id,
      name: '工事現場入口',
      location: '渋谷駅前交差点',
      type: 'construction',
    });
    console.log(`✓ 看板1作成完了 (ID: ${sign1Id})`);

    const sign2Id = await createSign({
      projectId: project1Id,
      name: '安全確認エリア',
      location: '工事エリアA',
      type: 'safety',
    });
    console.log(`✓ 看板2作成完了 (ID: ${sign2Id})`);

    const sign3Id = await createSign({
      projectId: project2Id,
      name: 'ビル建設現場',
      location: '新宿3丁目',
      type: 'construction',
    });
    console.log(`✓ 看板3作成完了 (ID: ${sign3Id})\n`);

    // ダミー画像作成（1x1ピクセルのPNG）
    const createDummyImage = (): Blob => {
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, 1, 1);
      }
      return new Blob([], { type: 'image/png' });
    };

    // 写真作成
    console.log('📷 写真を作成中...');
    const dummyImage = createDummyImage();

    await createPhoto({
      signId: sign1Id,
      title: '着工前の状態',
      description: '工事開始前の現場写真',
      category: 'before',
      file: dummyImage,
    });
    console.log('✓ 写真1作成完了');

    await createPhoto({
      signId: sign1Id,
      title: '工事中の様子',
      description: '道路拡張作業中',
      category: 'during',
      file: dummyImage,
    });
    console.log('✓ 写真2作成完了');

    await createPhoto({
      signId: sign2Id,
      title: '安全確認の状況',
      description: '安全管理体制の確認',
      category: 'inspection',
      file: dummyImage,
    });
    console.log('✓ 写真3作成完了');

    await createPhoto({
      signId: sign3Id,
      title: 'ビル基礎工事',
      description: 'ビルの基礎部分の施工状況',
      category: 'during',
      file: dummyImage,
    });
    console.log('✓ 写真4作成完了\n');

    console.log('✅ テストデータ作成完了！');
    console.log(`\n📊 作成されたデータ:`);
    console.log(`   - プロジェクト: 2件`);
    console.log(`   - 看板: 3件`);
    console.log(`   - 写真: 4件`);
    console.log(`\n🌐 確認URL: ${API_BASE_URL}`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  createTestData().catch(console.error);
}

export { createTestData };
