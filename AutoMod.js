// ==UserScript==
// @name         Auto Mod
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自動MOD
// @match        https://donguri.5ch.io/modify/weapon/view/*
// @match        https://donguri.5ch.io/modify/armor/view/*
// @grant        none
// ==/UserScript==

(function() {
'use strict';

const WAIT_TIME = 1100;

const isWeapon = location.href.includes("/modify/weapon/");
const isArmor = location.href.includes("/modify/armor/");
const container = document.createElement('div');

const style = document.createElement('style');
style.innerHTML = `
button.up {
    background-color: #1565c0;
    color: white;
    border: 1px solid #1565c0;
    cursor: pointer;
}
button.up:hover {
    background-color: #4398ed;
    border: 1px solid #1565c0;
}
button.down {
    background-color: #c0152c;
    color: white;
    border: 1px solid #c0152c;
    cursor: pointer;
}
button.down:hover {
    background-color: #e73e53;
    border: 1px solid #c0152c;
}
button.stop {
    background-color:#ae0000;
    color: white;
    border:1px solid #ae0000;
    cursor: pointer;
}
button.stop:hover {
    background-color: #e04242;
    border: 1px solid #ae0000;
}
`;
document.head.appendChild(style);

let buttons = "";

if (isWeapon) {
buttons = `
<button id="ui_weapon_maxup" class="up" style="width:100%;margin-bottom:4px;">DMG最大値↑</button>
<button id="ui_weapon_minup" class="up" style="width:100%;margin-bottom:4px;">DMG最小値↑</button>
<button id="ui_weapon_spdup" class="up" style="width:100%;margin-bottom:4px;">SPD↑</button>
<button id="ui_weapon_critup" class="up" style="width:100%;margin-bottom:4px;">CRIT↑</button>

<button id="ui_weapon_maxdown" class="down" style="width:100%;margin-bottom:4px;">DMG最大値↓</button>
<button id="ui_weapon_mindown" class="down" style="width:100%;margin-bottom:4px;">DMG最小値↓</button>
<button id="ui_weapon_spddown" class="down" style="width:100%;margin-bottom:4px;">SPD↓</button>
<button id="ui_weapon_critdown" class="down" style="width:100%;margin-bottom:4px;">CRIT↓</button>
`;
}

if (isArmor) {
buttons = `
<button id="ui_armor_defmaxup" class="up" style="width:100%;margin-bottom:4px;">DEF最大値↑</button>
<button id="ui_armor_defminup" class="up" style="width:100%;margin-bottom:4px;">DEF最小値↑</button>
<button id="ui_armor_wtup" class="up" style="width:100%;margin-bottom:4px;">WT↑</button>
<button id="ui_armor_critup" class="up" style="width:100%;margin-bottom:4px;">CRIT↑</button>

<button id="ui_armor_defmaxdown" class="down" style="width:100%;margin-bottom:4px;">DEF最大値↓</button>
<button id="ui_armor_defmindown" class="down" style="width:100%;margin-bottom:4px;">DEF最小値↓</button>
<button id="ui_armor_wtdown" class="down" style="width:100%;margin-bottom:4px;">WT↓</button>
<button id="ui_armor_critdown" class="down" style="width:100%;margin-bottom:4px;">CRIT↓</button>
`;
}

container.style =
"position:fixed;top:10px;left:10px;z-index:9999;background:#fff;border:2px solid #c0c0c0;padding:10px;border-radius:8px;width:200px;box-shadow:0 2px 10px rgba(0,0,0,0.3);font-size:12px;color:black;";
container.innerHTML = `
<div style="font-weight:bold;border-bottom:1px solid #ccc;margin-bottom:8px;">自動MOD</div>

回数:
<input type="number" id="ui_count" value="1" min="1" max="999" style="width:60px; padding:2px; font-size:14px;"><br><br>

${buttons}

<button id="ui_stop" class="stop" style="width:100%;margin-top:8px;display:none;">
停止
</button>

<div id="ui_status" style="color:blue;margin-top:8px;font-size:11px;font-weight:bold;">
待機中
</div>
`;
document.body.appendChild(container);

const status = document.getElementById('ui_status');
const stopBtn = document.getElementById('ui_stop');
let isRunning = false;

const stop = (msg)=>{
    isRunning=false;
    stopBtn.style.display='none';
    status.innerText=msg;
};
stopBtn.onclick=()=>stop("手動停止しました");
const sleep=()=>new Promise(r=>setTimeout(r,WAIT_TIME));

const weaponPaths={
MAX_UP:'/dmghigh/',
MIN_UP:'/dmglow/',
SPD_UP:'/speed/',
CRIT_UP:'/critical/',
MAX_DOWN:'/dmghighdown/',
MIN_DOWN:'/dmglowdown/',
SPD_DOWN:'/speeddown/',
CRIT_DOWN:'/criticaldown/'
};

const armorPaths={
MAX_UP:'/defhigh/',
MIN_UP:'/deflow/',
WT_UP:'/weight/',
CRIT_UP:'/critical/',
MAX_DOWN:'/defhighdown/',
MIN_DOWN:'/deflowdown/',
WT_DOWN:'/weightdown/',
CRIT_DOWN:'/criticaldown/'
};

async function startLoop(path){
    if(isRunning) return;
    let count=parseInt(document.getElementById("ui_count").value);
    if(!count || count<=0) return;
    isRunning=true;
    stopBtn.style.display='block';

    const form=document.querySelector(`form[action*="${path}"]`);
    if(!form){ stop("ボタンが見つかりません"); return;}

    for(let i=1;i<=count;i++){
        if(!isRunning) break;
        status.innerText=`実行中 ${i}/${count}`;
        await fetch(form.action,{
            method:'POST',
            body:new FormData(form)
        });
        if(i<count) await sleep();
    }

    stop("完了");
    setTimeout(()=>location.reload(),800);
}

// ==== イベント登録 ====
if(isWeapon){
document.getElementById("ui_weapon_maxup").onclick=()=>startLoop(weaponPaths.MAX_UP);
document.getElementById("ui_weapon_minup").onclick=()=>startLoop(weaponPaths.MIN_UP);
document.getElementById("ui_weapon_spdup").onclick=()=>startLoop(weaponPaths.SPD_UP);
document.getElementById("ui_weapon_critup").onclick=()=>startLoop(weaponPaths.CRIT_UP);
document.getElementById("ui_weapon_maxdown").onclick=()=>startLoop(weaponPaths.MAX_DOWN);
document.getElementById("ui_weapon_mindown").onclick=()=>startLoop(weaponPaths.MIN_DOWN);
document.getElementById("ui_weapon_spddown").onclick=()=>startLoop(weaponPaths.SPD_DOWN);
document.getElementById("ui_weapon_critdown").onclick=()=>startLoop(weaponPaths.CRIT_DOWN);
}

if(isArmor){
document.getElementById("ui_armor_defmaxup").onclick=()=>startLoop(armorPaths.MAX_UP);
document.getElementById("ui_armor_defminup").onclick=()=>startLoop(armorPaths.MIN_UP);
document.getElementById("ui_armor_wtup").onclick=()=>startLoop(armorPaths.WT_UP);
document.getElementById("ui_armor_critup").onclick=()=>startLoop(armorPaths.CRIT_UP);
document.getElementById("ui_armor_defmaxdown").onclick=()=>startLoop(armorPaths.MAX_DOWN);
document.getElementById("ui_armor_defmindown").onclick=()=>startLoop(armorPaths.MIN_DOWN);
document.getElementById("ui_armor_wtdown").onclick=()=>startLoop(armorPaths.WT_DOWN);
document.getElementById("ui_armor_critdown").onclick=()=>startLoop(armorPaths.CRIT_DOWN);
}

})();