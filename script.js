// UI/画面遷移ロジック

// タイトル演出アニメーション
function playTitleAnimation() {
    const flash = document.getElementById('flash-effect');
    const line1 = document.getElementById('title-line-1');
    const line2 = document.getElementById('title-line-2');
    const ruby = document.getElementById('title-ruby');
    const startMsg = document.getElementById('start-msg');

    // 1. 最初のフラッシュと一行目表示
    setTimeout(() => {
        flash.classList.add('do-flash');
        line1.classList.add('visible');
    }, 500);

    // 2. 二回目のフラッシュとふりがな・二行目表示
    setTimeout(() => {
        flash.classList.remove('do-flash');
        void flash.offsetWidth; // アニメーションを再起動させるためのハック
        flash.classList.add('do-flash');
        
        ruby.classList.add('visible');
        line2.classList.add('visible');
    }, 1500);

    // 3. スタートメッセージ表示
    setTimeout(() => {
        startMsg.classList.add('visible');
    }, 2500);
}

// 音声再生ロジック

let lastPlayedVoice = null; // 最後に再生した音声を記録
let currentAudio = null; // 現在再生中の音声オブジェクト
let isAudioPlaying = false; // 音声再生中フラグ

// 音声ファイルのパス配列
const VOICE_FILES = [
    'sounds/voice_1.wav', // 頑張って
    'sounds/voice_2.wav', // もう少し (26枚後のみ)
    'sounds/voice_3.wav', // いい調子
    'sounds/voice_4.wav', // お疲れ様 (52枚目のみ)
    'sounds/voice_5.wav', // 焦らないで
    'sounds/voice_6.wav', // 完璧だね
    'sounds/voice_7.wav', // 落ち着いて
    'sounds/voice_8.wav'  // 半分だよ (26枚目のみ)
];

function playVoice() {
    const foundCount = gameState.foundPairs.length;
    const flippedCount = gameState.flippedCards.length;
    const maxPairs = totalCards / 2;
    
    // 全クリアの場合
    if (foundCount === maxPairs) {
        playSpecificVoice(4);
        return;
    }
    
    // 半分達成の場合
    if (foundCount === Math.floor(maxPairs / 2)) {
        playSpecificVoice(8);
        return;
    }
    
    let availableVoices;
    
    if (flippedCount === 1) {
        if (foundCount > Math.floor(maxPairs / 2)) {
            availableVoices = [1, 2, 3, 5, 7]; // voice_2を含む
        } else {
            availableVoices = [1, 3, 5, 7];
        }
    }
    else if (flippedCount === 2) {
        const [id1, id2] = gameState.flippedCards;
        const card1 = deck.find(c => c.id === id1);
        const card2 = deck.find(c => c.id === id2);
        const isMatch = (card1.rank === card2.rank);
        
        if (isMatch) {
            availableVoices = [3, 6];
        } else {
            if (foundCount > Math.floor(maxPairs / 2)) {
                availableVoices = [1, 2, 5, 7];
            } else {
                availableVoices = [1, 5, 7];
            }
        }
    }
    
    let candidates = availableVoices.filter(v => v !== lastPlayedVoice);
    
    if (candidates.length === 0) {
        candidates = availableVoices;
    }
    
    const selectedVoice = candidates[Math.floor(Math.random() * candidates.length)];
    playSpecificVoice(selectedVoice);
}

function playSpecificVoice(voiceNumber) {
    // 前の音声を停止
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    
    // 新しい音声を作成・再生
    currentAudio = new Audio(VOICE_FILES[voiceNumber - 1]);
    
    // 音声読み込み完了時の処理
    currentAudio.addEventListener('loadeddata', () => {
        isAudioPlaying = true;
    });
    
    // 音声再生完了時の処理
    currentAudio.addEventListener('ended', () => {
        isAudioPlaying = false;
    });
    
    // エラー処理
    currentAudio.addEventListener('error', (err) => {
        console.error('音声再生エラー:', err);
        isAudioPlaying = false;
    });
    
    // 再生開始
    currentAudio.play().catch(err => {
        console.error('音声再生エラー:', err);
        isAudioPlaying = false;
    });
    
    lastPlayedVoice = voiceNumber;
}

// タイトル -> メニュー
function showMenu() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}

// メニュー -> ゲーム画面
function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // ゲームの初期化処理を実行
    if (deck.length === 0) {
        initGame(); 
    }
}

// メニュー -> カード枚数選択画面
function showCardCountSelection() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('card-count-screen').classList.remove('hidden');
}

// カード枚数選択 -> メニュー
function backToMenu() {
    // ゲーム状態をリセット
    resetGameState();
    
    document.getElementById('card-count-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}

// ゲーム状態リセット関数
function resetGameState() {
    gameState = {
        foundPairs: [],
        flippedCards: []
    };
    localStorage.removeItem(STORAGE_KEY);
    deck = [];
    
    // ステータステキストもリセット
    const statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = "QRコードをスキャンしよう！";
    }
}

// カード枚数選択 -> ゲーム画面
function startGameWithCount() {
    // 新しいゲームを始める前に状態をリセット
    resetGameState();
    
    totalCards = parseInt(document.getElementById('game-card-count').value);
    document.getElementById('card-count-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('bg-img').classList.add('bg-dimmed');
    initGame();
}

// ゲーム画面 -> タイトル（戻るボタン）
function backToTitle() {
    if (confirm("ゲームを中断してタイトルに戻りますか？")) {
        // ゲーム状態をリセット
        resetGameState();
        
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('card-count-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('title-screen').classList.remove('hidden');
        document.getElementById('bg-img').classList.remove('bg-dimmed');
        if (html5QrCode && isScanning) {
            stopScanner();
        }
    }
}

// モーダル制御
function openModal(type, content = null) {
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.innerText = "情報";
    body.innerHTML = "";

    if (type === 'rules') {
        title.innerText = "ルール説明";
        body.innerHTML = "<p style='text-align:left;'>準備. 「QRコード生成」から使用する枚数のQRコードを選択し印刷しよう。<br>QRコードを部屋に設置しよう。1. 部屋に設置したQRコードまで移動しよう。<br>2. 「スキャン」ボタンでQRを読み取る。<br>3. トランプが表示されるよ。<br>4. 同じ数字を見つけてペアを作ろう！</p>";
    } else if (type === 'settings') {
        title.innerText = "設定";
        body.innerHTML = "<p>BGM: ON<br>難易度: ノーマル<br>（現在変更できません）</p>";
    } else if (type === 'mission_with_result') {
        title.innerText = "⚡ イベント発生 ⚡";
        
        const resultHtml = `
            <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #ccc;">
                <p style="font-size: 1.1rem; color: #333; margin-bottom: 5px;">▼ カードの結果 ▼</p>
                <p style="font-size: 1.5rem; font-weight: bold; color: #000; line-height: 1.4;">
                    ${content.result.replace(/\n/g, '<br>')}
                </p>
            </div>
        `;

        const missionHtml = `
            <div>
                <p style="font-size: 1.1rem; color: #d00; font-weight: bold; margin-bottom: 5px;">⚠️ 指令発生！ ⚠️</p>
                <p style="font-size: 1.2rem; font-weight: bold; color: #d00; line-height: 1.4;">
                    ${content.mission}
                </p>
            </div>
        `;
        body.innerHTML = resultHtml + missionHtml;
    }
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('info-modal').classList.add('hidden');
}

/* =========================================
   神経衰弱 ゲームロジック
   ========================================= */

const suits = [
    { mark: '♠', color: 'black', name: 'spade' },
    { mark: '♣', color: 'black', name: 'club' },
    { mark: '♥', color: 'red', name: 'heart' },
    { mark: '♦', color: 'red', name: 'diamond' }
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const MOVEMENT_MISSIONS = [
    "次のカードをスキャンするまで、\n3歩あるく度にスクワットを一回せよ！",
    "次のカードをスキャンするまで、\n太ももを地面と平行になるぐらい上げて歩け！",
    "次のカードをスキャンするまで、\nスキップで移動せよ！",
    "次のカードをスキャンするまで、\nカニ歩き（横歩き）で移動せよ！",
    "次のカードをスキャンするまで、\n両手を挙げて「バンザイ」の姿勢で移動せよ！",
    "次のカードをスキャンするまで、\n後ろ歩き（気をつけて！）で移動せよ！",
    "次のカードをスキャンするまで、\n常に笑顔をキープして移動せよ！",
    "その場で10回ジャンプしてから、\n次のカードを探しに行け！"
];

let deck = [];
let totalCards = 52; // デフォルト52枚
let gameState = {
    foundPairs: [],
    flippedCards: []
};
const STORAGE_KEY = 'walkingTrumpGame_52';
let html5QrCode; 
let isMessageEnabled = true;
let isScanning = false;

function initGame() {
    deck = [];
    const pairCount = totalCards / 2;
    
    // ペアごとにカードを生成
    for (let rankIndex = 0; rankIndex < 13 && rankIndex < pairCount; rankIndex++) {
        // スペード（ID: 0-12）
        const spadeId = 0 * 13 + rankIndex;
        deck.push({
            id: spadeId,
            suit: suits[0].mark,
            rank: ranks[rankIndex],
            color: suits[0].color,
            suitName: suits[0].name,
            displayName: `${suits[0].mark} ${ranks[rankIndex]}`
        });
        
        // クラブ（ID: 13-25）
        const clubId = 1 * 13 + rankIndex;
        deck.push({
            id: clubId,
            suit: suits[1].mark,
            rank: ranks[rankIndex],
            color: suits[1].color,
            suitName: suits[1].name,
            displayName: `${suits[1].mark} ${ranks[rankIndex]}`
        });
    }
    
    // 26ペア以上の場合
    if (pairCount > 13) {
        for (let rankIndex = 0; rankIndex < 13 && rankIndex < (pairCount - 13); rankIndex++) {
            // ハート（ID: 26-38）
            const heartId = 2 * 13 + rankIndex;
            deck.push({
                id: heartId,
                suit: suits[2].mark,
                rank: ranks[rankIndex],
                color: suits[2].color,
                suitName: suits[2].name,
                displayName: `${suits[2].mark} ${ranks[rankIndex]}`
            });
            
            // ダイヤ（ID: 39-51）
            const diamondId = 3 * 13 + rankIndex;
            deck.push({
                id: diamondId,
                suit: suits[3].mark,
                rank: ranks[rankIndex],
                color: suits[3].color,
                suitName: suits[3].name,
                displayName: `${suits[3].mark} ${ranks[rankIndex]}`
            });
        }
    }

    loadState();
    renderGrid();
    updateToggleButton();
    
    // ステータステキストを初期化
    document.getElementById('status-text').textContent = "QRコードをスキャンしよう！";
}

function showMessage(text) {
    if (!isMessageEnabled) return;
    const overlay = document.getElementById('custom-dialog');
    const content = document.getElementById('dialog-content');
    content.textContent = text;
    overlay.classList.add('show');
    setTimeout(() => { overlay.classList.remove('show'); }, 2500);
}

document.getElementById('scan-btn').addEventListener('click', startScanner);
document.getElementById('close-scan-btn').addEventListener('click', stopScanner);

function startScanner() {
    const container = document.getElementById('reader-container');
    container.style.display = 'block';
    document.getElementById('close-scan-btn').style.display = 'inline-block';

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .then(() => {
        isScanning = true;
    })
    .catch(err => {
        container.style.display = 'none';
        showMessage("カメラ起動エラー: " + err);
    });
}

function stopScanner() {
    document.getElementById('reader-container').style.display = 'none';
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false; 
            html5QrCode.clear();
        }).catch(err => {
            console.error("停止エラー:", err);
            isScanning = false; 
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    stopScanner();
    try {
        let idVal = null;
        if (decodedText.includes('?')) {
            const urlObj = new URL(decodedText);
            idVal = urlObj.searchParams.get('id');
        } 
        if (!idVal && !isNaN(decodedText)) idVal = decodedText;

        if (idVal !== null) {
            handleScan(parseInt(idVal));
        } else {
            showMessage("無効なQRコードです");
        }
    } catch (e) {
        showMessage("読み取りエラー");
    }
}

function handleScan(scannedId) {
    // デッキ内に該当するIDのカードがあるか確認
    const cardIndex = deck.findIndex(card => card.id === scannedId);
    
    if (cardIndex === -1) {
        showMessage("このカードは今回のゲームでは使用しません");
        return;
    }
    
    if (gameState.foundPairs.includes(scannedId)) {
        showMessage(`【${deck[cardIndex].displayName}】\n獲得済みです`);
        return;
    }

    if (gameState.flippedCards.length === 2) {
        gameState.flippedCards = [];
        renderGrid();
    }

    if (gameState.flippedCards.includes(scannedId)) {
        showMessage(`【${deck[cardIndex].displayName}】\n既にめくっています`);
        return;
    }

    gameState.flippedCards.push(scannedId);
    saveState();
    renderGrid();

    const card = deck[cardIndex];
    let resultMessage = `出たカード: ${card.displayName}`;
    let isPairCheckNeeded = false;

    if (gameState.flippedCards.length === 2) {
        const [id1, id2] = gameState.flippedCards;
        
        const card1 = deck.find(c => c.id === id1);
        const card2 = deck.find(c => c.id === id2);
        
        if (!card1 || !card2) {
            console.error('カードが見つかりません！');
            showMessage("エラーが発生しました");
            return;
        }
        
        if (card1.rank === card2.rank) {
            resultMessage = `🎉 ペア成立！\n${card1.displayName} と ${card2.displayName}`;
        } else {
            resultMessage = `😢 残念、ハズレ！\n${card1.displayName} と ${card2.displayName}`;
        }
        isPairCheckNeeded = true;
    } else {
        resultMessage = `1枚目: ${card.displayName}\n次のカードを探そう！`;
    }

    document.getElementById('status-text').textContent = `出たカード: ${card.displayName}`;

    const isMissionTriggered = Math.random() < 0.35; 

    if (isMissionTriggered) {
        const randomMission = MOVEMENT_MISSIONS[Math.floor(Math.random() * MOVEMENT_MISSIONS.length)];
        openModal('mission_with_result', {
            result: resultMessage,
            mission: randomMission
        });
    } else {
        showMessage(resultMessage);
    }

    // 音声再生
    playVoice();
    
    if (isPairCheckNeeded) {
        setTimeout(() => checkMatch(isMissionTriggered), 500);
    }
}

function checkMatch(suppressMessage = false) {
    const [id1, id2] = gameState.flippedCards;
    
    const card1 = deck.find(c => c.id === id1);
    const card2 = deck.find(c => c.id === id2);
    
    if (!card1 || !card2) {
        console.error('checkMatch: カードが見つかりません');
        return;
    }
    
    const isMatch = (card1.rank === card2.rank);

    if (isMatch) {
        gameState.foundPairs.push(id1, id2);
        gameState.flippedCards = []; 
        if (!suppressMessage) {
            showMessage(`🎉 ペア成立！\n${card1.displayName} と ${card2.displayName}`);
        }
    } else {
        if (!suppressMessage) {
            showMessage(`😢 残念、ハズレ！\n${card1.displayName} と ${card2.displayName}`);
        }
    }
    saveState();
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';
    deck.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card';
        const isOpen = gameState.foundPairs.includes(card.id) || gameState.flippedCards.includes(card.id);
        const isMatched = gameState.foundPairs.includes(card.id);
        if (isOpen) {
            div.classList.add('open', card.color);
            div.textContent = card.displayName;
        }
        if (isMatched) div.classList.add('matched');
        grid.appendChild(div);
    });

    // 全制覇判定：デッキが存在し、かつ全カードが獲得済みの場合のみ
    const isAllCleared = deck.length > 0 && gameState.foundPairs.length === deck.length;
    
    if (isAllCleared) {
        document.getElementById('status-text').textContent = "🎊 全制覇！おめでとう！ 🎊";
        openModal('mission_with_result', {
            result: "🎊 全制覇！おめでとう！ 🎊",
            mission: "最後の指令：<br>深呼吸して、自分に拍手！👏"
        });
    }
}

const toggleBtn = document.getElementById('toggle-msg-btn');
toggleBtn.addEventListener('click', () => {
    isMessageEnabled = !isMessageEnabled;
    localStorage.setItem('msgSetting', isMessageEnabled);
    updateToggleButton();
});

function updateToggleButton() {
    toggleBtn.textContent = isMessageEnabled ? "💬 ダイアログ表示: ON" : "💬 ダイアログ表示: OFF";
    toggleBtn.style.background = isMessageEnabled ? "#6a8dbd" : "#6c757d";
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("リセットしますか？")) {
        resetGameState();
        initGame();
        showMessage("リセットしました");
    }
});

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) gameState = JSON.parse(saved);
}

// ページ読み込み時の処理
window.onload = () => {
    initGame();
    playTitleAnimation(); // アニメーション開始
};