/**
 * Study Timer & CareerPrep AI Extension (popup.js)
 */

// Default Configuration Constants
const DEFAULTS = {
  STUDY_MINUTES: 25,
  BREAK_MINUTES: 5,
  COMPLETED_SESSIONS: 0,
  MODE: 'study'
};

// DOM Element References
const timerDisplay = document.getElementById('timerDisplay');
const modeBadge = document.getElementById('modeBadge');
const sessionCount = document.getElementById('sessionCount');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const studyInput = document.getElementById('studyInput');
const breakInput = document.getElementById('breakInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetCountBtn = document.getElementById('resetCountBtn');
const statusMsg = document.getElementById('statusMsg');

// State Variables
let timerInterval = null;
let currentMode = DEFAULTS.MODE;
let studyDuration = DEFAULTS.STUDY_MINUTES;
let breakDuration = DEFAULTS.BREAK_MINUTES;
let completedSessions = DEFAULTS.COMPLETED_SESSIONS;
let timeLeftSeconds = DEFAULTS.STUDY_MINUTES * 60;
let isRunning = false;
let timerEndTime = null;

// Initialize Popup
document.addEventListener('DOMContentLoaded', () => {
  if (chrome.storage && chrome.storage.local) {
    initializeExtensionState();
  }
  setupEventListeners();
});

// Tab Switcher
window.switchTab = function(tabName) {
  const timerContent = document.getElementById('timerTabContent');
  const chatContent = document.getElementById('chatTabContent');
  const timerBtn = document.getElementById('timerTabBtn');
  const chatBtn = document.getElementById('chatTabBtn');

  if (tabName === 'timer') {
    timerContent.style.display = 'block';
    chatContent.style.display = 'none';
    timerBtn.classList.add('active');
    chatBtn.classList.remove('active');
  } else {
    timerContent.style.display = 'none';
    chatContent.style.display = 'flex';
    chatBtn.classList.add('active');
    timerBtn.classList.remove('active');
  }
};

// Extension Chat Handler
window.sendExtMessage = function() {
  const input = document.getElementById('extChatInput');
  const text = input.value.trim();
  if (!text) return;

  const msgContainer = document.getElementById('extChatMessages');

  // User msg
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = text;
  msgContainer.appendChild(userDiv);

  input.value = '';
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Bot response simulation
  setTimeout(() => {
    const botDiv = document.createElement('div');
    botDiv.className = 'chat-msg bot';
    
    const lower = text.toLowerCase();
    if (lower.includes('mock')) {
      botDiv.innerHTML = "🎯 <strong>Mock Interview Task Started:</strong><br>Question 1: Explain the difference between Process and Thread in OS.";
    } else if (lower.includes('dsa') || lower.includes('array')) {
      botDiv.innerHTML = "💻 <strong>DSA Task:</strong><br>For Array reversal, use two pointers (left=0, right=n-1) and swap in O(N) time.";
    } else if (lower.includes('aptitude') || lower.includes('math')) {
      botDiv.innerHTML = "📊 <strong>Aptitude Task:</strong><br>Time & Work formula: Combined 1-day work = 1/A + 1/B.";
    } else {
      botDiv.innerHTML = `<strong>CareerPrep AI Task Executed:</strong><br>Processed prompt "${text}". For full ChatGPT UI view, visit http://localhost:8000!`;
    }

    msgContainer.appendChild(botDiv);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }, 400);
};

function initializeExtensionState() {
  chrome.storage.local.get(
    ['studyDuration', 'breakDuration', 'completedSessions', 'currentMode', 'timeLeftSeconds', 'isRunning', 'timerEndTime'],
    (result) => {
      if (result.studyDuration !== undefined) studyDuration = parseInt(result.studyDuration, 10);
      if (result.breakDuration !== undefined) breakDuration = parseInt(result.breakDuration, 10);
      if (result.completedSessions !== undefined) completedSessions = parseInt(result.completedSessions, 10);
      if (result.currentMode !== undefined) currentMode = result.currentMode;

      if (studyInput) studyInput.value = studyDuration;
      if (breakInput) breakInput.value = breakDuration;
      if (sessionCount) sessionCount.textContent = completedSessions;

      if (result.isRunning && result.timerEndTime) {
        const remaining = Math.round((result.timerEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          timeLeftSeconds = remaining;
          isRunning = true;
          timerEndTime = result.timerEndTime;
          startTimerCountdown();
        } else {
          handleTimerCompletion();
        }
      } else {
        if (result.timeLeftSeconds !== undefined) {
          timeLeftSeconds = result.timeLeftSeconds;
        } else {
          timeLeftSeconds = (currentMode === 'study' ? studyDuration : breakDuration) * 60;
        }
        isRunning = false;
      }

      updateFullUI();
    }
  );
}

function setupEventListeners() {
  if (startBtn) startBtn.addEventListener('click', handleStart);
  if (pauseBtn) pauseBtn.addEventListener('click', handlePause);
  if (resetBtn) resetBtn.addEventListener('click', handleReset);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', handleSaveSettings);
  if (resetCountBtn) resetCountBtn.addEventListener('click', handleResetSessionCount);
}

function handleStart() {
  if (isRunning) return;
  isRunning = true;
  timerEndTime = Date.now() + (timeLeftSeconds * 1000);
  saveStateToStorage();
  startTimerCountdown();
  updateButtonControls();
}

function startTimerCountdown() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const remaining = Math.round((timerEndTime - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timeLeftSeconds = 0;
      updateTimerDisplay(0);
      handleTimerCompletion();
    } else {
      timeLeftSeconds = remaining;
      updateTimerDisplay(timeLeftSeconds);
    }
  }, 1000);
}

function handlePause() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerEndTime = null;
  saveStateToStorage();
  updateButtonControls();
}

function handleReset() {
  isRunning = false;
  clearInterval(timerInterval);
  timerEndTime = null;
  const targetMinutes = currentMode === 'study' ? studyDuration : breakDuration;
  timeLeftSeconds = targetMinutes * 60;
  saveStateToStorage();
  updateFullUI();
}

function handleTimerCompletion() {
  playCompletionSound();
  if (currentMode === 'study') {
    currentMode = 'break';
    timeLeftSeconds = breakDuration * 60;
  } else {
    currentMode = 'study';
    completedSessions++;
    if (sessionCount) sessionCount.textContent = completedSessions;
    timeLeftSeconds = studyDuration * 60;
  }
  isRunning = true;
  timerEndTime = Date.now() + (timeLeftSeconds * 1000);
  saveStateToStorage();
  updateFullUI();
  startTimerCountdown();
}

function handleSaveSettings() {
  const newStudy = Number(studyInput.value);
  const newBreak = Number(breakInput.value);
  if (newStudy >= 1 && newBreak >= 1) {
    studyDuration = newStudy;
    breakDuration = newBreak;
    if (!isRunning) timeLeftSeconds = (currentMode === 'study' ? studyDuration : breakDuration) * 60;
    saveStateToStorage();
    updateFullUI();
  }
}

function handleResetSessionCount() {
  completedSessions = 0;
  if (sessionCount) sessionCount.textContent = completedSessions;
  saveStateToStorage();
}

function saveStateToStorage() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      studyDuration, breakDuration, completedSessions, currentMode, timeLeftSeconds, isRunning, timerEndTime
    });
  }
}

function updateFullUI() {
  updateTimerDisplay(timeLeftSeconds);
  updateModeBadge();
  updateButtonControls();
  if (sessionCount) sessionCount.textContent = completedSessions;
}

function updateTimerDisplay(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (timerDisplay) timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateModeBadge() {
  if (modeBadge) {
    modeBadge.textContent = currentMode === 'study' ? 'Study Session' : 'Break Session';
    modeBadge.className = currentMode === 'study' ? 'badge mode-study' : 'badge mode-break';
  }
}

function updateButtonControls() {
  if (startBtn) startBtn.disabled = isRunning;
  if (pauseBtn) pauseBtn.disabled = !isRunning;
}

function playCompletionSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (err) {}
}
