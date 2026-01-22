/* =========================================
   UI/画面遷移ロジック
   ========================================= */

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

// タイトル -> メニュー
function showMenu() {
    document.getElementById('bg-img').classList.add('bg-dimmed');
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

// ゲーム画面 -> タイトル（戻るボタン）
function backToTitle() {
    stopScanner(); // カメラ停止
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('bg-img').classList.remove('bg-dimmed');
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
        body.innerHTML = "<p style='text-align:left;'>1. 部屋に設置したQRコードまで移動しよう。<br>2. 「スキャン」ボタンでQRを読み取る。<br>3. トランプが表示されるよ。<br>4. 同じ数字を見つけてペアを作ろう！</p>";
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
    let idCounter = 0;
    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({
                id: idCounter++,
                suit: suit.mark,
                color: suit.color,
                rank: rank,
                displayName: `${suit.mark}${rank}`
            });
        });
    });

    loadState();
    
    const savedSetting = localStorage.getItem('msgSetting');
    if (savedSetting !== null) {
        isMessageEnabled = (savedSetting === 'true');
    }
    updateToggleButton();

    const urlParams = new URLSearchParams(window.location.search);
    const scannedId = urlParams.get('id');
    if (scannedId !== null) {
        showMenu(); 
        startGame();
        handleScan(parseInt(scannedId));
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    renderGrid();
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

function handleScan(index) {
    if (index < 0 || index >= deck.length) {
        showMessage("無効なカードIDです");
        return;
    }
    
    if (gameState.foundPairs.includes(index)) {
        showMessage(`【${deck[index].displayName}】\n獲得済みです`);
        return;
    }

    if (gameState.flippedCards.length === 2) {
        gameState.flippedCards = [];
        renderGrid();
    }

    if (gameState.flippedCards.includes(index)) {
        showMessage(`【${deck[index].displayName}】\n既にめくっています`);
        return;
    }

    gameState.flippedCards.push(index);
    saveState();
    renderGrid();

    const card = deck[index];
    let resultMessage = `出たカード: ${card.displayName}`;
    let isPairCheckNeeded = false;

    if (gameState.flippedCards.length === 2) {
        const [id1, id2] = gameState.flippedCards;
        const card1 = deck[id1];
        const card2 = deck[id2];
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
    
    if (isPairCheckNeeded) {
        setTimeout(() => checkMatch(isMissionTriggered), 500);
    }
}

function checkMatch(suppressMessage = false) {
    const [id1, id2] = gameState.flippedCards;
    const card1 = deck[id1];
    const card2 = deck[id2];
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

    if (gameState.foundPairs.length === deck.length && deck.length > 0) {
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
        localStorage.removeItem(STORAGE_KEY);
        gameState = { foundPairs: [], flippedCards: [] };
        renderGrid();
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