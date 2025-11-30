/**
 * PWA初期化スクリプト
 * Service Workerの登録とインストールプロンプト
 */

// Service Worker登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // 更新チェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Service Worker updating...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいバージョンが利用可能
              if (confirm('新しいバージョンが利用可能です。更新しますか？')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// PWAインストールプロンプト
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 PWA install prompt available');

  // デフォルトのプロンプトを抑制
  e.preventDefault();

  // プロンプトを保存
  deferredPrompt = e;

  // インストールバナーを表示
  showInstallBanner();
});

// インストールバナーを表示
function showInstallBanner() {
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `
    <style>
      #install-banner {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        max-width: 90%;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideUp 0.3s ease-out;
      }

      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }

      #install-banner-text {
        flex: 1;
        font-size: 14px;
      }

      #install-banner-btn {
        background: white;
        color: #667eea;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }

      #install-banner-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0 4px;
      }
    </style>
    <div id="install-banner-text">
      📱 ホーム画面に追加してアプリのように使えます
    </div>
    <button id="install-banner-btn">インストール</button>
    <button id="install-banner-close">×</button>
  `;

  document.body.appendChild(banner);

  // インストールボタンのイベント
  document.getElementById('install-banner-btn').addEventListener('click', async () => {
    if (!deferredPrompt) {
      // iOSの場合は手動インストールガイドを表示
      showIOSInstallGuide();
      return;
    }

    // プロンプトを表示
    deferredPrompt.prompt();

    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // プロンプトをクリア
    deferredPrompt = null;

    // バナーを削除
    banner.remove();
  });

  // 閉じるボタンのイベント
  document.getElementById('install-banner-close').addEventListener('click', () => {
    banner.remove();
  });
}

// iOS用インストールガイドを表示
function showIOSInstallGuide() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (!isIOS || !isSafari) {
    alert('このブラウザではPWAインストールがサポートされていません。');
    return;
  }

  const modal = document.createElement('div');
  modal.innerHTML = `
    <style>
      .ios-install-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .ios-install-content {
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
      }

      .ios-install-content h2 {
        font-size: 20px;
        margin-bottom: 16px;
        color: #333;
      }

      .ios-install-step {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
        font-size: 14px;
        line-height: 1.6;
      }

      .ios-install-step-num {
        background: #667eea;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        flex-shrink: 0;
      }

      .ios-install-close {
        width: 100%;
        padding: 12px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 16px;
      }
    </style>
    <div class="ios-install-modal">
      <div class="ios-install-content">
        <h2>📱 ホーム画面に追加する方法</h2>

        <div class="ios-install-step">
          <div class="ios-install-step-num">1</div>
          <div>画面下部の<strong>共有ボタン</strong>（□↑）をタップ</div>
        </div>

        <div class="ios-install-step">
          <div class="ios-install-step-num">2</div>
          <div>メニューから<strong>「ホーム画面に追加」</strong>を選択</div>
        </div>

        <div class="ios-install-step">
          <div class="ios-install-step-num">3</div>
          <div>アプリ名を確認して<strong>「追加」</strong>をタップ</div>
        </div>

        <div class="ios-install-step">
          <div class="ios-install-step-num">4</div>
          <div>ホーム画面にアイコンが追加されます！</div>
        </div>

        <button class="ios-install-close">閉じる</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.ios-install-close').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// インストール完了時の処理
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully!');

  // インストールバナーを削除
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.remove();
  }

  // 感謝メッセージを表示
  setTimeout(() => {
    alert('✅ アプリをインストールしました！\nホーム画面から起動できます。');
  }, 500);
});

// スタンドアロンモード検出
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 Running in standalone mode');
  document.body.classList.add('standalone-mode');
}

// オフライン検出
window.addEventListener('online', () => {
  console.log('🌐 Online');
  showNetworkStatus('オンラインに戻りました', 'success');
});

window.addEventListener('offline', () => {
  console.log('📡 Offline');
  showNetworkStatus('オフラインモードです', 'warning');
});

function showNetworkStatus(message, type) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#4caf50' : '#ff9800'};
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 10000;
    animation: fadeInOut 3s ease-in-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0%, 100% { opacity: 0; }
      10%, 90% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    style.remove();
  }, 3000);
}
