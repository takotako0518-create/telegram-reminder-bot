# 🤖 Telegram 智慧提醒小幫手 (Telegram Reminder Bot)

基於 **Google Apps Script (GAS)** 與 **Telegram Bot API** 開發的輕量化自動提醒機器人。支援每日、每週、每月及單次提醒設定，並整合 Telegram Webhook 與 Inline Keyboard（內聯按鈕）互動選單。

---

## ✨ 核心功能特色

* **📅 多種提醒週期**：支援「每日」、「每週」、「每月（包含月底）」與「單次」提醒設定。
* **🧠 智慧自然語言解析**：
  * 自動識別日期、星期（週一~週日）、時間（中文點/分、電子時鐘格式如 `07:30` 或純數字如 `0800`）。
  * 相容繁體與簡體中文輸入（如：`10號` / `10号` / `10日`）。
* **📝 批次與多行解析**：支援一次輸入多行提醒事項，AI 智慧自動拆解匯入。
* **🔘 互動式刪除選單**：提供 Telegram Inline Keyboard（複選按鈕），方便直接勾選刪除特定提醒項目。
* **☁️ 零成本部署**：完全基於 Google Apps Script 運行，無須自備伺服器。

---

## 🛠️ 安裝與部署指南

### 1. 建立 Telegram Bot
1. 在 Telegram 搜尋 `@BotFather` 並建立一個新的 Bot。
2. 取得 **HTTP API Token**（例：`123456789:ABCdefGhI...`）。
3. 將 Bot 加入目標 Telegram 群組，並取得群組的 `chat_id`。

### 2. Google Apps Script 專案設定
1. 開啟 [Google Apps Script](https://script.google.com/) 並新增專案。
2. 將本專案的 `Code.gs` 內容複製貼入編輯器中。
3. 修改程式碼頂部的變數：
   ```javascript
   const TOKEN = "你的_TELEGRAM_BOT_TOKEN";
   const TARGET_GROUP = -100XXXXXXX; // 你的 Telegram 群組 ID
