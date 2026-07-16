/*****************************************************************
 * boss1.js
 *
 * スコア5000点で出現する最初のボス「ガーディアン」。
 * 見た目は多段ASCIIアート（UFO/艦艇風）。
 *
 * 【重要】このファイルはメインゲームのIIFEの「外側」（グローバルスコープ）
 * で実行される。そのためプレイヤー座標や弾配列などゲーム内部の状態には
 * 直接アクセスできない。代わりに、メインファイルが公開している
 * window.Game 経由でのみ読み書きする。
 *
 *   Game.ctx                    canvasの2Dコンテキスト
 *   Game.playerX / Game.PLAYER_Y 自機の座標
 *   Game.V_WIDTH / Game.V_HEIGHT 画面サイズ（仮想解像度）
 *   Game.bullets                 自機弾の配列（読み取り・yの書き換えで消費可）
 *   Game.enemyBullets            敵弾の配列。pushするだけで既存の描画・
 *                                 自機との当たり判定にそのまま乗る
 *   Game.getPlayerHitboxRadius() 自機の当たり判定半径（現在のパワーレベル依存）
 *   Game.addScoreEffect(...)     画面に浮かび上がるスコア表示エフェクト
 *   Game.endBossFight(victory)   ボス戦終了（true=撃破、報酬スコア加算）
 *   Game.BGM                     効果音モジュール（BGM.playXxx()）
 *
 * 新しいボスを追加する時は、このファイルをコピーして
 *   1. registerBoss() の第一引数（id）を変える
 *   2. メインHTML側の BOSS_SCHEDULE に { score, id } を1行追加
 *   3. <script src="bossN.js"></script> をHTMLに1行追加
 * の3点を行うだけでよい。
 *****************************************************************/
registerBoss('boss1', {
    name: 'ガーディアン',
    maxHp: 40,          // 倒すのに必要な合計ダメージ
    rewardScore: 1000,  // 撃破時のボーナススコア

    // ボス戦開始時に1回だけ呼ばれる
    init() {
        this.x = Game.V_WIDTH / 2;
        this.y = 90;         // 多段ASCIIアートになったため、旧デザインより少し下げて全体が画面内に収まるようにする
        this.vx = 1.4;      // 左右移動速度
        this.shootTimer = 60;
        this.hitFlash = 0;  // 被弾時に一瞬白く光らせるためのカウンタ
    },

    // 毎フレーム呼ばれる（このthisはinit()と同じオブジェクト）
    update() {
        // --- 左右移動（画面端で跳ね返る） ---
        this.x += this.vx;
        if (this.x < 40) { this.x = 40; this.vx = Math.abs(this.vx); }
        if (this.x > Game.V_WIDTH - 40) { this.x = Game.V_WIDTH - 40; this.vx = -Math.abs(this.vx); }

        // --- 攻撃：既存の「敵弾」システムにそのまま乗せる ---
        // {x, y, speed} の形でpushするだけで、通常の雑魚敵の弾と同じように
        // 描画・移動・自機への当たり判定が処理される。
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shootTimer = 55;
            Game.enemyBullets.push({ x: this.x - 18, y: this.y + 60, speed: 2.6 });
            Game.enemyBullets.push({ x: this.x + 18, y: this.y + 60, speed: 2.6 });
        }

        // --- 自機弾との当たり判定 ---
        const bullets = Game.bullets;
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            if (b.y < -10) continue; // 既に消費済み／画面外
            if (Math.hypot(b.x - this.x, b.y - (this.y + 30)) < 34) {
                this.hp -= b.dmg;
                b.y = -9999; // 弾を消費（後段の掃除処理で自動的に配列から除去される）
                this.hitFlash = 6;

                if (this.hp <= 0) {
                    Game.addScoreEffect(this.x, this.y + 30, `+${this.rewardScore}`, '#ffe066', 14, 90);
                    Game.endBossFight(true); // 勝利：報酬スコア加算＋ファンファーレはメイン側が処理
                    return;
                }
            }
        }

        if (this.hitFlash > 0) this.hitFlash--;
    },

    // 毎フレーム、自機やアイテムより手前に描画される
    render(ctx) {
        // ユーザー指定デザイン：
        //  ▲　▲
        // ▼■●★●■▼
        //  Ｉ■■■Ｉ
        //    ■■
        //     ▼
        //     Ｉ
        // 各行は textAlign="center" で this.x を中心に描画するため、
        // 行ごとの前後の空白は無視して構わない（中央揃えが自動で効く）。
        const rows = ["▲　▲", "▼■●★●■▼", "Ｉ■■■Ｉ", "■■", "▼", "Ｉ"];
        const lineHeight = 26;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : "#ff2255";
        ctx.shadowColor = "#ff2255";
        ctx.shadowBlur = 12;
        ctx.font = "bold 28px Courier New";
        rows.forEach((line, i) => {
            ctx.fillText(line, this.x, this.y + i * lineHeight);
        });
        ctx.restore();

        // HPバー（画面上部中央）
        const barW = 160, barH = 8;
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        ctx.save();
        ctx.fillStyle = "#333";
        ctx.fillRect(Game.V_WIDTH / 2 - barW / 2, 10, barW, barH);
        ctx.fillStyle = "#ff2255";
        ctx.fillRect(Game.V_WIDTH / 2 - barW / 2, 10, barW * hpRatio, barH);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(Game.V_WIDTH / 2 - barW / 2, 10, barW, barH);
        ctx.restore();
    }
});