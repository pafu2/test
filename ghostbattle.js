// ==UserScript==
// @name         ゴーストバトル
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  ぱふぱふへ自動挑戦
// @match        https://donguri.5ch.io/duels
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let battleCount = 0;
    let running = false;
    let isRunning = false;

    function sleep(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // カウンター表示
    const counter = document.createElement("div");
    counter.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 99999;
        background: #000;
        color: #fff;
        padding: 10px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
    `;
    counter.textContent = "対戦数: 0 【停止中】";
    document.body.appendChild(counter);

    // 開始ボタン
    const startBtn = document.createElement("button");
    startBtn.textContent = "開始";
    startBtn.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        z-index: 99999;
        padding: 8px 16px;
        background: #4caf50;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    `;
    document.body.appendChild(startBtn);

    // 停止ボタン
    const stopBtn = document.createElement("button");
    stopBtn.textContent = "停止";
    stopBtn.style.cssText = `
        position: fixed;
        top: 100px;
        right: 10px;
        z-index: 99999;
        padding: 8px 16px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    `;
    document.body.appendChild(stopBtn);

    function updateCounter() {
        counter.textContent =
            `対戦数: ${battleCount} ${running ? "【稼働中】" : "【停止中】"}`;
    }

    function findPafuButton() {

        const names = document.querySelectorAll(".player-name");

        for (const name of names) {

            if (name.textContent.trim() === "ぱふぱふ") {

                const card = name.closest(".bg-white.rounded-2xl");

                if (!card) continue;

                const btn = card.querySelector(".btn-submit-challenge");

                if (btn) {
                    return btn;
                }
            }
        }

        return null;
    }

    async function waitForModal() {

        while (running) {

            const closeBtn =
                document.querySelector("#duel-modal-close");

            if (closeBtn && closeBtn.offsetParent !== null) {
                return closeBtn;
            }

            await sleep(100);
        }

        return null;
    }

    async function main() {

        while (running) {

            try {

                const challengeBtn = findPafuButton();

                if (!challengeBtn) {

                    console.log("ぱふぱふが見つかりません");

                    await sleep(3000);

                    continue;
                }

                challengeBtn.click();

                const closeBtn = await waitForModal();

                if (!closeBtn) {
                    break;
                }

                battleCount++;
                updateCounter();

                await sleep(300);

                closeBtn.click();

                await sleep(500);

            } catch (e) {

                console.error(e);

                await sleep(3000);
            }
        }

        running = false;
        isRunning = false;

        updateCounter();

        console.log("自動対戦停止");
    }

    startBtn.onclick = () => {

        if (isRunning) return;

        running = true;
        isRunning = true;

        updateCounter();

        console.log("自動対戦開始");

        main();
    };

    stopBtn.onclick = () => {

        running = false;

        updateCounter();

        console.log("停止要求");
    };

})();