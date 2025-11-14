// sketch.js

// 遊戲狀態常數
const GAME_STATE = {
    START: 0,
    PLAYING: 1,
    END: 2
};

// 遊戲設定
const NUM_QUESTIONS = 5;         // 抽取五題
const SCORE_PER_QUESTION = 20;   // 每題二十分
const TIME_PER_QUESTION = 15;    // 每題時間限制（秒）

let gameState = GAME_STATE.START;
let selectedQuestions = [];      // 隨機抽取的 5 題
let currentQuestionIndex = 0;
let score = 0;
let feedbackMessage = "";        // 顯示正確或錯誤的訊息

// 新增：計時器相關變數
let questionStartTime = 0;       // 題目開始時間
let timeRemaining = TIME_PER_QUESTION; // 剩餘時間
let questionTimesUsed = [];      // 新增：記錄每題使用時間

// 新增：ALL_QUESTIONS 與讀取表格變數
let ALL_QUESTIONS = [];
let questionsTable;

// preload 會在 setup 前載入 CSV
function preload() {
    // 請將 questions.csv 放在同一個專案資料夾（與 sketch.js 同階或 p5 專案根目錄）
    console.log("preload: 嘗試載入 questions.csv...");
    // 改為不使用 header 模式，讓 parseQuestionsFromTable 可以跳過註解列
    questionsTable = loadTable('questions.csv', 'csv',
        (tbl) => { console.log("preload: questions.csv 載入成功，列數:", tbl.getRowCount()); },
        (err) => { console.error('preload: CSV 載入失敗（請檢查路徑與是否使用本機伺服器）：', err); }
    );
}

function setup() {
    // 建立回應式畫布（最大寬度/高度限制），並放入 #sketch-container 以置中
    const w = calcCanvasWidth();
    const h = calcCanvasHeight();
    createCanvas(w, h).parent('sketch-container');
     // 若需支援高 DPI 顯示器，可啟用下一行
     // pixelDensity(displayDensity());
    
    // 解析 CSV 成 ALL_QUESTIONS
    if (questionsTable && questionsTable.getRowCount && questionsTable.getRowCount() > 0) {
        console.log("setup: 解析 CSV...");
        parseQuestionsFromTable(questionsTable);
        
        // 初始化，從所有題目中隨機抽取 5 題
        if (ALL_QUESTIONS.length >= NUM_QUESTIONS) {
            // 使用 slice() 與複本避免修改原陣列
            selectedQuestions = shuffle([...ALL_QUESTIONS]).slice(0, NUM_QUESTIONS);
            console.log("setup: 已選取題目數:", selectedQuestions.length);
        } else {
            console.error("題目數量不足！請檢查 questions.csv 或使用 fallback。");
            // 若 CSV 資料不足，改用 fallback
            // ALL_QUESTIONS = FALLBACK_QUESTIONS.slice();
            // selectedQuestions = shuffle([...ALL_QUESTIONS]).slice(0, NUM_QUESTIONS);
        }
    } else {
        console.warn("questions.csv 未載入或為空，改用內建 fallback 題目。請確保使用 Live Server 並將 questions.csv 放在專案根目錄。");
        // ALL_QUESTIONS = FALLBACK_QUESTIONS.slice();
        // selectedQuestions = shuffle([...ALL_QUESTIONS]).slice(0, NUM_QUESTIONS);
    }
}

function draw() {
    background(240); // 淺灰色背景
    
    // 設定文字基本樣式
    textAlign(LEFT, TOP);
    textSize(20);
    fill(51);

    if (gameState === GAME_STATE.START) {
        drawStartScreen();
    } else if (gameState === GAME_STATE.PLAYING) {
        // 更新倒數計時
        updateTimer();
        
        // 檢查時間是否用完
        if (timeRemaining <= 0) {
            handleTimeUp();
        }
        
        drawQuestion();
        drawTimer();  // 繪製計時器
    } else if (gameState === GAME_STATE.END) {
        drawEndScreen();
    }
}

// 新增：更新計時器
function updateTimer() {
    const elapsedTime = (millis() - questionStartTime) / 1000;
    timeRemaining = TIME_PER_QUESTION - elapsedTime;
}

// 新增：時間用完時的處理
function handleTimeUp() {
    const q = selectedQuestions[currentQuestionIndex];
    feedbackMessage = `⏰ 時間到！正確答案是 ${q.答案}。`;
    
    // 新增：記錄此題使用時間（時間用完則記錄滿時間）
    questionTimesUsed.push(TIME_PER_QUESTION);
    
    // 延遲 1.5 秒後進入下一題
    setTimeout(nextQuestion, 1500);
}

// 新增：繪製計時器（進度條與倒數時間）
function drawTimer() {
    const timerBarWidth = width - 60;
    const timerBarHeight = 20;
    const timerBarX = 30;
    const timerBarY = 60;
    
    // 計算進度比例（0 ~ 1）
    const progress = max(0, timeRemaining / TIME_PER_QUESTION);
    
    // 繪製背景條
    fill(200);
    rect(timerBarX, timerBarY, timerBarWidth, timerBarHeight, 5);
    
    // 繪製進度條（根據時間改變顏色）
    let barColor;
    if (progress > 0.5) {
        barColor = color(0, 200, 0); // 綠色
    } else if (progress > 0.2) {
        barColor = color(255, 165, 0); // 橘色
    } else {
        barColor = color(255, 0, 0); // 紅色
    }
    
    fill(barColor);
    rect(timerBarX, timerBarY, timerBarWidth * progress, timerBarHeight, 5);
    
    // 繪製邊框
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(timerBarX, timerBarY, timerBarWidth, timerBarHeight, 5);
    
    // 繪製剩餘時間文字
    fill(0);
    noStroke();
    textAlign(RIGHT, CENTER);
    textSize(16);
    text(`${max(0, timeRemaining.toFixed(1))}秒`, timerBarX + timerBarWidth - 10, timerBarY + timerBarHeight / 2);
}

// 新增：在開始新題時初始化計時器
function startQuestionTimer() {
    questionStartTime = millis();
    timeRemaining = TIME_PER_QUESTION;
}

// 新增：計算平均使用時間
function getAverageTimeUsed() {
    if (questionTimesUsed.length === 0) return 0;
    const totalTime = questionTimesUsed.reduce((a, b) => a + b, 0);
    return totalTime / questionTimesUsed.length;
}

// ----------------- 畫面繪製函數 -----------------

function drawStartScreen() {
    textAlign(CENTER, CENTER);
    textSize(32);
    text("點擊滑鼠開始測驗", width / 2, height / 2 - 40);
    textSize(20);
    text(`p5.js 知識測驗：共 ${NUM_QUESTIONS} 題，每題 ${SCORE_PER_QUESTION} 分`, width / 2, height / 2 + 20);
    textSize(18);
    fill(150);
    text(`每題限時 ${TIME_PER_QUESTION} 秒，時間到自動判定為答錯`, width / 2, height / 2 + 80);
}

function drawQuestion() {
    if (currentQuestionIndex >= selectedQuestions.length) return;
    
    const q = selectedQuestions[currentQuestionIndex];
    
    // 標題與分數
    textSize(24);
    fill(0, 100, 150); // 深藜色
    text(`第 ${currentQuestionIndex + 1} 題 / ${NUM_QUESTIONS} 題 (得分: ${score})`, 30, 30);
    
    // 題目
    textSize(22);
    fill(0);
    text(`Q: ${q.題目}`, 30, 95, width - 60, 100); // 限制題目文字範圍
    
    // 選項
    textSize(20);
    let y_offset = 200;
    const optionKeys = ['A', 'B', 'C', 'D'];
    
    for (let i = 0; i < optionKeys.length; i++) {
        const key = optionKeys[i];
        const optionText = q.選項[key];
        
        if (optionText) {
            // 繪製選項框
            const boxY = y_offset + i * 50;
            drawOptionBox(key, optionText, boxY);
        }
    }
    
    // 答案回饋
    textSize(22);
    textAlign(CENTER, TOP);
    fill(255, 0, 0); // 紅色
    text(feedbackMessage, width / 2, height - 40);
}

function drawOptionBox(key, textContent, y) {
    const boxX = 30;
    const boxWidth = width - 60;
    const boxHeight = 40;
    
    // 繪製按鈕背景 (可點擊區域)
    let buttonColor = color(200); // 預設淺灰
    if (mouseX > boxX && mouseX < boxX + boxWidth && mouseY > y && mouseY < y + boxHeight) {
        buttonColor = color(150, 200, 255); // 滑鼠懸停變藍
    }
    fill(buttonColor);
    rect(boxX, y, boxWidth, boxHeight, 8); // 圓角矩形

    // 繪製選項文字
    fill(0);
    textAlign(LEFT, CENTER);
    text(`${key}. ${textContent}`, boxX + 15, y + boxHeight / 2);
}

function drawEndScreen() {
    textAlign(CENTER, CENTER);
    textSize(36);
    fill(0, 150, 0);
    text("✅ 測驗結束！", width / 2, height / 2 - 120);
    
    const maxScore = NUM_QUESTIONS * SCORE_PER_QUESTION;
    textSize(30);
    fill(0);
    text(`最終得分：${score} / ${maxScore}`, width / 2, height / 2 - 40);
    
    // 新增：顯示平均使用秒數
    const avgTime = getAverageTimeUsed();
    textSize(24);
    fill(100, 100, 100);
    text(`平均用時：${avgTime.toFixed(1)} 秒/題`, width / 2, height / 2 + 20);
    
    textSize(24);
    if (score === maxScore) {
        fill(255, 165, 0); // 橘色
        text("💯 恭喜！您獲得滿分！知識淵博！", width / 2, height / 2 + 80);
    } else if (score >= maxScore * 0.6) {
        fill(0, 100, 150);
        text("👍 表現不錯！請再接再厲！", width / 2, height / 2 + 80);
    } else {
        fill(150, 0, 0);
        text("📚 沒關係，多複習一下 p5.js 函式！", width / 2, height / 2 + 80);
    }
    
    // 點擊重新開始
    textSize(20);
    fill(0, 0, 255);
    text("點擊滑鼠重新開始", width / 2, height - 50);
}


// ----------------- 互動事件函數 -----------------

function mousePressed() {
    if (gameState === GAME_STATE.START || gameState === GAME_STATE.END) {
        // 從頭開始
        resetGame();
        gameState = GAME_STATE.PLAYING;
        startQuestionTimer();  // 新增：開始第一題計時
    } else if (gameState === GAME_STATE.PLAYING) {
        checkAnswer();
    }
}

function checkAnswer() {
    if (currentQuestionIndex >= selectedQuestions.length) return;

    const q = selectedQuestions[currentQuestionIndex];
    const optionKeys = ['A', 'B', 'C', 'D'];
    let y_offset = 200;
    
    for (let i = 0; i < optionKeys.length; i++) {
        const key = optionKeys[i];
        const boxY = y_offset + i * 50;
        const boxX = 30;
        const boxWidth = width - 60;
        const boxHeight = 40;
        
        // 判斷滑鼠是否點擊到此選項框
        if (mouseX > boxX && mouseX < boxX + boxWidth && mouseY > boxY && mouseY < boxY + boxHeight) {
            // 新增：記錄此題實際使用時間
            const timeUsed = TIME_PER_QUESTION - timeRemaining;
            questionTimesUsed.push(timeUsed);
            
            // 處理點擊事件
            if (key === q.答案) {
                score += SCORE_PER_QUESTION;
                // 正確回答的不同回答
                feedbackMessage = "✅ 太棒了！回答完全正確！🎉";
            } else {
                // 錯誤回答的不同回答
                feedbackMessage = `❌ 答錯了，真可惜。正確答案是 ${q.答案}。`;
            }
            
            // 延遲 1.5 秒後進入下一題
            setTimeout(nextQuestion, 1500);
            return; // 找到答案，退出迴圈
        }
    }
}

function nextQuestion() {
    feedbackMessage = ""; // 清除回饋訊息
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= selectedQuestions.length) {
        gameState = GAME_STATE.END; // 進入結算畫面
    } else {
        startQuestionTimer();  // 新增：開始下一題計時
    }
}

function resetGame() {
    // 重新隨機抽取 5 題（使用複本）
    selectedQuestions = shuffle([...ALL_QUESTIONS]).slice(0, NUM_QUESTIONS);
    currentQuestionIndex = 0;
    score = 0;
    feedbackMessage = "";
    timeRemaining = TIME_PER_QUESTION;
    questionTimesUsed = [];  // 新增：重設時間紀錄
}

// 新增：將 loadTable 解析成你原本使用的物件格式
function parseQuestionsFromTable(table) {
    const rows = table.getRows();
    ALL_QUESTIONS = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const firstCell = (row.get(0) || "").toString().trim();
        // 跳過註解或空列
        if (firstCell.startsWith('//') || firstCell === "") continue;

        // 若看起來像標頭（包含「題目」「question」或第一列第二格為「選項」相關字樣），跳過
        const secondCell = (row.get(1) || "").toString().toLowerCase();
        const lowerFirst = firstCell.toLowerCase();
        if (lowerFirst.includes('題目') || lowerFirst.includes('question') || secondCell.includes('選項') || secondCell.includes('a')) {
            continue;
        }

        // 解析：支援有 header（透過欄名取值）或無 header（透過索引取值）
        const q = row.get('題目') || row.get('question') || row.get(0) || "";
        const a = row.get('A') || row.get('選項A') || row.get(1) || "";
        const b = row.get('B') || row.get('選項B') || row.get(2) || "";
        const c = row.get('C') || row.get('選項C') || row.get(3) || "";
        const d = row.get('D') || row.get('選項D') || row.get(4) || "";
        // 答案通常在第 5 個欄位（index 5），若沒有再 fallback 到 index 4 或欄名
        const ansRaw = row.get('答案') || row.get('answer') || row.get(5) || row.get(4) || 'A';
        const ans = (typeof ansRaw === 'string' ? ansRaw.trim().toUpperCase() : String(ansRaw).toUpperCase());

        ALL_QUESTIONS.push({
            題目: q,
            選項: { A: a, B: b, C: c, D: d },
            答案: ans
        });
    }

    console.log("parseQuestionsFromTable: 解析完畢，ALL_QUESTIONS 長度:", ALL_QUESTIONS.length);
}

// ----------------- 輔助函數 -----------------

// Fisher-Yates 洗牌算法，用於隨機打亂陣列
function shuffle(array) {
  let currentIndex = array.length, randomIndex;

  // 當還有元素可洗牌時...
  while (currentIndex != 0) {

    // 隨機選擇一個尚未洗牌的元素
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // 進行元素交換
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

// 新增：計算畫布大小（可調整最大值）
function calcCanvasWidth() {
    // 以視窗為基準，但限制最大寬度避免太寬
    return Math.min(windowWidth * 0.95, 1200);
}
function calcCanvasHeight() {
    // 高度限制，並保留上方/下方空間
    return Math.min(windowHeight * 0.9, 800);
}

// 新增：當視窗大小變更時調整畫布大小並維持置中
function windowResized() {
    resizeCanvas(calcCanvasWidth(), calcCanvasHeight());
}