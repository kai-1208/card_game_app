// --- カードデータ生成などは前回と同じ ---
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
let html5QrCode; // スキャナーのインスタンス

// 初期化
function init() {
    loadState();
    
    // 通常のURLアクセス（QRを使わず直接URLを叩いた場合）も一応サポート
    const urlParams = new URLSearchParams(window.location.search);
    const scannedId = urlParams.get('id');
    if (scannedId !== null) {
        handleScan(parseInt(scannedId));
        // URLパラメータを消す
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    renderGrid();
}

// --- スキャナー関連の処理 ---

// スキャンボタン
document.getElementById('scan-btn').addEventListener('click', startScanner);
document.getElementById('close-scan-btn').addEventListener('click', stopScanner);

function startScanner() {
    const container = document.getElementById('reader-container');
    const closeBtn = document.getElementById('close-scan-btn');
    container.style.display = 'block';
    closeBtn.style.display = 'inline-block';

    html5QrCode = new Html5Qrcode("reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // 背面カメラ(environment)を使用
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        alert("カメラの起動に失敗しました。\nブラウザの権限設定を確認してください。");
        console.error(err);
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

// QR読み取り成功時のコールバック
function onScanSuccess(decodedText, decodedResult) {
    // 連続読み取りを防ぐため一旦ストップ
    stopScanner();

    // 読み取った内容はURL全体（例: https://.../?id=5）になっている
    // ここから「id=数字」の部分を取り出す
    try {
        let idVal = null;

        // URL形式かチェック
        if (decodedText.includes('?')) {
            const urlObj = new URL(decodedText);
            idVal = urlObj.searchParams.get('id');
        } 
        
        // もしURLじゃなくて数字だけ入っているQRコードなら直接解釈
        if (!idVal && !isNaN(decodedText)) {
            idVal = decodedText;
        }

        if (idVal !== null) {
            handleScan(parseInt(idVal));
        } else {
            alert("このQRコードはゲーム用ではありません");
        }

    } catch (e) {
        alert("読み取りエラー: " + e);
    }
}


// --- ゲームロジック ---

function handleScan(index) {
    if (index < 0 || index >= deck.length) {
        alert("無効なカードIDです");
        return;
    }
    if (gameState.foundPairs.includes(index)) {
        alert(`【${deck[index].displayName}】\nこのカードは既に獲得済みです！`);
        return;
    }
    if (gameState.flippedCards.includes(index)) {
        alert(`【${deck[index].displayName}】\nこのカードは既にめくっています`);
        return;
    }

    // 2枚めくり終わった後の3枚目ならリセット
    if (gameState.flippedCards.length === 2) {
        gameState.flippedCards = [];
    }

    gameState.flippedCards.push(index);
    saveState();
    renderGrid();

    // メッセージ表示
    const card = deck[index];
    document.getElementById('status-text').textContent = `出たカード: ${card.displayName}`;
    
    // 2枚目なら判定
    if (gameState.flippedCards.length === 2) {
        setTimeout(checkMatch, 500); // 少し待ってから判定
    } else {
        setTimeout(() => alert(`1枚目: ${card.displayName}\n次のカードを探してください！`), 100);
    }
}

function checkMatch() {
    const [id1, id2] = gameState.flippedCards;
    const card1 = deck[id1];
    const card2 = deck[id2];

    const isMatch = (card1.rank === card2.rank) && (card1.color === card2.color);

    if (isMatch) {
        gameState.foundPairs.push(id1, id2);
        gameState.flippedCards = []; // クリア
        alert(`🎉 ペア成立！\n${card1.displayName} と ${card2.displayName}`);
    } else {
        alert(`😢 残念、ハズレ！\n${card1.displayName} と ${card2.displayName}\n（次は1枚目からやり直しです）`);
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

// リセットボタン
document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("ゲームをリセットしますか？")) {
        localStorage.removeItem(STORAGE_KEY);
        gameState = { foundPairs: [], flippedCards: [] };
        renderGrid();
        document.getElementById('status-text').textContent = "リセットしました";
    }
});

init();