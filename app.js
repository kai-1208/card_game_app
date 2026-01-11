// --- カード定義などは変更なし ---
const suits = [
    { mark: '♠', color: 'black', name: 'spade' },
    { mark: '♣', color: 'black', name: 'club' },
    { mark: '♥', color: 'red', name: 'heart' },
    { mark: '♦', color: 'red', name: 'diamond' }
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
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

let gameState = {
    foundPairs: [],
    flippedCards: []
};

const STORAGE_KEY = 'walkingTrumpGame_52';
let html5QrCode; 

// ★追加: ダイアログを表示するかどうかの設定
let isMessageEnabled = true; 

function init() {
    loadState();
    
    // 設定読み込み（オプション）
    const savedSetting = localStorage.getItem('msgSetting');
    if (savedSetting !== null) {
        isMessageEnabled = (savedSetting === 'true');
    }
    updateToggleButton();

    const urlParams = new URLSearchParams(window.location.search);
    const scannedId = urlParams.get('id');
    if (scannedId !== null) {
        handleScan(parseInt(scannedId));
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    renderGrid();
}

// --- ダイアログ表示機能（Alertの代わり） ---
// メッセージを表示し、2.5秒後に自動で消す
function showMessage(text) {
    // 設定がOFFなら何もしない
    if (!isMessageEnabled) return;

    const overlay = document.getElementById('custom-dialog');
    const content = document.getElementById('dialog-content');
    
    content.textContent = text;
    overlay.classList.add('show');

    // 2.5秒後に消す
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 2500);
}

// --- ボタン切替機能 ---
const toggleBtn = document.getElementById('toggle-msg-btn');
toggleBtn.addEventListener('click', () => {
    isMessageEnabled = !isMessageEnabled; // 反転
    localStorage.setItem('msgSetting', isMessageEnabled); // 保存
    updateToggleButton();
});

function updateToggleButton() {
    toggleBtn.textContent = isMessageEnabled ? "💬 表示: ON" : "💬 表示: OFF";
    toggleBtn.style.background = isMessageEnabled ? "#17a2b8" : "#6c757d";
}

// --- スキャナー処理（変更なし） ---
document.getElementById('scan-btn').addEventListener('click', startScanner);
document.getElementById('close-scan-btn').addEventListener('click', stopScanner);

function startScanner() {
    const container = document.getElementById('reader-container');
    container.style.display = 'block';
    document.getElementById('close-scan-btn').style.display = 'inline-block';

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        showMessage("カメラ起動エラー: " + err); // alert変更
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader-container').style.display = 'none';
            html5QrCode.clear();
        }).catch(err => console.error(err));
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
            showMessage("無効なQRコードです"); // alert変更
        }
    } catch (e) {
        showMessage("読み取りエラー"); // alert変更
    }
}

// --- ゲームロジック ---

function handleScan(index) {
    if (index < 0 || index >= deck.length) {
        showMessage("無効なカードIDです"); // alert変更
        return;
    }
    
    if (gameState.foundPairs.includes(index)) {
        showMessage(`【${deck[index].displayName}】\n獲得済みです`); // alert変更
        return;
    }

    // 2枚溜まっていたらリセット（前回の修正適用済み）
    if (gameState.flippedCards.length === 2) {
        gameState.flippedCards = [];
        renderGrid();
    }

    if (gameState.flippedCards.includes(index)) {
        showMessage(`【${deck[index].displayName}】\n既にめくっています`); // alert変更
        return;
    }

    gameState.flippedCards.push(index);
    saveState();
    renderGrid();

    // ステータス更新
    const card = deck[index];
    document.getElementById('status-text').textContent = `出たカード: ${card.displayName}`;
    
    // 判定
    if (gameState.flippedCards.length === 2) {
        // 少し待ってから判定（カードが開くアニメーションを見せるため）
        setTimeout(checkMatch, 500);
    } else {
        // 1枚目のときは少し短めにメッセージ
        showMessage(`1枚目: ${card.displayName}\n次のカードを探してください！`); 
    }
}

function checkMatch() {
    const [id1, id2] = gameState.flippedCards;
    const card1 = deck[id1];
    const card2 = deck[id2];

    const isMatch = (card1.rank === card2.rank);

    if (isMatch) {
        gameState.foundPairs.push(id1, id2);
        gameState.flippedCards = []; 
        showMessage(`🎉 ペア成立！\n${card1.displayName} と ${card2.displayName}`); // alert変更
    } else {
        showMessage(`😢 残念、ハズレ！\n${card1.displayName} と ${card2.displayName}`); // alert変更
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
            div.classList.add('open');
            div.classList.add(card.color);
            div.textContent = card.displayName;
        }

        if (isMatched) {
            div.classList.add('matched');
        }

        grid.appendChild(div);
    });

    if (gameState.foundPairs.length === deck.length) {
        document.getElementById('status-text').textContent = "🎊 全制覇！おめでとう！ 🎊";
        showMessage("🎊 全制覇！おめでとうございます！ 🎊"); // alert変更
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        gameState = JSON.parse(saved);
    }
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("リセットしますか？")) {
        localStorage.removeItem(STORAGE_KEY);
        gameState = { foundPairs: [], flippedCards: [] };
        renderGrid();
        showMessage("リセットしました"); // alert変更
    }
});

init();