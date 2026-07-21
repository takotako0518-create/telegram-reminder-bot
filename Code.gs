const TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
const API_URL = "https://api.telegram.org/bot" + TOKEN + "/";
const TARGET_GROUP = -100123456789; // 限制群組

function getReminders() {
  const props = PropertiesService.getScriptProperties();
  const data = props.getProperty("reminders");
  return data ? JSON.parse(data) : [];
}

function saveReminders(reminders) {
  const props = PropertiesService.getScriptProperties();
  const propsData = {};
  propsData["reminders"] = JSON.stringify(reminders);
  props.setProperties(propsData);
}

function generateId() {
  return Math.random().toString(16).substr(2, 4);
}

/**
 * 🌟 安全過濾時間字串的年份（僅在確實存在年份前綴時才剔除）
 */
function cleanYearPrefix(timeStr) {
  if (!timeStr) return "";
  // 匹配 26/07/11 12:30 或 2026/07/11 12:30 格式，將年份切除只留 月/日 時:分
  let match = timeStr.match(/^(?:\d{2,4}\/)(\d{2}\/\d{2}\s+\d{2}:\d{2})$/);
  if (match) {
    return match[1];
  }
  return timeStr; // 如果本來就是 07/11 11:30，原樣返回，不誤殺月份
}

/**
 * 🛠️ 智慧型單行解析（加入嚴格防呆與「月底」識別）
 */
function smartParse(fullText, forceType = "") {
  let cleanText = fullText.replace(/@timereminder7_bot/g, "").replace(/@shibatimegobot/g, "").trim();
  
  // 【防呆安全鎖】如果過濾掉機器人名字後，只剩下關鍵字或根本是空的，直接判定無效
  let testEmpty = cleanText.replace(/(每日|每天|每週|每周|每月|單次|周一|周二|周三|周四|周五|周六|周日|月底)/g, "").trim();
  if (!testEmpty) {
    return null; 
  }

  let now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let hour = null, min = null; 
  let hasValidTime = false;
  let isEndOfMonth = false;
  
  let type = "單次";
  if (forceType) {
    type = forceType;
  } else {
    if (fullText.includes("每日") || fullText.includes("每天")) type = "每日";
    else if (fullText.includes("每週") || fullText.includes("每周") || fullText.includes("周")) type = "每週";
    else if (fullText.includes("每月") || fullText.includes("月底")) type = "每月";
  }

  // 檢查是否含有「月底」關鍵字
  if (cleanText.includes("月底")) {
    isEndOfMonth = true;
    type = "每月";
    cleanText = cleanText.replace("月底", " ");
  }

  // 檢查是否含有「xx號」或「xx日」
  let dayMatch = cleanText.match(/(\d+)\s*[號号日]/);
  if (dayMatch && !isEndOfMonth) {
    day = parseInt(dayMatch[1], 10);
    type = "每月";
    cleanText = cleanText.replace(dayMatch[0], " ");
  }

  // 檢查星期幾
  let weekMatch = cleanText.match(/(每?[週周][一二三四五六日])/);
  if (weekMatch) {
    let w = weekMatch[1].replace("每", "").replace("週", "周");
    type = "每週" + w; 
    cleanText = cleanText.replace(weekMatch[0], " ");
  } else if (type === "每週") {
    let weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    type = "每週" + weekDays[now.getDay()];
  }

  // 解析中文時間：如 8點、15點30分、10點半
  let chineseTimeMatch = cleanText.match(/(\d{1,2})\s*[點時]\s*(\d{1,2})?分?/) || cleanText.match(/(\d{1,2})\s*點半/);
  if (chineseTimeMatch) {
    hour = parseInt(chineseTimeMatch[1], 10);
    if (chineseTimeMatch[0].includes("半")) {
      min = 30;
    } else {
      min = chineseTimeMatch[2] ? parseInt(chineseTimeMatch[2], 10) : 0;
    }
    hasValidTime = true;
    cleanText = cleanText.replace(chineseTimeMatch[0], " ");
  }

  // 解析電子時鐘時間：如 07:30、13：05、0800
  let clockMatch = cleanText.match(/(\d{1,2})\s*[:：\.]\s*(\d{2})/);
  if (clockMatch) {
    hour = parseInt(clockMatch[1], 10);
    min = parseInt(clockMatch[2], 10);
    hasValidTime = true;
    cleanText = cleanText.replace(clockMatch[0], " ");
  } else {
    // 檢查是否有獨立的 4 位數純數字時間（如 0800、1430）
    let pureFourDigits = cleanText.match(/\b(\d{2})(\d{2})\b/);
    if (pureFourDigits && !chineseTimeMatch) {
      let h = parseInt(pureFourDigits[1], 10);
      let m = parseInt(pureFourDigits[2], 10);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        hour = h;
        min = m;
        hasValidTime = true;
        cleanText = cleanText.replace(pureFourDigits[0], " ");
      }
    }
  }

  // 解析日期格式：如 6/29、0629
  let dateMatch = cleanText.match(/(\d{2,4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/) || cleanText.match(/(\d{1,2})[\/\.-](\d{1,2})/);
  if (dateMatch && !isEndOfMonth && type === "單次") {
    let parts = dateMatch[0].split(/[\/\.-]/);
    if (parts.length === 2) {
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
    cleanText = cleanText.replace(dateMatch[0], " ");
  }

  // 【嚴格防呆鎖】如果連最基本的時間特徵都沒抓到，判定為無效資料，不進行新增
  if (!hasValidTime || hour === null || min === null) {
    return null;
  }

  // 提取事務內容
  let task = cleanText;
  task = task.replace(/(每日|每天|每週|每周|每月|單次|月底)/g, " ");
  task = task.replace(/[:：\s\.\/\-\,]+/g, " ").trim();
  
  if (!task) return null;

  return { type, month, day, hour, min, task, isEndOfMonth };
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.callback_query) { handleCallback(data.callback_query); return; }
    if (!data.message) return;
    
    const chatId = data.message.chat.id;
    const msgId = data.message.message_id;
    if (chatId !== TARGET_GROUP) { sendMessage(chatId, "❌ 本機器人僅限特定公務群組專用。"); return; }

    let text = data.message.text;
    if (!text) return;

    if (text.startsWith("/add_day")) { sendReply(chatId, msgId, "💡 【新增每日提醒範例】\n請直接「回覆」此訊息或輸入：\n`每日 07:30 看交接進度\n08:30 SKILL`", "Markdown"); return; }
    if (text.startsWith("/add_week")) { sendReply(chatId, msgId, "💡 【新增每週提醒範例】\n請直接「回覆」此訊息輸入：\n`周四 15:00 回家` 或 `每週一 10點 開會`", "Markdown"); return; }
    if (text.startsWith("/add_month")) { sendReply(chatId, msgId, "💡 【新增每月提醒範例】\n請直接「回覆」此訊息輸入：\n`30號 8點 股票` 或 `月底 07:50 抽查數量`", "Markdown"); return; }
    if (text.startsWith("/add_once")) { sendReply(chatId, msgId, "💡 【新增單次提醒範例】\n請直接「回覆」此訊息輸入：\n`6/29 12:50 吃飯` 或 `0629 12:50 吃飯`", "Markdown"); return; }
    if (text.startsWith("/add_batch")) { sendReply(chatId, msgId, "💡 【批量新增單次範例】\n請直接「回覆」此訊息輸入：\n/batch 吃益生菌\n06/29 16:00\n06/29 17:00"); return; }
    if (text.startsWith("/list")) { sendReminderList(chatId); return; }
    if (text.startsWith("/del")) { sendDeleteMenu(chatId); return; }
    if (text.startsWith("/batch")) { handleBatchAdd(chatId, text); return; }

    let isReplyToBot = data.message.reply_to_message && (data.message.reply_to_message.from.username === "timereminder7_bot" || data.message.reply_to_message.from.username === "shibatimegobot");
    let forceType = "";

    if (isReplyToBot) {
      let replyText = data.message.reply_to_message.text;
      if (replyText.includes("每日提醒")) forceType = "每日";
      else if (replyText.includes("每週提醒")) forceType = "每週"; 
      else if (replyText.includes("每月提醒")) forceType = "每月";
      else if (replyText.includes("單次提醒")) forceType = "單次";
      
      if (replyText.includes("批量") && !text.startsWith("/batch")) {
        handleBatchAdd(chatId, "/batch " + text);
        return;
      }
    }

    if (text.includes("\n")) {
      handleSmartSmartMultiLine(chatId, msgId, text, forceType);
      return;
    }

    if (text.includes("@timereminder7_bot") || text.includes("@shibatimegobot") || isReplyToBot || text.startsWith("每日") || text.startsWith("每週") || text.startsWith("每月") || text.startsWith("單次") || text.startsWith("月底")) {
      let parsed = smartParse(text, forceType);
      if (!parsed) return; 

      let reminders = getReminders();
      let id = generateId();
      let item = { id: id, type: parsed.type, task: parsed.task };

      if (parsed.type === "每日") {
        item.time = `${pad(parsed.hour)}:${pad(parsed.min)}`;
        reminders.push(item);
        sendReply(chatId, msgId, `【提醒用機器人】\n🔄 每日提醒已成功設定！\nID：\`${id}\`\n每日時間：${item.time}\n事務：${item.task}`, "Markdown");
      } 
      else if (parsed.type.startsWith("每週")) {
        let displayWeek = parsed.type.replace("每週", "");
        item.time = `${displayWeek} ${pad(parsed.hour)}:${pad(parsed.min)}`;
        reminders.push(item);
        sendReply(chatId, msgId, `【提醒用機器人】\n🔄 每週提醒已成功設定！\nID：\`${id}\`\n每週時間：${item.time}\n事務：${item.task}`, "Markdown");
      }
      else if (parsed.type === "每月") {
        let finalDay = parsed.isEndOfMonth ? "月底" : parsed.day + "號";
        item.time = `${finalDay} ${pad(parsed.hour)}:${pad(parsed.min)}`;
        reminders.push(item);
        sendReply(chatId, msgId, `【提醒用機器人】\n📅 每月提醒已成功設定！\nID：\`${id}\`\n每月時間：${item.time}\n事務：${item.task}`, "Markdown");
      }
      else if (parsed.type === "單次") {
        item.time = `${pad(parsed.month)}/${pad(parsed.day)} ${pad(parsed.hour)}:${pad(parsed.min)}`;
        reminders.push(item);
        sendReply(chatId, msgId, `【提醒用機器人】\n✅ 單次提醒已成功設定！\nID：\`${id}\`\n時間：${item.time}\n事務：${item.task}`, "Markdown");
      }

      saveReminders(reminders);
    }
  } catch (err) {
    Logger.log(err.toString());
  }
}

function handleSmartSmartMultiLine(chatId, msgId, fullText, forceType) {
  let lines = fullText.split("\n");
  let reminders = getReminders();
  let successItems = [];
  
  let currentType = "每日"; 
  if (forceType) currentType = forceType;
  else if (fullText.includes("每日") || fullText.includes("每天")) currentType = "每日";
  else if (fullText.includes("每週") || fullText.includes("每周")) currentType = "每週";
  else if (fullText.includes("每月") || fullText.includes("月底")) currentType = "每月";
  else if (fullText.includes("單次")) currentType = "單次";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith("/") || line === "@timereminder7_bot" || line === "@shibatimegobot") continue;

    let parsed = smartParse(line, currentType);
    if (!parsed) continue; 

    let id = generateId();
    let item = { id: id, type: parsed.type, task: parsed.task };

    if (parsed.type === "每日") {
      item.time = `${pad(parsed.hour)}:${pad(parsed.min)}`;
    } 
    else if (parsed.type.startsWith("每週")) {
      let displayWeek = parsed.type.replace("每週", "");
      if (displayWeek === "每週" || displayWeek === "") displayWeek = "周一"; 
      item.time = `${displayWeek} ${pad(parsed.hour)}:${pad(parsed.min)}`;
    }
    else if (parsed.type === "每月") {
      let finalDay = parsed.isEndOfMonth ? "月底" : parsed.day + "號";
      item.time = `${finalDay} ${pad(parsed.hour)}:${pad(parsed.min)}`;
    }
    else if (parsed.type === "單次") {
      item.time = `${pad(parsed.month)}/${pad(parsed.day)} ${pad(parsed.hour)}:${pad(parsed.min)}`;
    }

    reminders.push(item);
    successItems.push(item);
  }

  if (successItems.length > 0) {
    saveReminders(reminders);

    let resp = `【提醒用機器人】\n✅ <b>AI 智慧批次解析新增完成！</b>\n\n`;
    successItems.forEach(item => {
      let icon = item.type === "每日" ? "🔄" : (item.type.startsWith("每月") ? "📅" : "⏳");
      resp += `${icon} ${item.type} ${cleanYearPrefix(item.time)} ${item.task}\n`;
    });
    resp += `\n🎉 <b>共成功匯入 ${successItems.length} 筆提醒！</b>`;
    
    sendReply(chatId, msgId, resp, "HTML");
  } else {
    sendReply(chatId, msgId, "⚠️ 未能成功辨識出有效的提醒項目。請確保每行皆包含「時間」與「事務內容」。");
  }
}

function handleBatchAdd(chatId, text) {
  let lines = text.split("\n");
  let firstLine = lines[0].replace("/batch", "").trim();
  let task = firstLine;
  
  if (!task || lines.length < 2) {
    sendMessage(chatId, "💡 批量新增格式錯誤！\n請按照範例格式換行輸入時間。");
    return;
  }

  let reminders = getReminders();
  let summary = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let id = generateId();
    let p = smartParse(lines[i] + " " + task, "單次");
    if (!p) continue;
    let timeStr = `${pad(p.month)}/${pad(p.day)} ${pad(p.hour)}:${pad(p.min)}`;
    
    reminders.push({
      id: id,
      type: "單次",
      time: timeStr, 
      task: p.task
    });
    summary.push(`• ${timeStr} ${p.task}`);
  }

  saveReminders(reminders);
  sendMessage(chatId, `【提醒用機器人】\n✅ 批次新增完成！\n共成功匯入 ${summary.length} 筆排班提醒。\n\n📋 新增明細：\n${summary.join("\n")}`);
}

function sendReminderList(chatId) {
  let reminders = getReminders();
  if (reminders.length === 0) {
    sendMessage(chatId, "【提醒用機器人】\n📋 目前沒有任何提醒設定。");
    return;
  }
  let text = "【提醒用機器人】\n📋 <b>目前提醒清單：</b>\n\n";
  reminders.forEach(item => {
    text += `🔹 ID：<code>${item.id}</code>\n`;
    if (item.type === "每日") {
      text += `🔄 每日提醒：每日 ${item.time}\n`;
    } else if (item.type.startsWith("每週")) {
      text += `🔄 每週提醒：${item.time}\n`;
    } else if (item.type.startsWith("每月")) {
      text += `📅 每月提醒：${item.time}\n`;
    } else {
      text += `⏳ 等待中：時間 ${cleanYearPrefix(item.time)}\n`;
    }
    text += `📌 事務：${item.task}\n\n`;
  });
  sendMessage(chatId, text, "HTML");
}

function buildDeleteKeyboard(reminders, selectedIds) {
  let keyboard = [];
  reminders.forEach(item => {
    let isChecked = selectedIds.includes(item.id);
    let box = isChecked ? "⬛" : "⬜";
    let icon = item.type === "單次" ? "⏳" : (item.type.startsWith("每月") ? "📅" : "🔄");
    
    let displayTime = item.time;
    if (item.type === "單次") {
      displayTime = cleanYearPrefix(displayTime);
    }

    keyboard.push([{
      text: `${box} ${icon} [${displayTime}] ${item.task} (ID:${item.id})`,
      callback_data: `toggle_${item.id}_${selectedIds.join("-")}`
    }]);
  });
  keyboard.push([{ text: "🚨 確定刪除已勾選項目", callback_data: `confirm_${selectedIds.join("-")}` }]);
  keyboard.push([{ text: "❌ 取消", callback_data: "cancel" }]);
  return { inline_keyboard: keyboard };
}

function sendDeleteMenu(chatId) {
  let reminders = getReminders();
  if (reminders.length === 0) {
    sendMessage(chatId, "【提醒用機器人】\n沒有可刪除的提醒。");
    return;
  }
  let replyMarkup = buildDeleteKeyboard(reminders, []);
  UrlFetchApp.fetch(API_URL + "sendMessage", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text: "【提醒用機器人】\n請點選下方項目進行多選（可複選），完成後按下「確定刪除」：",
      reply_markup: JSON.stringify(replyMarkup)
    })
  });
}

function handleCallback(query) {
  let chatId = query.message.chat.id;
  let messageId = query.message.message_id;
  let data = query.data;
  
  if (data === "cancel") { deleteMessage(chatId, messageId); return; }
  
  if (data.startsWith("toggle_")) {
    let parts = data.split("_");
    let targetId = parts[1];
    let currentSelected = parts[2] ? parts[2].split("-").filter(x => x) : [];
    
    if (currentSelected.includes(targetId)) {
      currentSelected = currentSelected.filter(id => id !== targetId);
    } else {
      currentSelected.push(targetId);
    }
    
    let reminders = getReminders();
    let updatedMarkup = buildDeleteKeyboard(reminders, currentSelected);
    
    UrlFetchApp.fetch(API_URL + "editMessageText", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: "【提醒用機器人】\n請點選下方項目進行多選（可複選），完成後按下「確定刪除」：",
        reply_markup: JSON.stringify(updatedMarkup)
      })
    });
  }
  
  if (data.startsWith("confirm_")) {
    let idsToDelete = data.split("_")[1].split("-").filter(x => x);
    if (idsToDelete.length === 0) { sendMessage(chatId, "⚠️ 您沒有勾選任何項目！"); return; }
    
    let reminders = getReminders();
    let deletedItems = reminders.filter(item => idsToDelete.includes(item.id));
    saveReminders(reminders.filter(item => !idsToDelete.includes(item.id)));
    
    deleteMessage(chatId, messageId);
    
    let resp = `【提醒用機器人】\n🗑️ 已成功批次刪除 ${deletedItems.length} 筆提醒：\n\n`;
    deletedItems.forEach(item => { 
      resp += `➖ [${cleanYearPrefix(item.time)}] ${item.task} (ID:${item.id})\n`; 
    });
    sendMessage(chatId, resp);
  }
}

/**
 * ⏰ 智慧通知發送核心（已全面修正日期格式大寫 DD 的 Bug）
 */
function checkAndSendReminders() {
  let now = new Date();
  let targetTimeObj = new Date(now.getTime() + 60000); 
  
  // 🌟 已修正：改為正確的小寫 "MM/dd"
  let formattedDate = Utilities.formatDate(targetTimeObj, "GMT+8", "MM/dd HH:mm");
  let curDayNum = targetTimeObj.getDate() + "號"; 
  let weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  let curWeekDay = weekDays[targetTimeObj.getDay()];
  
  let curTime = formattedDate.split(" ")[1];
  let curMDDate = formattedDate.split(" ")[0]; 

  let tomorrow = new Date(targetTimeObj.getTime() + 24 * 60 * 60 * 1000);
  let isTodayLastDay = (tomorrow.getDate() === 1);

  let reminders = getReminders();
  let matchedTasks = [];
  let remaining = [];

  reminders.forEach(item => {
    let isTime = false;
    
    if (item.type === "每日" && item.time === curTime) {
      isTime = true;
    }
    else if (item.type.startsWith("每週") && item.time === `${item.time.split(" ")[0]} ${curTime}`) {
      if (item.time.startsWith(curWeekDay)) isTime = true;
    }
    else if (item.type.startsWith("每月")) {
      let timePart = item.time.split(" ")[1] || item.time.split(" ")[0];
      if (item.time.startsWith("月底")) {
        if (isTodayLastDay && curTime === timePart) isTime = true;
      } else {
        if ((item.time === `${curDayNum} ${curTime}` || item.time === `${targetTimeObj.getDate()}號 ${curTime}`)) isTime = true;
      }
    }
    else if (item.type === "單次") {
      let standardizedTime = cleanYearPrefix(item.time);
      if (standardizedTime === `${curMDDate} ${curTime}`) {
        isTime = true;
      }
    }

    if (isTime) {
      matchedTasks.push(item);
      if (item.type !== "單次") remaining.push(item); 
    } else {
      remaining.push(item);
    }
  });

  if (matchedTasks.length > 0) {
    let realTargetTime = new Date(targetTimeObj.getFullYear(), targetTimeObj.getMonth(), targetTimeObj.getDate(), targetTimeObj.getHours(), targetTimeObj.getMinutes(), 1, 0);
    let currentFreshTime = new Date();
    let sleepMs = realTargetTime.getTime() - currentFreshTime.getTime();
    
    if (sleepMs > 0 && sleepMs < 60000) {
      Utilities.sleep(sleepMs);
    }
    
    matchedTasks.forEach(item => {
      let displayTimeText = "";
      if (item.type === "每日") {
        displayTimeText = `每日 ${item.time}`;
      } else if (item.type.startsWith("每週")) {
        let w = item.time.split(" ")[0].replace("周", "週");
        displayTimeText = `每${w} ${item.time.split(" ")[1]}`;
      } else if (item.type.startsWith("每月")) {
        displayTimeText = `每月${item.time}`;
      } else {
        displayTimeText = cleanYearPrefix(item.time); 
      }

      sendMessage(TARGET_GROUP, `📋 提醒時間：${displayTimeText}\n✅ 提醒事項：${item.task}`);
    });
    
    saveReminders(remaining);
  }
}

function sendMessage(chatId, text, parseMode = "") {
  let payload = { "chat_id": chatId, "text": text };
  if (parseMode) payload["parse_mode"] = parseMode;
  UrlFetchApp.fetch(API_URL + "sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify(payload) });
}

function sendReply(chatId, replyToMessageId, text, parseMode = "") {
  let payload = { "chat_id": chatId, "text": text, "reply_to_message_id": replyToMessageId };
  if (parseMode) payload["parse_mode"] = parseMode;
  UrlFetchApp.fetch(API_URL + "sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify(payload) });
}

function deleteMessage(chatId, messageId) {
  UrlFetchApp.fetch(API_URL + "deleteMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, message_id: messageId }) });
}

function pad(n) { return n < 10 ? '0' + n : n; }
