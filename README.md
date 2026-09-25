# StudyRPG 2.0 — 1.0 Architecture Refactor / Phase 1

這不是重新設計 StudyRPG。這一批以目前 GitHub `main/index.html` 的 1.0 產品架構為規格，先把最容易被補丁污染的 World / Visual / Status / Exam / Calendar / Tasks / Dungeon 拆出正式模組。

## 本批已完成
- 1.0 的 8 個主入口與狀態頁資訊架構保留。
- 21 週 `WEEKLY_WORLDS` 單一資料來源：週次 → 地區 → 背景 → 週一至週五怪物。
- Status / Dungeon 共用同一個當週 World，不再各自保存背景對照表。
- 週背景維持兩張圖無縫橫向捲動。
- Visual Config 保留 1.0 目前的 desktop / tablet / mobile、weekly GROUND fallback、foot-anchor 模型。
- Status 頁保留：日期時間、週次、地區、場景、Lv/戰力 HUD、EXP、金幣/抽獎幣/戰力、考前總能量、能力 Modal、學期冒險 Timeline。
- 考前總能量搬入獨立 `exam-energy.js`，保留 1.0 的 75% 固定分母、家長核定才充能、voluntaryChallenge 不計入、未指定科目平均分配等核心規則。
- 任務定義與任務紀錄分離；2.0 測試完成任務只寫 2.0 state。
- 若部署在與 1.0 相同 origin，會只讀 `heroRPG_FAMILY_V8` 作為 2.0 測試起始資料；不覆寫 1.0 存檔。

## 已從根本避免的 1.0 寫法
- 沒有 `const oldX = X; X = function(){ oldX(); ... }` wrapper chain。
- 沒有版本號函式名稱。
- 沒有第二份 `SEMESTER_WEEK_MAP`。
- 沒有靠 CSS `!important` 接管角色世界座標。
- `index.html` 只保留 App Shell，不放遊戲規則。
- World、Visual、Exam、Task 都有單一責任模組。

## 尚未搬入（下一批）
- 正式 BattleEngine / BattleState / BattleUI / BattleRenderer
- 職業正式資源、被動、技能、怪物 AI、召喚、狀態、FX Presentation
- 商店交易、抽獎交易、裝備、Inventory lifecycle/tombstone
- Firebase family/profile provider 與 realtime sync
- Online/Social provider
- 完整 GM 編輯器

目前 Dungeon 刻意不假裝已完成戰鬥引擎；只驗證 1.0 的 World → Background → Encounter → Visual 關係已經正確拆開。

## 測試
這是 ES Module 專案，請用 HTTP(S) 開啟，不要 `file://`。放到 GitHub Pages 即可。
正式素材暫時直接讀目前 `AlexLiao0131/studyRPG/main` 的公開圖片，因此不需要把 images 複製進這個測試包；正式 2.0 repo 建立後改成自己的相對路徑即可。


## 第二批：Battle Core + Daily Balance
本批從目前 1.0 main 拆出正式戰鬥核心，不採 wrapper/override：
- `js/balance/daily-dungeon-power.js`：A/B 每日怪公式；普通日 50%，Boss 日 70%，當日 snapshot 鎖定，新增任務只向上補。
- `js/battle/battle-math.js`：1.0 的 effectiveStat、Hero/Enemy 戰鬥面板、命中、閃避、招架、格擋、暴擊、元素抗性與傷害公式。
- `js/battle/battle-engine.js`：純 domain state；SPD 排序、目標、回合、狀態、勝負。沒有 DOM。
- `js/battle/battle-ui.js`：Overlay / HUD / 動畫 / 玩家操作；不計算傷害。
- `js/battle/skill-service.js`：先讀 1.0 正式 `skill-database.js`，網路失敗時至少保留 4 個初心者技能。
- `js/battle/monster-database.js`：1.0 世界怪物 metadata；正式 Monster AI/特殊 Boss 機制下一批再從 1.0 拆出，不能回頭疊 patch。

目前已能從副本按「挑戰！」進入正式 2.0 Battle Core。這一批先搬通用戰鬥責任；1.0 的各週 Monster AI、召喚、特殊 Boss、正式職業 special runtime 尚未宣稱完成。
