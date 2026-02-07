// bgm.js
// ブラウザのどこからでも呼べるように window に登録します
window.playBgm = function() {
    // すでに再生中、または作成済みの場合は何もしない
    if (window.globalBgm) return;

    console.log("BGM再生を準備中...");
    
    // ファイル名を bgm.mp3 に変更したものを読み込む
    const bgm = new Audio('bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.5;

    bgm.play().then(() => {
        console.log("BGM再生成功!");
        // 二重再生防止のために保存
        window.globalBgm = bgm;
    }).catch(error => {
        console.error("BGM再生失敗:", error);
    });
};