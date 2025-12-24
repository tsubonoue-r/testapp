# DeviceManager - 自動デバイス検知とUI切り替え機能

## 概要

`DeviceManager`は、ユーザーのデバイスタイプを自動検知し、手動でのUI切り替えも可能にする機能です。LocalStorageを使用してユーザーの選択を永続化し、最適なユーザー体験を提供します。

## 主要機能

### 1. 自動デバイス検知

以下の情報を組み合わせて、デバイスタイプを自動判定します:

- **User-Agent文字列**: iPhone、iPad、Android端末を識別
- **画面サイズ** (`window.innerWidth`): プライマリファクター
  - モバイル: < 768px
  - タブレット: 768px - 1023px
  - デスクトップ: >= 1024px
- **タッチサポート**: `ontouchstart` イベント、`maxTouchPoints`
- **デバイスピクセル比**: `devicePixelRatio`（高DPIデバイス検出）

### 2. 手動UI切り替え

ヘッダーに3つのボタンを配置:

- 📱 **モバイル表示**: モバイル向けレイアウト
- 📟 **タブレット表示**: タブレット向けレイアウト
- 💻 **PC表示**: デスクトップ向けレイアウト

### 3. 設定の永続化

LocalStorageを使用してユーザーの選択を保存し、次回訪問時に復元します。

**ストレージキー**: `preferredDevice`

### 4. 優先順位

デバイスタイプの決定は以下の優先順位で行われます:

1. **LocalStorageの保存済み設定** - ユーザーが手動で選択した設定
2. **自動検出結果** - デバイス情報から自動判定
3. **デフォルト（レスポンシブCSS）** - CSSメディアクエリによるフォールバック

## API

### DeviceManager クラス

```javascript
class DeviceManager {
  constructor()

  // デバイス自動検出
  detectDevice(): string  // 'mobile' | 'tablet' | 'desktop'

  // LocalStorageから保存済み設定を取得
  getSavedDevice(): string | null

  // LocalStorageに設定を保存
  saveDevice(device: string): void

  // UIにデバイス設定を適用
  applyDevice(device: string): void

  // 切り替えボタンの状態を更新
  updateSwitcherButtons(device: string): void

  // タッチ最適化を有効化（モバイル専用）
  enableTouchOptimizations(): void

  // キーボードショートカットを有効化（デスクトップ専用）
  enableKeyboardShortcuts(): void

  // 初期化
  init(): void
}
```

### 使用例

```javascript
// 自動初期化（index.htmlで実装済み）
const deviceManager = new DeviceManager();

// 手動でデバイスを切り替え
deviceManager.saveDevice('tablet');
deviceManager.applyDevice('tablet');

// 現在の設定を取得
const currentDevice = deviceManager.getSavedDevice();
console.log('Current device:', currentDevice);

// 自動検出を実行
const detectedDevice = deviceManager.detectDevice();
console.log('Auto-detected:', detectedDevice);
```

## CSS クラス

### デバイス固有の表示制御

```css
/* モバイル表示時のみ表示 */
.mobile-only { ... }

/* タブレット表示時のみ表示 */
.tablet-only { ... }

/* デスクトップ表示時のみ表示 */
.desktop-only { ... }
```

### 実装例

```html
<!-- モバイルのみ表示 -->
<div class="mobile-only">
  この内容はモバイル表示時のみ表示されます
</div>

<!-- タブレットのみ表示 -->
<div class="tablet-only">
  この内容はタブレット表示時のみ表示されます
</div>

<!-- デスクトップのみ表示 -->
<div class="desktop-only">
  この内容はデスクトップ表示時のみ表示されます
</div>
```

## デバイス検出ロジック

### 判定フロー

```
1. User-Agent解析
   - iPhone/iPod/Android Mobile → モバイル候補
   - iPad/Android (非Mobile) → タブレット候補

2. 画面サイズ判定（主要ファクター）
   - width < 768px → モバイル
   - 768px <= width < 1024px
     - タブレットUA OR (タッチ AND 高DPI) → タブレット
     - それ以外 → タブレット
   - width >= 1024px → デスクトップ

3. 優先順位適用
   - 保存済み設定がある → その設定を使用
   - 保存済み設定なし → 自動検出結果を使用
```

## イベント処理

### ボタンクリック

```javascript
document.querySelectorAll('.device-switcher button').forEach(btn => {
  btn.addEventListener('click', () => {
    const selectedDevice = btn.dataset.device;
    deviceManager.saveDevice(selectedDevice);
    deviceManager.applyDevice(selectedDevice);
  });
});
```

### ウィンドウリサイズ

```javascript
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // 保存済み設定がない場合のみ再検出
    if (!deviceManager.getSavedDevice()) {
      const newDevice = deviceManager.detectDevice();
      deviceManager.applyDevice(newDevice);
    }
  }, 300); // 300msデバウンス
});
```

## デバイス固有の最適化

### モバイル向け

```javascript
enableTouchOptimizations() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('touchstart', function() {
      this.style.opacity = '0.8';
    }, { passive: true });

    card.addEventListener('touchend', function() {
      this.style.opacity = '1';
    }, { passive: true });
  });
}
```

### デスクトップ向け

```javascript
enableKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: 新規プロジェクト
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      app.showCreateProjectModal();
    }

    // Ctrl/Cmd + P: 写真撮影
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      app.showCameraModal();
    }
  });
}
```

## テスト

### テストページ

テスト用HTMLを用意しています:

```
/testapp/public/device-manager-test.html
```

### テスト項目

1. **自動検出の確認**
   - ブラウザウィンドウをリサイズして自動検出を確認
   - 各ブレークポイント（768px、1024px）での動作確認

2. **手動切り替えの確認**
   - 各ボタン（モバイル/タブレット/PC）をクリック
   - 対応するコンテンツのみが表示されることを確認

3. **永続化の確認**
   - デバイスを切り替え
   - ページをリロード
   - 選択が保持されていることを確認

4. **優先順位の確認**
   - 保存設定がある場合、リサイズしても変更されないことを確認
   - 保存設定をクリア後、リサイズで自動検出されることを確認

## ブラウザ互換性

- **モダンブラウザ**: Chrome, Firefox, Safari, Edge（最新版）
- **モバイルブラウザ**: iOS Safari, Chrome Mobile, Samsung Internet
- **LocalStorage**: 全対応（エラーハンドリング実装済み）

## トラブルシューティング

### LocalStorageが使えない

```javascript
// エラーハンドリング実装済み
getSavedDevice() {
  try {
    return localStorage.getItem(this.storageKey);
  } catch (e) {
    console.warn('LocalStorage not available:', e);
    return null;
  }
}
```

### ボタンが反応しない

- `DOMContentLoaded`イベント待機を確認
- ブラウザコンソールでエラーを確認

### 自動検出が正しくない

- ブラウザコンソールでデバイス情報を確認:
  ```javascript
  console.log('Width:', window.innerWidth);
  console.log('UA:', navigator.userAgent);
  console.log('Touch:', 'ontouchstart' in window);
  console.log('Pixel Ratio:', window.devicePixelRatio);
  ```

## ロギング

DeviceManagerは初期化時に詳細なログを出力します:

```
Device Manager initialized
- Screen: 1920 x 1080
- User-Agent: Mozilla/5.0...
- Touch: false
- Pixel Ratio: 2
- Auto-detected: desktop
- Saved preference: None
- Applied device: desktop
```

## 今後の拡張案

- [ ] デバイス切り替え時のアニメーション
- [ ] より詳細なデバイス情報の保存（画面サイズ、向きなど）
- [ ] カスタムブレークポイントの設定機能
- [ ] A/Bテスト用のバリアント機能
- [ ] アナリティクス連携（デバイス切り替えトラッキング）

## 関連ファイル

- `/testapp/public/index.html` - メイン実装
- `/testapp/public/device-manager-test.html` - テストページ
- `/testapp/docs/device-manager.md` - このドキュメント

---

**最終更新**: 2025-12-24
**バージョン**: 1.0.0
**作成者**: Claude Code (DeviceManager Feature)
