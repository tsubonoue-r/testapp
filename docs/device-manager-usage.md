# DeviceManager - 使い方ガイド

## クイックスタート

### 1. 基本的な使い方

ページを開くと、自動的にデバイスが検知され、最適なレイアウトが適用されます。

### 2. 手動切り替え

ヘッダー右上の3つのボタンでデバイス表示を切り替えられます:

- 📱 **モバイル表示** - スマートフォン向けレイアウト
- 📟 **タブレット表示** - タブレット向けレイアウト
- 💻 **PC表示** - デスクトップ向けレイアウト

### 3. 設定の保存

選択したデバイス表示はLocalStorageに自動保存され、次回訪問時も維持されます。

## 動作確認

### テストページで確認

```bash
# サーバー起動（既に起動している場合は不要）
npm run dev

# ブラウザで以下にアクセス
http://localhost:3000/device-manager-test.html
```

### 確認項目

1. **自動検出**
   - ページを開いた時、画面サイズに応じたデバイスタイプが自動選択される
   - ブラウザコンソールに検出情報が表示される

2. **手動切り替え**
   - 各ボタンをクリックすると、対応するレイアウトに切り替わる
   - アクティブなボタンがハイライト表示される

3. **永続化**
   - デバイスを切り替え後、ページをリロード
   - 選択した設定が保持されている

4. **レスポンシブ**
   - ウィンドウサイズを変更
   - 保存設定がない場合、自動的に再検出される
   - 保存設定がある場合、リサイズしても設定が維持される

## デバイス固有コンテンツの表示制御

### HTMLでの使用例

```html
<!-- モバイルのみ表示 -->
<div class="mobile-only">
  <button>タップして操作</button>
</div>

<!-- タブレットのみ表示 -->
<div class="tablet-only">
  <div class="two-column-layout">...</div>
</div>

<!-- デスクトップのみ表示 -->
<div class="desktop-only">
  <div class="sidebar">...</div>
</div>
```

### JavaScriptでの制御

```javascript
// 現在のデバイスタイプを取得
const device = document.body.getAttribute('data-device');

if (device === 'mobile') {
  // モバイル専用処理
  console.log('Mobile device detected');
} else if (device === 'tablet') {
  // タブレット専用処理
  console.log('Tablet device detected');
} else if (device === 'desktop') {
  // デスクトップ専用処理
  console.log('Desktop device detected');
}
```

## 実用例

### 1. ナビゲーションの切り替え

```html
<!-- モバイル: ハンバーガーメニュー -->
<div class="mobile-only">
  <button class="hamburger-menu">☰</button>
</div>

<!-- タブレット/PC: 通常のナビゲーション -->
<nav class="desktop-only tablet-only">
  <a href="/home">ホーム</a>
  <a href="/projects">プロジェクト</a>
  <a href="/photos">写真</a>
</nav>
```

### 2. フォームレイアウトの最適化

```html
<!-- モバイル: 縦1列 -->
<form class="mobile-only">
  <input type="text" placeholder="プロジェクト名">
  <input type="text" placeholder="場所">
  <button>保存</button>
</form>

<!-- タブレット/PC: 横2列 -->
<form class="desktop-only tablet-only">
  <div class="form-row">
    <input type="text" placeholder="プロジェクト名">
    <input type="text" placeholder="場所">
  </div>
  <button>保存</button>
</form>
```

### 3. 画像グリッドの調整

```css
/* モバイル: 2列 */
body[data-device="mobile"] .photo-grid {
  grid-template-columns: repeat(2, 1fr);
}

/* タブレット: 3列 */
body[data-device="tablet"] .photo-grid {
  grid-template-columns: repeat(3, 1fr);
}

/* PC: 4列 */
body[data-device="desktop"] .photo-grid {
  grid-template-columns: repeat(4, 1fr);
}
```

## 開発者向けTips

### デバッグ情報の表示

ブラウザコンソールを開くと、詳細な検出情報が表示されます:

```
Device Manager initialized
- Screen: 1920 x 1080
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
- Touch: false
- Pixel Ratio: 2
- Auto-detected: desktop
- Saved preference: None
- Applied device: desktop
```

### 保存設定のクリア

開発中に設定をリセットしたい場合:

```javascript
// コンソールで実行
localStorage.removeItem('preferredDevice');
location.reload();
```

または、テストページの「保存設定をクリア」ボタンを使用。

### カスタムブレークポイント

独自のブレークポイントが必要な場合、`detectDevice()`メソッドを修正:

```javascript
detectDevice() {
  const width = window.innerWidth;

  // カスタムブレークポイント
  if (width < 600) return 'mobile';        // 600px未満
  if (width < 1200) return 'tablet';       // 600-1199px
  return 'desktop';                        // 1200px以上
}
```

## よくある質問

### Q1: 自動検出が意図しないデバイスタイプを選択する

**A**: ブラウザコンソールでデバイス情報を確認し、必要に応じて`detectDevice()`のロジックを調整してください。

### Q2: LocalStorageが使えない環境での動作は？

**A**: エラーハンドリングが実装されており、LocalStorageが使えない場合は自動検出結果のみを使用します。

### Q3: リサイズ時に自動再検出させたくない

**A**: デバイスボタンを一度クリックすると、その設定が保存され、リサイズしても変更されなくなります。

### Q4: モバイルとタブレットの判定基準は？

**A**:
- モバイル: 画面幅 < 768px
- タブレット: 768px ≤ 画面幅 < 1024px
- デスクトップ: 画面幅 ≥ 1024px

### Q5: 既存のResponsiveUIクラスとの関係は？

**A**: DeviceManagerが主要な機能を提供し、ResponsiveUIは後方互換性のために残されています。

## パフォーマンス

- **初期化**: < 10ms
- **切り替え**: < 5ms（DOM操作含む）
- **リサイズイベント**: 300msデバウンス実装済み
- **メモリ**: 最小限（約1KB）

## アクセシビリティ

- **キーボード操作**: ボタンはフォーカス可能
- **スクリーンリーダー**: `title`属性でラベル提供
- **タッチターゲット**: 最小44px × 44px（モバイル）

## ブラウザサポート

| ブラウザ | バージョン | サポート |
|---------|----------|---------|
| Chrome | 最新 | ✅ |
| Firefox | 最新 | ✅ |
| Safari | 最新 | ✅ |
| Edge | 最新 | ✅ |
| iOS Safari | 12+ | ✅ |
| Chrome Mobile | 最新 | ✅ |

## トラブルシューティング

### ボタンが表示されない

```javascript
// ヘッダーのHTMLを確認
document.querySelector('.device-switcher')
```

### 切り替えが動作しない

```javascript
// イベントリスナーの確認
document.querySelectorAll('.device-switcher button').forEach(btn => {
  console.log('Button:', btn.dataset.device);
});
```

### LocalStorageエラー

```javascript
// LocalStorageの状態確認
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('LocalStorage OK');
} catch (e) {
  console.error('LocalStorage error:', e);
}
```

## 次のステップ

- `/testapp/public/index.html` でメイン実装を確認
- `/testapp/public/device-manager-test.html` でテスト実行
- `/testapp/docs/device-manager.md` で技術詳細を確認

---

**ヘルプが必要な場合**: GitHub Issuesで質問してください。
