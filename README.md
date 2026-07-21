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
   
---

1.點擊右上角 「部署」 -> 「新建部署」：
◌ 種類：選擇 Web 應用程式 (Web App)
◌ 執行身份：選擇 我 (Me)
◌ 誰有權限存取：選擇 所有人 (Anyone)

2.部署完成後複製取得的 Web App URL。

3. 設定 Telegram Webhook 與觸發器 (Triggers)
 a.綁定 Webhook：在瀏覽器中開啟以下網址以綁定：
HTTP
[https://api.telegram.org/bot](https://api.telegram.org/bot)<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEB_APP_URL>

 b.設定時間觸發器：
  ◌ 在 GAS 左側選單點擊 「觸發條件 (Triggers)」 ⏰。
  ◌ 新增觸發條件：執行函式選擇 checkAndSendReminders。
  ◌ 事件來源：時間驅動。
  ◌ 時間型觸發條件類型：分定時器（建議設定為每分鐘執行一次）。
  
---

📖 指令與使用範例
1. 常用指令
指令                  說明
/list         查看當前所有排定中的提醒清單
/del          呼叫互動式選單，可複選刪除提醒
/add_day      取得每日提醒的新增範例
/add_week     取得每週提醒的新增範例
/add_month    取得每月提醒的新增範例
/add_once     取得單次提醒的新增範例

2. 訊息輸入範例
◌ 每日提醒：每日 07:30 XX
◌ 每週提醒：周四 15:00 吃飯 或 每週一 10點 開會
◌ 每月提醒：10號 09:00 打掃 或 月底 07:50 檢查
◌ 單次提醒：06/29 12:50 吃飯 或 0629 12:50 吃飯
◌ 多行批次輸入
Plaintext
單次 09:00 專案會議
07/15
07/20

---

📝 授權 (License)
本專案採用 MIT License 授權。
