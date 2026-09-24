# StudyRPG 2.0 — Clean Rebuild

這不是把 1.0 的 65 萬字 `index.html` 拆檔，而是依 1.0 現行規則重新建立乾淨架構。

## 本版已落地
- 行事曆、課表、待辦三個現實資料來源分離。
- Task definition 與每日 occurrence 分離，取消某一天不會修改 recurring task 本體。
- Ability Engine：沿用 1.0 的自動任務能力分配概念。
- 角色裸四維戰力：STR×1.2 + AGI×1.1 + INT×1.0 + WILL×0.8。
- 每日副本：沿用現行穩定核心，A=今日零完成、B=今日全完成；普通 50%，週五 70%；建立當日 snapshot 後不因完成而往下追玩家。
- 期中/期末：沿用 1.0 現行核心，課表累積時數 × 各科戰力/小時 × 75%，期中 ×1.10、期末 ×1.20，Boss lock 與 Exam Energy target 分離。
- UI 完全重建，沒有 V10.x 版本函式、override、wrapper 或補丁 CSS。

## 明確尚未搬入
這份是可執行的 2.0 核心版，不是假裝已完成 1.0 全功能等價。以下仍待按模組正式搬入：
- 1.0 完整戰鬥引擎、技能/職業/狀態/元素/召喚
- 裝備、背包、商店、抽獎
- Visual DB / 技能演出 Runtime
- Firebase 家庭同步與多角色
- 好友/PvP
- 完整家長後台與核定流程
- 1.0 舊存檔 migration

## 不可破壞的開發規則
1. 一個責任只有一個正式模組。
2. 禁止 Patch / Override / Wrapper 疊加。
3. 禁止以版本號命名正式函式。
4. 禁止以任務名稱、日期、角色名稱寫死 bug 特例。
5. UI 不直接修改 domain state，只呼叫 service/store。
6. Renderer 不擁有遊戲規則。
7. 新 bug 必須回到責任來源修，不另建第二套狀態。
8. Git 負責版本歷史，程式本身不保留 V10114 這類考古層。

直接以 HTTP server 開啟即可；ES module 不建議用 file://。
例如：
python -m http.server 8000


## Three.js Renderer Prototype
場景測試使用 Three.js r186 + OrthographicCamera。可拖曳 Hero/Enemy，並測試近戰、魔法拋物線與召喚。CSS 只管 Canvas 容器/UI；世界座標在 data/scene-config.js。Three.js 由 jsDelivr CDN 載入，因此測試需要網路。
