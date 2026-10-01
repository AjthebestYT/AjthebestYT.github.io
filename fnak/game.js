const state = {
  currentScreen: 'intro',
  currentNight: 1,
  currentCamera: 1,
  threatCamera: 1,
  camerasOpen: false,
  power: 100,
  musicBox: 100,
  musicBoxJumpscareCountdown: 0,
  kirkMoveCooldown: 0,
  minutesPastMidnight: 0,
  gameStarted: false,
  endGame: false,
  isNightActive: false,
  doorClosed: false,
  saveKey: 'fivenightsatkirks-save',
  maxNight: 5,
  cameraEnemyMap: {
    0: { isActive: false, image: 'cam 0   100 percent filled.jpg', threatImage: 'cam 0   100 percent filled.jpg' },
    1: { isActive: false, image: 'cam1nokirk.jpg', threatImage: 'cam1withkirk.jpg' },
    2: { isActive: false, image: 'cam2nokirk.jpg', threatImage: 'cam2withkirk.jpg' },
    3: { isActive: false, image: 'cam3nokirk.jpg', threatImage: 'cam3withkirk.jpg' },
    4: { isActive: false, image: 'cam4nokirk.jpg', threatImage: 'cam4withkirk.jpg' },
    5: { isActive: false, image: 'cam5nokirkday1.jpg', threatImage: 'cam5withkirk.png' },
    6: { isActive: false, image: 'cam6nokirk.jpg', threatImage: 'cam6withkirk.jpg' },
  },
};

const elements = {
  introScreen: document.getElementById('intro-screen'),
  gameScreen: document.getElementById('game-screen'),
  introVideo: document.getElementById('intro-video'),
  startButton: document.getElementById('start-button'),
  continueButton: document.getElementById('continue-button'),
  nightLabel: document.getElementById('night-label'),
  clockLabel: document.getElementById('clock-label'),
  powerLabel: document.getElementById('power-label'),
  powerFill: document.getElementById('power-fill'),
  musicBoxValue: document.getElementById('music-box-value'),
  statusIndicator: document.getElementById('status-indicator'),
  cameraOverlay: document.getElementById('camera-overlay'),
  cameraImage: document.getElementById('camera-image'),
  cameraButtons: [...document.querySelectorAll('.camera-select-btn')],
  closeCamera: document.getElementById('close-camera'),
  cameraButton: document.getElementById('camera-button'),
  musicBoxButton: document.getElementById('music-box-button'),
  rightDoorButton: document.getElementById('right-door-button'),
  restartButton: document.getElementById('restart-button'),
  door: document.getElementById('door'),
  nightBanner: document.getElementById('night-banner'),
  jumpscareVideo: document.getElementById('jumpscare-video'),
  gameoverVideo: document.getElementById('gameover-video'),
  cameraStatusToast: document.getElementById('camera-status-toast'),
};

const NIGHT_LENGTH_MINUTES = 360;
const AI_ATTACK_DELAY = 60;
const AI_SEQUENCE = [1, 2, 3, 4, 5, 6];
const LATER_NIGHT_CAMERA_DISABLE_TICKS = 12;
const KIRK_MOVE_DELAYS = [18, 14, 10, 7, 4];
const CAM6_ATTACK_TICKS = 22;
const MUSIC_BOX_DRAIN_PER_SECOND = 0.85 + (state.currentNight - 1) * 0.25;
const MUSIC_BOX_WIND_PER_SECOND = 5.5;
let nightInterval = null;
let audioContext = null;
let camera6WarningTimer = 0;
let cameraDisableTimer = 0;
let musicBoxAudio = null;
let isHoldingMusicBox = false;
let musicBoxWindTick = 0;
let jumpscareTimer = null;
let camera6DoorHoldTimer = 0;
let introAudioUnlocked = false;

function saveGame() {
  try {
    const saveData = {
      currentNight: state.currentNight,
      currentCamera: state.currentCamera,
      threatCamera: state.threatCamera,
      camerasOpen: state.camerasOpen,
      power: state.power,
      musicBox: state.musicBox,
      minutesPastMidnight: state.minutesPastMidnight,
      gameStarted: state.gameStarted,
      endGame: state.endGame,
      isNightActive: state.isNightActive,
      doorClosed: state.doorClosed,
      kirkMoveCooldown: state.kirkMoveCooldown,
      cameraDisableTimer,
      camera6DoorHoldTimer,
    };
    localStorage.setItem(state.saveKey, JSON.stringify(saveData));
  } catch {
    // localStorage can fail in restricted environments.
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(state.saveKey);
    if (!raw) return;

    const saveData = JSON.parse(raw);
    state.currentNight = saveData.currentNight || 1;
    state.currentCamera = saveData.currentCamera || 1;
    state.threatCamera = saveData.threatCamera || 1;
    state.camerasOpen = !!saveData.camerasOpen;
    state.power = saveData.power ?? 100;
    state.musicBox = saveData.musicBox ?? 100;
    state.minutesPastMidnight = saveData.minutesPastMidnight ?? 0;
    state.gameStarted = !!saveData.gameStarted;
    state.endGame = !!saveData.endGame;
    state.isNightActive = !!saveData.isNightActive;
    state.doorClosed = !!saveData.doorClosed;
    state.kirkMoveCooldown = saveData.kirkMoveCooldown ?? getKirkMoveDelay(state.currentNight);
    cameraDisableTimer = saveData.cameraDisableTimer ?? 0;
    camera6DoorHoldTimer = saveData.camera6DoorHoldTimer ?? 0;
  } catch {
    localStorage.removeItem(state.saveKey);
  }
}

function setCurrentScreen(screen) {
  state.currentScreen = screen;
  elements.introScreen.classList.toggle('active', screen === 'intro');
  elements.gameScreen.classList.toggle('active', screen === 'game');

  if (screen === 'game' && elements.introVideo) {
    elements.introVideo.pause();
  }
}

function updateIntroButtons() {
  const rawSave = localStorage.getItem(state.saveKey);
  const hasSaved = !!rawSave;
  elements.continueButton.classList.toggle('hidden', !hasSaved);
}

function unlockIntroVideoAudio() {
  if (introAudioUnlocked || !elements.introVideo) return;

  introAudioUnlocked = true;
  elements.introVideo.muted = false;
  elements.introVideo.volume = 1;
  elements.introVideo.play().catch(() => {
    elements.introVideo.muted = true;
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatClock(totalMinutes) {
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const displayHour = totalHours % 12 === 0 ? 12 : totalHours % 12;
  const isAm = totalHours < 12;
  return `${pad(displayHour)}:${pad(minutes)} ${isAm ? 'AM' : 'PM'}`;
}

function updateHud() {
  elements.nightLabel.textContent = state.currentNight;
  elements.clockLabel.textContent = formatClock(state.minutesPastMidnight);
  elements.powerLabel.textContent = `${Math.max(0, Math.round(state.power))}%`;
  elements.powerFill.style.width = `${Math.max(0, state.power)}%`;
  elements.musicBoxValue.textContent = cameraDisableTimer > 0 ? '??%' : `${Math.max(0, Math.round(state.musicBox))}%`;

  let doorState = state.doorClosed ? 'Door Closed' : 'Door Open';
  if (cameraDisableTimer > 0) {
    doorState = 'Cams Disabled';
  }

  elements.statusIndicator.textContent = doorState;
  elements.statusIndicator.style.color = cameraDisableTimer > 0 ? '#ff8c69' : state.doorClosed ? '#64f5b2' : '#ffdb70';
}

function syncDoorVisuals() {
  elements.door.classList.toggle('closed', state.doorClosed);
  elements.door.classList.toggle('open', !state.doorClosed);
}

function refreshCam0Visual() {
  const cam0Images = [
    { min: 0, max: 25, image: 'cam 0   25 percent filled.jpg' },
    { min: 26, max: 50, image: 'cam0    50 percent filled.jpg' },
    { min: 51, max: 75, image: 'cam 0   75 percent  filled.jpg' },
    { min: 76, max: 100, image: 'cam0 100 percent filled.jpg' },
  ];

  const matchingCam0 = cam0Images.find((entry) => state.musicBox >= entry.min && state.musicBox <= entry.max) || cam0Images[0];
  state.cameraEnemyMap[0].image = matchingCam0.image;
  state.cameraEnemyMap[0].threatImage = matchingCam0.image;
}

function prepareNightAssets() {
  state.cameraEnemyMap[5].image = `cam5nokirkday${state.currentNight}.jpg`;
  state.cameraEnemyMap[5].isActive = false;
  refreshCam0Visual();

  Object.keys(state.cameraEnemyMap).forEach((key) => {
    const cameraNumber = Number(key);
    if (cameraNumber !== 5) {
      state.cameraEnemyMap[cameraNumber].isActive = false;
    }
  });
}

function refreshCameraFeed() {
  const camera = state.cameraEnemyMap[state.currentCamera];
  if (!camera) return;

  if (state.currentCamera === 0 && state.musicBox <= 0) {
    elements.cameraImage.src = 'cam 0   25 percent filled.jpg';
    elements.cameraImage.alt = 'Camera 0 unavailable';
    showCameraStatus('Camera 0 unavailable. Music box must be wound above 0% to use it.');
    return;
  }

  const imageName = state.currentCamera === state.threatCamera ? camera.threatImage : camera.image;
  elements.cameraImage.src = imageName;
  elements.cameraImage.alt = `Camera ${state.currentCamera} feed`;
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration = 0.06, volume = 0.03, type = 'square') {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

function playCameraSound() {
  playTone(440, 0.05, 0.018, 'square');
  setTimeout(() => playTone(660, 0.06, 0.018, 'triangle'), 40);
}

function playDoorSound() {
  playTone(210, 0.08, 0.022, 'sawtooth');
  setTimeout(() => playTone(180, 0.08, 0.02, 'triangle'), 70);
}

function showCameraStatus(message) {
  elements.cameraStatusToast.textContent = message;
  elements.cameraStatusToast.classList.remove('hidden');
  window.clearTimeout(showCameraStatus.timeoutId);
  showCameraStatus.timeoutId = window.setTimeout(() => {
    elements.cameraStatusToast.classList.add('hidden');
  }, 1400);
}

function playWarningSound() {
  playTone(260, 0.12, 0.025, 'sawtooth');
  setTimeout(() => playTone(220, 0.12, 0.02, 'square'), 90);
}

function setCameraSelection(cameraNumber) {
  state.currentCamera = cameraNumber;
  elements.cameraButtons.forEach((button) => {
    const isActive = Number(button.dataset.camera) === cameraNumber;
    button.classList.toggle('active', isActive);
  });
  if (cameraNumber === 0 && state.musicBox <= 0) {
    showCameraStatus('Camera 0 unavailable. Music box at 0%');
  }
  refreshCameraFeed();
}

function toggleCameraOverlay() {
  if (cameraDisableTimer > 0) {
    return;
  }

  state.camerasOpen = !state.camerasOpen;
  elements.cameraOverlay.classList.toggle('hidden', !state.camerasOpen);
  if (state.camerasOpen) {
    setCameraSelection(state.currentCamera);
  }
  saveGame();
}

function setDoorState(closed) {
  state.doorClosed = closed;

  if (closed && state.threatCamera === 6) {
    camera6DoorHoldTimer = Math.floor(Math.random() * 6) + 5;
    camera6WarningTimer = 0;
  }

  syncDoorVisuals();
  updateHud();
  saveGame();
}

function toggleDoor() {
  if (!state.isNightActive || state.endGame) return;
  setDoorState(!state.doorClosed);
}

function showBanner(text) {
  elements.nightBanner.textContent = text;
  elements.nightBanner.classList.remove('hidden');
  window.clearTimeout(showBanner.timeoutId);
  showBanner.timeoutId = window.setTimeout(() => {
    elements.nightBanner.classList.add('hidden');
  }, 1500);
}

function getKirkMoveDelay(night) {
  return KIRK_MOVE_DELAYS[Math.min(Math.max(night - 1, 0), KIRK_MOVE_DELAYS.length - 1)];
}

function updateThreatStates() {
  Object.values(state.cameraEnemyMap).forEach((camera) => {
    camera.isActive = false;
  });

  const cameraRange = [1, 2, 3, 4, 5, 6];
  const currentIndex = cameraRange.indexOf(state.threatCamera);
  const moveRoll = Math.random();

  if (currentIndex < cameraRange.length - 1 && moveRoll < 0.68) {
    state.threatCamera = cameraRange[currentIndex + 1];
  } else if (currentIndex > 0 && moveRoll < 0.86) {
    state.threatCamera = cameraRange[currentIndex - 1];
  } else {
    state.threatCamera = cameraRange[currentIndex];
  }

  state.cameraEnemyMap[state.threatCamera].isActive = true;

  state.cameraEnemyMap[5].image = `cam5nokirkday${state.currentNight}.jpg`;

  if (state.currentNight >= 4 && state.threatCamera === 5 && cameraDisableTimer === 0) {
    cameraDisableTimer = LATER_NIGHT_CAMERA_DISABLE_TICKS;
    state.camerasOpen = false;
    elements.cameraOverlay.classList.add('hidden');
  }

  if (state.threatCamera < 6) {
    camera6WarningTimer = 0;
  }
}

function triggerJumpscare() {
  if (state.endGame) return;

  state.isNightActive = false;
  state.endGame = true;
  clearInterval(nightInterval);

  elements.jumpscareVideo.muted = false;
  elements.jumpscareVideo.classList.remove('hidden');
  elements.jumpscareVideo.currentTime = 0;
  elements.jumpscareVideo.play();
  saveGame();

  elements.jumpscareVideo.onended = () => {
    elements.jumpscareVideo.classList.add('hidden');
    elements.gameoverVideo.muted = false;
    elements.gameoverVideo.classList.remove('hidden');
    elements.gameoverVideo.currentTime = 0;
    elements.gameoverVideo.play();

    elements.gameoverVideo.onended = () => {
      elements.gameoverVideo.pause();
      elements.gameoverVideo.classList.add('hidden');
      window.location.reload();
    };
  };
}

function triggerGameOver() {
  if (state.endGame) return;

  state.isNightActive = false;
  state.endGame = true;
  clearInterval(nightInterval);
  elements.gameoverVideo.muted = false;
  elements.gameoverVideo.classList.remove('hidden');
  elements.gameoverVideo.currentTime = 0;
  elements.gameoverVideo.play();
  saveGame();

  elements.gameoverVideo.onended = () => {
    elements.gameoverVideo.pause();
    elements.gameoverVideo.classList.add('hidden');
    window.location.reload();
  };
}

function resolveThreats() {
  if (state.threatCamera < 6) {
    camera6WarningTimer = 0;
    camera6DoorHoldTimer = 0;
    return;
  }

  if (!state.doorClosed) {
    camera6WarningTimer += 1;
    if (camera6WarningTimer >= CAM6_ATTACK_TICKS) {
      triggerJumpscare();
      return;
    }
  } else if (camera6DoorHoldTimer > 0) {
    camera6DoorHoldTimer -= 1;
    if (camera6DoorHoldTimer === 0) {
      state.threatCamera = 1;
      state.currentCamera = 1;
      camera6WarningTimer = 0;
      setCameraSelection(1);
    }
  } else {
    camera6DoorHoldTimer = Math.floor(Math.random() * 6) + 5;
  }
}

function startNightTimer() {
  clearInterval(nightInterval);

  nightInterval = window.setInterval(() => {
    if (!state.isNightActive || state.endGame) return;

    state.minutesPastMidnight += 1;

    if (state.minutesPastMidnight >= NIGHT_LENGTH_MINUTES) {
      endNight();
      return;
    }

    state.power = Math.max(0, state.power - 0.17);
    if (state.power <= 0) {
      triggerGameOver();
      return;
    }

    const boxDrainRate = 2.1 + (state.currentNight - 1) * 0.65;
    state.musicBox = Math.max(0, state.musicBox - boxDrainRate);

    refreshCam0Visual();

    if (state.musicBox > 0) {
      state.musicBoxJumpscareCountdown = 0;
    }

    if (state.musicBox <= 0) {
      if (state.musicBoxJumpscareCountdown === 0) {
        state.musicBoxJumpscareCountdown = 20;
      } else {
        state.musicBoxJumpscareCountdown = Math.max(0, state.musicBoxJumpscareCountdown - 1);
      }
    }

    if (state.musicBoxJumpscareCountdown === 0 && state.musicBox <= 0) {
      triggerJumpscare();
      return;
    }

    state.kirkMoveCooldown = Math.max(0, state.kirkMoveCooldown - 1);
    if (state.kirkMoveCooldown === 0) {
      updateThreatStates();
      state.kirkMoveCooldown = getKirkMoveDelay(state.currentNight);
    }

    if (state.musicBox <= 0 && state.currentCamera === 0) {
      state.currentCamera = 1;
      elements.cameraButtons.forEach((button) => {
        button.classList.toggle('active', Number(button.dataset.camera) === 1);
      });
      showCameraStatus('Camera 0 unavailable — music box depleted');
    }

    if (isHoldingMusicBox && state.musicBox < 100) {
      state.musicBox = Math.min(100, state.musicBox + 10);
      state.power = Math.max(0, state.power - 0.17);
      if (state.musicBox >= 100) {
        state.musicBox = 100;
      }
    }

    resolveThreats();

    if (state.currentNight >= 3 && cameraDisableTimer === 0 && state.camerasOpen && Math.random() < 0.03) {
      cameraDisableTimer = Math.floor(Math.random() * LATER_NIGHT_CAMERA_DISABLE_TICKS) + 8;
      state.camerasOpen = false;
      elements.cameraOverlay.classList.add('hidden');
    }

    if (cameraDisableTimer > 0) {
      cameraDisableTimer -= 1;
      state.camerasOpen = false;
      elements.cameraOverlay.classList.add('hidden');
    }

    if (state.camerasOpen) {
      refreshCameraFeed();
    }

    updateHud();
    saveGame();
  }, 900);
}

function endNight() {
  state.isNightActive = false;
  clearInterval(nightInterval);

  if (state.currentNight >= state.maxNight) {
    elements.nightBanner.textContent = 'You Survived';
    elements.nightBanner.classList.remove('hidden');
    state.endGame = true;
    state.gameStarted = false;
    saveGame();
    return;
  }

  state.currentNight += 1;
  state.minutesPastMidnight = 0;
  state.power = 100;
  state.kirkMoveCooldown = getKirkMoveDelay(state.currentNight);
  state.doorClosed = false;
  state.camerasOpen = false;
  elements.cameraOverlay.classList.add('hidden');
  prepareNightAssets();
  syncDoorVisuals();
  setCameraSelection(1);
  showBanner(`Night ${state.currentNight}`);
  updateHud();
  saveGame();

  window.setTimeout(() => {
    state.isNightActive = true;
    startNightTimer();
  }, 1500);
}

function startNightFlow() {
  state.isNightActive = true;
  state.endGame = false;
  state.gameStarted = true;
  state.power = 100;
  state.musicBox = 100;
  state.musicBoxJumpscareCountdown = 0;
  state.kirkMoveCooldown = getKirkMoveDelay(state.currentNight);
  state.minutesPastMidnight = 0;
  state.threatCamera = 1;
  state.doorClosed = false;
  state.camerasOpen = false;
  camera6WarningTimer = 0;
  cameraDisableTimer = 0;
  isHoldingMusicBox = false;
  elements.cameraOverlay.classList.add('hidden');
  prepareNightAssets();
  updateThreatStates();
  syncDoorVisuals();
  setCameraSelection(1);
  showBanner(`Night ${state.currentNight}`);
  updateHud();
  saveGame();
  startNightTimer();
}

function resumeNightFlow() {
  state.isNightActive = true;
  state.endGame = false;
  state.gameStarted = true;
  state.kirkMoveCooldown = Math.max(1, state.kirkMoveCooldown || getKirkMoveDelay(state.currentNight));
  elements.cameraOverlay.classList.toggle('hidden', !state.camerasOpen);
  syncDoorVisuals();
  setCameraSelection(state.currentCamera);
  updateHud();
  saveGame();
  startNightTimer();
}

function startNewRun() {
  state.currentNight = 1;
  state.minutesPastMidnight = 0;
  state.power = 100;
  state.musicBox = 100;
  state.musicBoxJumpscareCountdown = 0;
  state.kirkMoveCooldown = getKirkMoveDelay(state.currentNight);
  state.threatCamera = 1;
  state.doorClosed = false;
  state.camerasOpen = false;
  state.endGame = false;
  state.isNightActive = false;
  state.currentCamera = 1;
  camera6WarningTimer = 0;
  cameraDisableTimer = 0;
  isHoldingMusicBox = false;
  elements.cameraOverlay.classList.add('hidden');
  elements.jumpscareVideo.classList.add('hidden');
  elements.gameoverVideo.classList.add('hidden');
  setCurrentScreen('game');
  startNightFlow();
}

function restoreSavedState() {
  loadGame();
  prepareNightAssets();
  syncDoorVisuals();
  setCameraSelection(state.currentCamera);
  updateHud();
  updateIntroButtons();
  setCurrentScreen('intro');
}

function attachEvents() {
  elements.introScreen.addEventListener('pointerdown', unlockIntroVideoAudio, { once: true });
  elements.startButton.addEventListener('click', () => {
    ensureAudioContext();
    playCameraSound();
    startNewRun();
  });
  elements.continueButton.addEventListener('click', () => {
    ensureAudioContext();
    playCameraSound();
    loadGame();
    setCurrentScreen('game');
    resumeNightFlow();
  });
  elements.cameraButton.addEventListener('click', () => {
    ensureAudioContext();
    playCameraSound();
    toggleCameraOverlay();
  });
  elements.closeCamera.addEventListener('click', () => {
    ensureAudioContext();
    playCameraSound();
    state.camerasOpen = false;
    elements.cameraOverlay.classList.add('hidden');
    saveGame();
  });
  elements.rightDoorButton.addEventListener('click', () => {
    ensureAudioContext();
    playDoorSound();
    toggleDoor();
  });
  elements.cameraButtons.forEach((button) => {
    button.addEventListener('click', () => setCameraSelection(Number(button.dataset.camera)));
  });
  elements.musicBoxButton.addEventListener('pointerdown', () => {
    if (!state.isNightActive || state.endGame) return;
    isHoldingMusicBox = true;
    elements.musicBoxButton.textContent = 'Winding Music Box...';
    ensureAudioContext();
    if (musicBoxAudio) {
      musicBoxAudio.play();
    }
  });
  elements.musicBoxButton.addEventListener('pointerup', () => {
    isHoldingMusicBox = false;
    elements.musicBoxButton.textContent = 'Hold to Wind Music Box';
    if (musicBoxAudio) {
      musicBoxAudio.pause();
      musicBoxAudio.currentTime = 0;
    }
  });
  elements.musicBoxButton.addEventListener('pointerleave', () => {
    isHoldingMusicBox = false;
    elements.musicBoxButton.textContent = 'Hold to Wind Music Box';
    if (musicBoxAudio) {
      musicBoxAudio.pause();
      musicBoxAudio.currentTime = 0;
    }
  });
  elements.restartButton.addEventListener('click', startNewRun);
}

function init() {
  musicBoxAudio = new Audio('musicboxmusic.mp3');
  musicBoxAudio.loop = true;
  musicBoxAudio.volume = 0.7;

  elements.introVideo.muted = false;
  elements.introVideo.volume = 1;
  elements.introVideo.addEventListener('canplay', () => {
    elements.introVideo.play().catch(() => {});
  });

  attachEvents();
  restoreSavedState();
  elements.cameraImage.src = 'cam1nokirk.jpg';
  ensureAudioContext();
  elements.introVideo.play().catch(() => {});
}

init();
