# StudyRPG 2.0 — Architecture Refactor

StudyRPG 2.0 保留 1.0 的產品架構、玩法、世界、內容與數值意圖，但重新整理程式責任。正式 2.0 程式以本 repository `main` 為 Source of Truth；1.0 `AlexLiao0131/studyRPG` 只作為既有產品內容與素材來源，不再把 1.0 runtime 整包搬進 2.0。

## 已完成的正式模組

- World / 21 週世界資料與背景。
- Visual Config / GROUND / desktop、tablet、mobile 場景定位。
- Status / Exam Energy / Calendar Timeline。
- Tasks：排程、一般／計時／數量／分數任務、獎勵、待家長核定紀錄。
- Daily Balance：每日 A/B 怪物基準與既有鎖定規則。
- Battle Core：BattleState、BattleEngine、BattleMath、BattleUI、Skill Service、Monster AI、Monster Mechanics、多敵人／召喚等。
- 家長後台 Core：學期與課表、考試科目、任務 CRUD、100/80/50/0% 核定、指定日期取消／恢復、行事曆 CRUD、家長 PIN。

## 2.0 Migration 原則

`legacy-reader.js` 只讀取 1.0 正式存檔，並透過 allowlist 將仍屬正式產品資料搬入 2.0，例如角色、任務、任務紀錄、背包、裝備欄、商店、抽獎池、兌換申請、課表與行事曆。

不再把 1.0 整份 profile/runtime state 直接 clone 進 2.0，因此舊 wrapper、runtime 暫存、版本補丁 state 與無關欄位不會繼續累積。舊欄位 `dailyBalanceV10114`、`examBossBaselineV10158`、`examCompletionTargetsV101716` 只在 migration 邊界讀取一次，正式 2.0 state 使用 `dailyBalance`、`examBossBaseline`、`examCompletionTargets`。

1.0 原始 localStorage 不會被 2.0 覆寫。

## 家長後台責任

家長後台 UI 不直接實作遊戲規則：

- `js/gm/semester-admin-service.js`：學期、考試科目、課表。
- `js/gm/task-admin-service.js`：任務定義、封存／刪除、日期取消、核定入口。
- `js/gm/calendar-admin-service.js`：家庭行事曆事件。
- `js/gm/parent-access-service.js`：家長 PIN。
- `js/tasks/task-service.js`：孩子實際完成任務與正式任務紀錄。
- `js/progression/reward-service.js`：EXP、金幣／欠款、能力值發放與回收。

這樣避免把 1.0 巨型 `renderGM()` 與遊戲規則重新塞回同一個 UI 檔。

## 仍未完成

以下資料會保留，但尚未在 2.0 建立完整正式操作流程；在正式 Service 完成前，不在 GM UI 內先造第二套規則：

- Shop / Lottery transaction。
- Inventory lifecycle / 裝備完整交易流程。
- Firebase Family/Profile Provider 與 realtime sync。
- Online / Social Provider。
- GM 素材／動畫編輯器與完整 Battle Debug。
- Demon King 等跨階段 Boss 的正式 Phase / Transformation System。

## 測試原則

這是 ES Module 專案，必須以 HTTP(S) 開啟，不要用 `file://`。

每批修改至少執行：

- `node --check` 靜態語法檢查。
- 對受影響的 Service / Engine 做 smoke test。
- 只有真的在瀏覽器／手機執行過，才可以宣稱 Browser Runtime 通過。
