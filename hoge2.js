  let autoJoinIntervalId;
  let isAutoJoinRunning = false;
  const sleep = s => new Promise(r=>setTimeout(r,s));
  async function autoJoin() {
    const dialog = document.querySelector('.auto-join');

    const logArea = dialog.querySelector('.auto-join-log');
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const teamColor = settings.teamColor;
    const teamName = settings.teamName;

    function logMessage(region, message, next) {
      const date = new Date();
      const ymd = date.toLocaleDateString('sv-SE').slice(2);
      const time = date.toLocaleTimeString('sv-SE');
      const timestamp = document.createElement('div');
      timestamp.innerText = `${ymd}\n${time}`;
      timestamp.style.fontSize = '90%';
      timestamp.style.color = '#666';
      timestamp.style.borderRight = 'solid 0.5px #888';
      timestamp.style.whiteSpace = 'nowrap';

      const regionDiv = document.createElement('div');
      const progress = `${currentPeriod}期 ${currentProgress}%`;
      if (region) regionDiv.innerText = `${progress}\nchallenge: ${region}\n${next}`;
      else regionDiv.innerText = next;
      regionDiv.style.fontSize = '90%';
      regionDiv.style.color = '#444';
      regionDiv.style.borderRight = 'dotted 0.5px #888';
      regionDiv.style.whiteSpace = 'nowrap';

      const messageDiv = document.createElement('div');
      messageDiv.textContent = message;

      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.gap = '4px';
      div.style.alignItems = 'center';
      div.style.marginBottom = '-0.5px';
      div.style.marginTop = '-0.5px';
      div.style.border = 'solid 0.5px #888';

      div.append(timestamp, regionDiv, messageDiv);
      logArea.prepend(div);
    }

    const messageTypes = {
      capitalAttack: [
        '再建が必要です。'
      ],
      reinforceAttack: [
        '防御設備を破壊しました。'
      ],
      retry: [
        'あなたのチームは動きを使い果たしました。しばらくお待ちください。',
        'ng<>too fast'
      ],
      reset: [
        'このタイルは攻撃できません。範囲外です。'
      ],
      quit: [
        '最初にチームに参加する必要があります。',
        'どんぐりが見つかりませんでした。',
        'あなたのどんぐりが理解できませんでした。',
        'レベルが低すぎます。'
      ],
      equipError: [
        '武器と防具を装備しなければなりません。',
        '装備している防具と武器が力不足です。',
        '装備している防具と武器が強すぎます',
        '装備しているものは改造が多すぎます。改造の少ない他のものをお試しください',
        '参加するには、装備中の武器と防具のアイテムID'
      ],
      nonAdjacent: [
        'このタイルは攻撃できません。あなたのチームが首都を持つまで、どの首都にも隣接するタイルを主張することはできません。',
        'あなたのチームは首都を持っていないため、他のチームの首都に攻撃できません。'
      ],
      teamAdjacent: [
        'このタイルは攻撃できません。あなたのチームの制御領土に隣接していなければなりません。',
        'このタイルは攻撃できません。首都を奪取するには、隣接タイルを少なくとも3つ支配している必要があります。',
        'このタイルは攻撃できません。首都を奪取するには、隣接タイルを少なくとも2つ支配している必要があります。',
        'このタイルは攻撃できません。首都を奪取するには、隣接タイルを少なくとも1つ支配している必要があります。',
        'このタイルは攻撃できません。自分の首都は攻撃できません。',
        'この首都は攻撃できません。相手の総タイル数の少なくとも'
      ],
      capitalAdjacent: [
        'このタイルは攻撃できません。混雑したマップでは、初期主張は正確に1つの首都に隣接していなければなりません。'
      ],
      mapEdge: [
        'このタイルは攻撃できません。混雑したマップでは、初期主張はマップの端でなければなりません。'
      ]
    }

    function getMessageType (text) {
      const result = Object.keys(messageTypes)
        .find(key => messageTypes[key]
          .some(v => text.includes(v))
        )
      return result;
    }


    let nextProgress;
    async function attackRegion () {
      await drawProgressBar();
      if (isAutoJoinRunning || Math.abs(nextProgress - currentProgress) >= 2) {
        return;
      }
      let regions = await getRegions();
      const excludeSet = new Set();
      let loop = 0;

      let cellType;
      if (regions.nonAdjacent.length > 0) {
        cellType = 'nonAdjacent';
      } else if (regions.teamAdjacent.length > 0) {
        cellType = 'teamAdjacent';
      } else if (regions.capitalAdjacent.length > 0) {
        cellType = 'capitalAdjacent';
      } else {
        cellType = 'mapEdge';
      }


     while (dialog.open) {
       let success = false;
       isAutoJoinRunning = true;

       regions[cellType] = regions[cellType].filter(e => !excludeSet.has(e.join(',')));

       for (let i = 0; i < regions[cellType].length;) {
         const region = regions[cellType][i];
         let errorCount = 0;
         let next;

         try {
           const [cellRank, equipChangeStat] = await equipChange(region);
           if (equipChangeStat === 'noEquip') {
             excludeSet.add(region.join(','));
             i++;
             continue;
           }

           const [text, lastLine] = await challenge(region);
           const messageType = getMessageType(lastLine);
           let message = lastLine;
           let processType;
           let sleepTime = 3.0;

            if (messageType === 'capitalAttack') {
                if (loop < 9){
                  loop += 1;
                  sleepTime = 1.5;
                  message = '(' + loop + '発目)［陥落］'+ lastLine;
                  processType = 'continue';
                } else {
                  success = true;
                  loop += 1;
                  message = '(' + loop + '発目)［陥落］【打止】'+ lastLine;
                  processType = 'return';
                  i++;
                }
            } else if (messageType === 'reinforceAttack') {
              success = true;
              loop += 1;
              message = '(' + loop + '発目)［破壊］【成功】'+ lastLine;
              processType = 'return';
              i++;
//              if (loop < 9){
//                loop += 1;
//                sleepTime = 1.5;
//                message = '(' + loop + '発目)［破壊］'+ lastLine;
//                processType = 'continue';
//              } else {
//                success = true;
//                loop += 1;
//                message = '(' + loop + '発目)［破壊］【打止】'+ lastLine;
//                processType = 'return';
//                i++;
//              }
            } else if (text.startsWith('リーダーになった')) {
                if (loop < 9){
                  loop += 1;
                  message = '(' + loop + '発目) '+ lastLine;
                  processType = 'continue';
                } else {
                  success = true;
                  loop += 1;
                  message = '(' + loop + '発目)【打止】'+ lastLine;
                  processType = 'return';
                }
                i++;
            } else if (text.startsWith('アリーナチャレンジ開始')) {
                if (text.endsWith('アリーナチャレンジは失敗しました。')) {
                  success = true;
                  loop += 1;
                  message = '(' + loop + '発目)【失敗】'+ lastLine;
                  processType = 'return';
                } else {
                  success = true;
                  loop += 1;
                  message = '(' + loop + '発目)【成功】'+ lastLine;
                  processType = 'return';
                }
                i++;
            } else if (messageType === 'retry') {
              sleepTime = 10.1;
              message = lastLine;
              processType = 'continue';
              i++;
            } else if (messageType === 'equipError'){
                if (loop < 9){
                  loop += 1;
                  sleepTime = 5.1;
                  message = '(' + loop + '発目) '+ lastLine + ` (${cellRank}, ${currentEquipName})`;
                  processType = 'continue';
                } else {
                  success = true;
                  loop += 1;
                  message = '(' + loop + '発目)【打止】'+ lastLine;
                  processType = 'return';
                }
                i++;
            } else if (lastLine.length > 100) {
              message = 'どんぐりシステム';
              processType = 'continue';
              i++;
            } else if (messageType === 'quit') {
              message = '[停止] ' + lastLine;
              processType = 'return';
              clearInterval(autoJoinIntervalId);
              i++;
            } else if (messageType === 'reset') {
              processType = 'break';
              i++;
            } else if (messageType in regions) {
              excludeSet.add(region.join(','));
              if (messageType === cellType) {
                loop += 1;
                message = '(' + loop + '発目) '+ lastLine;
                processType = 'continue';
              } else if (messageType === 'nonAdjacent') {
                cellType = 'nonAdjacent';
                loop += 1;
                message = '(' + loop + '発目) '+ lastLine;
                processType = 'break';
              } else if (messageType === 'teamAdjacent') {
                cellType = 'teamAdjacent';
                loop += 1;
                message = '(' + loop + '発目) '+ lastLine;
                processType = 'break';
              } else if (messageType === 'capitalAdjacent') {
                cellType = 'capitalAdjacent';
                loop += 1;
                message = '(' + loop + '発目) '+ lastLine;
                processType = 'break';
              } else if (messageType === 'mapEdge') {
                cellType = 'mapEdge';
                loop += 1;
                message = '(' + loop + '発目) '+ lastLine;
                processType = 'break';
              }
              i++;
            }
            if (success) {
              if (currentProgress < 15) {
                nextProgress = 20;
               } else if (currentProgress < 25) {
                nextProgress = 30;
               } else if (currentProgress < 35) {
                nextProgress = 40;
               } else if (currentProgress < 50) {
                nextProgress = 60;
               } else if (currentProgress < 65) {
                nextProgress = 70;
               } else if (currentProgress < 75) {
                nextProgress = 80;
               } else if (currentProgress < 85) {
                nextProgress = 90;
               } else {
                nextProgress = 10;
               }
              next = `→ ${nextProgress}±2%`;
              isAutoJoinRunning = false;
              processType = 'return';
            } else if (processType === 'return') {
              next = '';
              isAutoJoinRunning = false;
            } else {
              next = `→ ${sleepTime}s`;
            }

            logMessage(region, message, next);
            await sleep(sleepTime * 1000);

            if (processType === 'break') {
              regions = await getRegions();
              break;
            } else if (processType === 'return') {
              return;
            } else if (processType === 'reload') {
              regions = await getRegions();
              break;
            }
          } catch (e){
            let message = '';
            switch (e) {
              case 403:
                message = `[403] Forbidden`;
                break;
              case 404:
                message = `[404] Not Found`;
                break;
              case 500:
                message = `[500] Internal Server Error`;
                break;
              case 502:
                message = `[502] Bad Gateway`;
                break;
              default:
                message = e;
                break;
            }
            if (e.message === '再ログインしてください') {
              logMessage(region, '[停止] どんぐりが見つかりませんでした', '');
              isAutoJoinRunning = false;
              clearInterval(autoJoinIntervalId);
              return;
            } else if (e === 403) {
              logMessage(region, message, '');
              isAutoJoinRunning = false;
              clearInterval(autoJoinIntervalId);
              return;
            } else if ([404,500,502].includes(e)) {
              errorCount++;
              let sleepTime = 20 * errorCount;
              if(sleepTime > 600) sleepTime = 600;
              logMessage(region, message, `→ ${sleepTime}s`);
              await sleep(sleepTime * 1000);
            } else {
              let sleepTime = 20;
              logMessage(region, e, `→ ${sleepTime}s`);
              await sleep(sleepTime * 1000);
            }
            i++;
          }
        }
        if (!success && regions[cellType].length === 0) {
              if (currentProgress < 15) {
                nextProgress = 20;
               } else if (currentProgress < 25) {
                nextProgress = 30;
               } else if (currentProgress < 35) {
                nextProgress = 40;
               } else if (currentProgress < 50) {
                nextProgress = 60;
               } else if (currentProgress < 65) {
                nextProgress = 70;
               } else if (currentProgress < 75) {
                nextProgress = 80;
               } else if (currentProgress < 85) {
                nextProgress = 90;
               } else {
                nextProgress = 10;
               }
          const next = `→ ${nextProgress}±2%`;
          isAutoJoinRunning = false;
          logMessage(null, '攻撃可能なタイルが見つかりませんでした。', next);
          return;
        }
      }
    }

    async function getRegions () {
      try {
        const res = await fetch('');
        if (!res.ok) throw new Error(`[${res.status}] /teambattle`);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const h1 = doc?.querySelector('h1')?.textContent;
        if (h1 !== 'どんぐりチーム戦い') throw new Error('title.ng info');

        const scriptContent = doc.querySelector('.grid > script')?.textContent || '';
        const cellColorsMatch = scriptContent.match(/const cellColors = ({.+?})/s);
        let cellColors = {};
        if (cellColorsMatch) {
          const validJsonStr = cellColorsMatch[1]
            .replace(/'/g, '"')
            .replace(/,\s*}/, '}');
          try {
            cellColors = JSON.parse(validJsonStr);
          } catch (e) {
            console.error('cellColors JSON parse error:', e);
            cellColors = {};
          }
        }

        const capitalMapMatch = scriptContent.match(/const capitalMap = (\[\[.+?\]\])/s);
        let capitalMap = [];
        if (capitalMapMatch) {
          try {
            capitalMap = JSON.parse(capitalMapMatch[1]);
          } catch (e) {
            console.error('capitalMap JSON parse error:', e);
            capitalMap = [];
          }
        }

        const grid = doc.querySelector('.grid');
        const rows = Number(grid.style.gridTemplateRows.match(/repeat\((\d+), 35px\)/)[1]) -1;
        const cols = Number(grid.style.gridTemplateColumns.match(/repeat\((\d+), 35px\)/)[1]) -1;

        const cells = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            cells.push([r, c]);
          }
        }

        const directions = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        ];

        const adjacentSet = new Set();
        for (const [cr, cc] of capitalMap) {
          for (const [dr, dc] of directions) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              adjacentSet.add(`${nr}-${nc}`);
            }
          }
        }

        const capitalSet = new Set(capitalMap.map(([r, c]) => `${r}-${c}`));

        const nonAdjacentCells = cells.filter(([r, c]) => {
          const key = `${r}-${c}`;
          return !capitalSet.has(key) && !adjacentSet.has(key);
        });

        const capitalAdjacentCells = cells.filter(([r, c]) => {
          const key = `${r}-${c}`;
          return adjacentSet.has(key);
        });

        const teamColorSet = new Set();
        for (const [key, value] of Object.entries(cellColors)) {
          if (teamColor === value.replace('#', '')) {
            teamColorSet.add(key);
          }
        }

        const teamAdjacentSet = new Set();
        for (const key of [...teamColorSet]) {
          const [tr, tc] = key.split('-');
          for (const [dr, dc] of directions) {
            const nr = Number(tr) + dr;
            const nc = Number(tc) + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              teamAdjacentSet.add(`${nr}-${nc}`);
            }
          }
        }

        const teamAdjacentCells = cells.filter(([r, c]) => {
          const key = `${r}-${c}`;
          return teamColorSet.has(key) || teamAdjacentSet.has(key);
        })

        const mapEdgeSet = new Set();
        for (let i=0; i<rows; i++) {
          mapEdgeSet.add(`${i}-0`);
          mapEdgeSet.add(`${i}-${cols}`);
        }
        for (let i=0; i<cols; i++) {
          mapEdgeSet.add(`0-${i}`);
          mapEdgeSet.add(`${rows}-${i}`);
        }

        const mapEdgeCells = cells.filter(([r, c]) => {
          const key = `${r}-${c}`;
          return mapEdgeSet.has(key) && !capitalSet.has(key);
        })

        function shuffle(arr) {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        }

        const regions = {
          nonAdjacent: shuffle(nonAdjacentCells),
          capitalAdjacent: shuffle(capitalAdjacentCells),
          teamAdjacent: shuffle(teamAdjacentCells),
          mapEdge: shuffle(mapEdgeCells)
        };

        return regions;

      } catch (e) {
        console.error(e);
        return {
          nonAdjacent: [],
          capitalAdjacent: [],
          teamAdjacent: [],
          mapEdge: []
        };
      }
    }

    async function challenge (region) {
      const [ row, col ] = region;
      const body = `row=${row}&col=${col}`;
      try {
        const res = await fetch('/teamchallenge?'+MODEQ, {
          method: 'POST',
          body: body,
          headers: headers
        })

        if(!res.ok) throw new Error(res.status);
        const text = await res.text();
        const lastLine = text.trim().split('\n').pop();
        return [ text, lastLine ];
      } catch (e) {
        console.error(e);
        throw e;
      }

    }
    async function equipChange (region) {
      const [ row, col ] = region;
      const url = `https://donguri.5ch.net/teambattle?r=${row}&c=${col}&`+MODEQ;
      try {
        const res = await fetch(url);
        if(!res.ok) throw new Error(`[${res.status}] /teambattle?r=${row}&c=${col}}`);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text,'text/html');
        const h1 = doc?.querySelector('h1')?.textContent;
        if(h1 !== 'どんぐりチーム戦い') return Promise.reject(`title.ng`);
        const table = doc.querySelector('table');
        if(!table) throw new Error('table.ng');
        const equipCond = table.querySelector('td small').textContent;
        const rank = equipCond
          .replace('エリート','e')
          .replace(/.+から|\w+-|まで|だけ|\s|\[|\]|\|/g,'');
        const autoEquipItems = JSON.parse(localStorage.getItem('autoEquipItems')) || {};
        const autoEquipItemsAutojoin = JSON.parse(localStorage.getItem('autoEquipItemsAutojoin')) || {};

        if (autoEquipItemsAutojoin[rank]?.length > 0) {
          const index = Math.floor(Math.random() * autoEquipItemsAutojoin[rank].length);
          await setPresetItems(autoEquipItemsAutojoin[rank][index]);
          return [rank, 'success'];
        } else if (autoEquipItems[rank]?.length > 0) {
          const index = Math.floor(Math.random() * autoEquipItems[rank].length);
          await setPresetItems(autoEquipItems[rank][index]);
          return [rank, 'success'];
        } else {
          return [rank, 'noEquip'];
        }
      } catch (e) {
        console.error(e);
        throw e;
      }
    }

    if (!isAutoJoinRunning) {
      attackRegion();
    }
    autoJoinIntervalId = setInterval(attackRegion,60000);
  };

  async function drawProgressBar(){
    try {
      const res = await fetch('https://donguri.5ch.net/');
      if (!res.ok) throw new Error(res.status);
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const container = doc.querySelector('div.stat-block:nth-child(2)>div:nth-child(5)').cloneNode(true);
      currentPeriod = Number(container.firstChild.textContent.match(/\d+/)[0]);
      currentProgress = parseInt(container.lastElementChild.textContent);
      let str,min,totalSec,sec,margin;

      if (currentProgress === 0 || currentProgress === 50) {
        str = '（マップ更新時）';
      } else {
        if (currentProgress === 100) {
          min = 0;
          sec = 20;
          margin = 10;
        } else {
          totalSec = (currentProgress < 50) ? (50 - currentProgress) * 36 : (100 - currentProgress) * 36 + 10;
          min = Math.trunc(totalSec / 60);
          sec = totalSec % 60;
          margin = 20;
        }
        str = '（マップ更新まで' + min + '分' + sec + '秒 \xb1' + margin + '秒）';
      }
      progressBarBody.textContent = currentProgress + '%';
      progressBarBody.style.width = currentProgress + '%';
      progressBarInfo.textContent = `${MODENAME} 第 ${currentPeriod} 期${str}`;

      const statBlock = doc.querySelector('.stat-block');
      wood = statBlock.textContent.match(/木材の数: (\d+)/)[1];
      steel = statBlock.textContent.match(/鉄の数: (\d+)/)[1];
    } catch (e) {
      console.error(e+' drawProgressBar()')
    }
  }

  drawProgressBar();
  function startAutoJoin() {
    clearInterval(progressBarIntervalId);
    progressBarIntervalId = null;
    autoJoin();
  }
  let progressBarIntervalId = setInterval(drawProgressBar, 18000);
  (()=>{ // autoJoinとprogressBarのinterval管理
    function stopAutoJoin() {
      if (autoJoinIntervalId) {
        clearInterval(autoJoinIntervalId);
        autoJoinIntervalId = null;
      }
      isAutoJoinRunning = false;
    }
    const dialog = document.querySelector('.auto-join');
    const observer = new MutationObserver(() => {
      if (!dialog.open) {
        stopAutoJoin();
        drawProgressBar();
        if (!progressBarIntervalId) {
          progressBarIntervalId = setInterval(drawProgressBar, 18000);
        }
      }
    });

    observer.observe(dialog, {
      attributes: true,
      attributeFilter: ['open']
    });
  })();
})();
