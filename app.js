"use strict";

/*
 * Parla con me — Italian Beginners Speaking Challenge
 * ------------------------------------------------------------------
 * To adapt the activity, edit the QUESTIONS array below. The challenge
 * gives up to QUESTION_DURATION_MS for each answer and always ends after
 * CHALLENGE_DURATION_MS of active (unpaused) speaking time.
 */

const CHALLENGE_DURATION_MS = 3 * 60 * 1000;
const QUESTION_DURATION_MS = 11 * 1000;
const END_OF_SPEECH_DELAY_MS = 1200;
const FAREWELL_WINDOW_MS = 12 * 1000;
const SPOKEN_INTRODUCTION =
  "Ciao! Sono Giulia. Parliamo in italiano. Ascolta, rispondi e puoi anche chiedermi: E tu? Cominciamo!";
const SPOKEN_FAREWELL =
  "Grazie mille per aver parlato con me e per aver praticato l’italiano. Hai fatto molto bene. A presto!";

const QUESTIONS = [
  { it: "Ciao, come stai?", en: "Hello, how are you?" },
  { it: "Come ti chiami?", en: "What is your name?" },
  { it: "Quanti anni hai?", en: "How old are you?" },
  { it: "Di dove sei?", en: "Where are you from?" },
  { it: "Dove abiti?", en: "Where do you live?" },
  { it: "Che cosa studi?", en: "What do you study?" },
  { it: "Hai fratelli o sorelle?", en: "Do you have brothers or sisters?" },
  { it: "Com’è la tua famiglia?", en: "What is your family like?" },
  { it: "Che cosa ti piace fare nel tempo libero?", en: "What do you like doing in your free time?" },
  { it: "Ti piace la musica?", en: "Do you like music?" },
  { it: "Che cosa mangi di solito?", en: "What do you normally eat?" },
  { it: "Che cosa bevi di solito?", en: "What do you normally drink?" },
  { it: "Com’è la tua città?", en: "What is your city like?" },
  { it: "Che cosa fai la mattina?", en: "What do you do in the morning?" },
  { it: "Che cosa fai nel fine settimana?", en: "What do you do at weekends?" },
  { it: "Descrivi un posto che ti piace nella tua città.", en: "Describe a place you like in your city." }
];

const ENCOURAGEMENTS = ["Molto bene!", "Eccellente!", "Continua!", "Ottimo tentativo!"];
const ITALIAN_FEMALE_VOICE_NAMES = [
  "elsa", "alice", "federica", "paola", "lucia", "giulia", "bianca",
  "isabella", "vittoria", "carla", "female", "donna"
];
const ITALIAN_LOCALES = ["it-it", "it-ch", "it"];

// Giulia's simple A1 profile lets her answer the student's questions consistently.
const GIULIA_PROFILE = {
  name: "Mi chiamo Giulia.",
  age: "Ho ventidue anni.",
  origin: "Sono italiana, di Bologna.",
  home: "Abito a Bologna.",
  studies: "Studio lingue all’università.",
  siblings: "Sì, ho una sorella.",
  family: "La mia famiglia è piccola e molto allegra.",
  freeTime: "Nel tempo libero ascolto musica e cammino nel parco.",
  music: "Sì, mi piace molto la musica italiana.",
  food: "Di solito mangio pasta, verdure e frutta.",
  drink: "Di solito bevo acqua e caffè.",
  city: "La mia città è bella, vivace e interessante.",
  morning: "La mattina faccio colazione e vado all’università.",
  weekend: "Nel fine settimana vedo gli amici e mi rilasso.",
  place: "Mi piace il parco vicino a casa mia. È verde e tranquillo."
};

// Interface elements
const welcomeScreen = document.querySelector("#welcomeScreen");
const gameScreen = document.querySelector("#gameScreen");
const completeScreen = document.querySelector("#completeScreen");
const startButton = document.querySelector("#startButton");
const repeatButton = document.querySelector("#repeatButton");
const skipButton = document.querySelector("#skipButton");
const pauseButton = document.querySelector("#pauseButton");
const stopButton = document.querySelector("#stopButton");
const downloadButton = document.querySelector("#downloadButton");
const permissionError = document.querySelector("#permissionError");
const cameraPreview = document.querySelector("#cameraPreview");
const recordedVideo = document.querySelector("#recordedVideo");
const questionText = document.querySelector("#questionText");
const translationText = document.querySelector("#translationText");
const questionNumber = document.querySelector("#questionNumber");
const timer = document.querySelector("#timer");
const answerTimer = document.querySelector("#answerTimer");
const progressBar = document.querySelector("#progressBar");
const progressTrack = document.querySelector(".progress-track");
const encouragement = document.querySelector("#encouragement");
const listeningStatus = document.querySelector("#listeningStatus");
const heardText = document.querySelector("#heardText");
const recordingState = document.querySelector("#recordingState");
const completeTitle = document.querySelector("#completeTitle");
const completeMessage = document.querySelector("#completeMessage");
const recordedDuration = document.querySelector("#recordedDuration");

let mediaStream = null;
let mediaRecorder = null;
let speechRecognition = null;
let audioContext = null;
let microphoneAnalyser = null;
let microphoneSamples = null;
let voiceActivityFrameId = 0;
let recordedChunks = [];
let recordingUrl = "";
let challengeSegmentStart = 0;
let challengeElapsedBeforePause = 0;
let questionSegmentStart = 0;
let questionElapsedBeforePause = 0;
let currentQuestionIndex = 0;
let questionsShown = 0;
let animationFrameId = 0;
let questionTimeoutId = 0;
let speechSilenceTimeoutId = 0;
let encouragementTimeoutId = 0;
let challengeFinished = false;
let challengePaused = false;
let answerHandled = false;
let selectedFemaleVoice = null;
let completeTranscript = "";
let latestTranscript = "";
let recognitionIsActive = false;
let recognitionRestartTimerId = 0;
let studentSpeechStarted = false;
let speechStartedAt = 0;
let silenceStartedAt = 0;
let farewellInProgress = false;

function showScreen(screen) {
  [welcomeScreen, gameScreen, completeScreen].forEach((item) => {
    item.classList.toggle("active", item === screen);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getSupportedMimeType() {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function startChallenge() {
  permissionError.hidden = true;
  startButton.disabled = true;
  startButton.textContent = "Richiesta di accesso…";

  if (window.location.protocol === "file:") {
    showPermissionError(
      "Per usare il dialogo parlato, apri l’attività tramite http://localhost e non direttamente come file."
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showPermissionError(
      "Questo browser non supporta la registrazione. Usa una versione recente di Chrome, Edge, Firefox o Safari."
    );
    return;
  }

  try {
    selectedFemaleVoice = await loadFemaleItalianVoice();
    if (!selectedFemaleVoice) {
      showPermissionError(
        "Non è disponibile una voce italiana femminile. Attiva una voce come Elsa, Alice o Federica e riprova."
      );
      return;
    }

    // The browser shows its own camera/microphone permission request here.
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true }
    });

    cameraPreview.srcObject = mediaStream;
    await cameraPreview.play();
    prepareVoiceActivityDetection();
    beginRecording();
  } catch (error) {
    console.error("Camera or microphone access failed:", error);
    showPermissionError(
      "Per questa attività servono la videocamera e il microfono. Controlla i permessi del browser e riprova."
    );
  }
}

function showPermissionError(message) {
  permissionError.textContent = message;
  permissionError.hidden = false;
  startButton.disabled = false;
  startButton.innerHTML = 'Riprova <span aria-hidden="true">→</span>';
}

function beginRecording() {
  recordedChunks = [];
  const mimeType = getSupportedMimeType();
  const options = mimeType ? { mimeType } : undefined;

  mediaRecorder = new MediaRecorder(mediaStream, options);
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  });
  mediaRecorder.addEventListener("stop", preparePlayback);
  mediaRecorder.start(1000);

  challengeFinished = false;
  challengePaused = false;
  farewellInProgress = false;
  challengeElapsedBeforePause = 0;
  questionElapsedBeforePause = 0;
  challengeSegmentStart = performance.now();
  currentQuestionIndex = 0;
  questionsShown = 0;
  pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pausa';
  recordingState.textContent = "REC";
  showScreen(gameScreen);
  playIntroduction();
  animationFrameId = requestAnimationFrame(updateTimers);
}

function playIntroduction() {
  clearTimeout(questionTimeoutId);
  stopListening();
  answerHandled = true;
  questionNumber.textContent = "Introduzione";
  questionText.textContent = "Ciao! Sono Giulia.";
  translationText.textContent =
    "Ascolta, rispondi in italiano e chiedi “E tu?” se vuoi una risposta da Giulia.";
  answerTimer.textContent = "Pronto";
  heardText.textContent = "";
  setListeningStatus("Giulia spiega l’attività…", false);

  speakText(SPOKEN_INTRODUCTION, () => {
    if (!challengeFinished && !challengePaused) {
      showQuestion(0, false);
    }
  });
}

function showQuestion(index, showPraise = true) {
  clearTimeout(questionTimeoutId);
  clearTimeout(speechSilenceTimeoutId);
  stopListening();
  window.speechSynthesis?.cancel();

  currentQuestionIndex = ((index % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  questionsShown += 1;
  questionElapsedBeforePause = 0;
  questionSegmentStart = performance.now();
  answerHandled = false;
  completeTranscript = "";
  latestTranscript = "";

  const question = QUESTIONS[currentQuestionIndex];
  questionText.textContent = question.it;
  translationText.textContent = question.en;
  questionNumber.textContent = `Domanda ${questionsShown}`;
  answerTimer.textContent = "11s";
  heardText.textContent = "";
  setListeningStatus("Giulia sta parlando…", false);

  if (showPraise) showEncouragement();
  speakText(question.it, () => {
    if (!challengeFinished && !challengePaused && !answerHandled) startListening();
  });

  scheduleAnswerTimeout(QUESTION_DURATION_MS);
}

function findFemaleItalianVoice() {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((voice) => {
      const language = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return (
        ITALIAN_LOCALES.some((locale) => language.startsWith(locale)) &&
        ITALIAN_FEMALE_VOICE_NAMES.some((femaleName) => name.includes(femaleName))
      );
    }) ||
    voices.find((voice) => {
      const language = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return (
        language.startsWith("it") &&
        ITALIAN_FEMALE_VOICE_NAMES.some((femaleName) => name.includes(femaleName))
      );
    }) ||
    null
  );
}

function loadFemaleItalianVoice() {
  if (!("speechSynthesis" in window)) return Promise.resolve(null);

  const availableVoice = findFemaleItalianVoice();
  if (availableVoice) return Promise.resolve(availableVoice);

  // Chrome often loads its voice list asynchronously.
  return new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(findFemaleItalianVoice());
    };
    const handleVoicesChanged = () => finish();
    speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    window.setTimeout(finish, 1800);
  });
}

function speakText(text, onEnd = () => {}) {
  if (!("speechSynthesis" in window) || !selectedFemaleVoice) {
    onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = 0.9;
  utterance.pitch = 1.04;

  // Every spoken line uses the same verified female voice.
  utterance.voice = selectedFemaleVoice;

  let callbackUsed = false;
  const finishSpeaking = () => {
    if (callbackUsed) return;
    callbackUsed = true;
    onEnd();
  };
  utterance.addEventListener("end", finishSpeaking);
  utterance.addEventListener("error", finishSpeaking);
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function createSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = "it-IT";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("result", (event) => {
    let interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const words = event.results[index][0]?.transcript?.trim() || "";
      if (event.results[index].isFinal) {
        completeTranscript = `${completeTranscript} ${words}`.trim();
      } else {
        interimTranscript = `${interimTranscript} ${words}`.trim();
      }
    }

    latestTranscript = `${completeTranscript} ${interimTranscript}`.trim();
    if (!latestTranscript) return;

    // Keep imperfect automatic transcription hidden from the student.
    heardText.textContent = "";
    setListeningStatus("Ascolto…", true);

    // Silence after speech—not the full answer allowance—ends the turn.
    clearTimeout(speechSilenceTimeoutId);
    speechSilenceTimeoutId = window.setTimeout(() => {
      handleAnswer(latestTranscript);
    }, END_OF_SPEECH_DELAY_MS);
  });
  recognition.addEventListener("start", () => {
    recognitionIsActive = true;
  });
  recognition.addEventListener("end", () => {
    recognitionIsActive = false;
    if (shouldContinueListening()) {
      // Chrome can end recognition after a short silence before speech begins.
      recognitionRestartTimerId = window.setTimeout(startSpeechRecognition, 180);
    }
  });
  recognition.addEventListener("error", (event) => {
    // Transcription is optional. Voice-level detection continues locally.
    console.debug("Optional speech recognition stopped:", event.error);
  });

  return recognition;
}

function startListening() {
  if (challengeFinished || challengePaused || answerHandled) return;

  studentSpeechStarted = false;
  speechStartedAt = 0;
  silenceStartedAt = 0;
  setListeningStatus("Ascolto… Parla in italiano.", true);
  startVoiceActivityDetection();
  startSpeechRecognition();
}

function startSpeechRecognition() {
  if (challengeFinished || challengePaused || answerHandled || recognitionIsActive) return;

  if (!speechRecognition) speechRecognition = createSpeechRecognition();
  if (!speechRecognition) return;

  try {
    speechRecognition.start();
  } catch (error) {
    // Some browsers throw if recognition is already starting.
    console.debug("Speech recognition is already active.", error);
  }
}

function prepareVoiceActivityDetection() {
  if (!mediaStream || audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(mediaStream);
  microphoneAnalyser = audioContext.createAnalyser();
  microphoneAnalyser.fftSize = 1024;
  microphoneAnalyser.smoothingTimeConstant = 0.2;
  microphoneSamples = new Uint8Array(microphoneAnalyser.fftSize);
  source.connect(microphoneAnalyser);
}

function startVoiceActivityDetection() {
  cancelAnimationFrame(voiceActivityFrameId);
  if (!microphoneAnalyser || !microphoneSamples) return;

  const detectVoice = (now) => {
    if (!shouldContinueListening()) return;

    microphoneAnalyser.getByteTimeDomainData(microphoneSamples);
    let sumSquares = 0;
    for (const sample of microphoneSamples) {
      const normalised = (sample - 128) / 128;
      sumSquares += normalised * normalised;
    }
    const volume = Math.sqrt(sumSquares / microphoneSamples.length);
    const speaking = volume > 0.025;

    if (speaking) {
      silenceStartedAt = 0;
      if (!speechStartedAt) speechStartedAt = now;
      if (!studentSpeechStarted && now - speechStartedAt > 120) {
        studentSpeechStarted = true;
        setListeningStatus("Ti ascolto…", true);
      }
    } else {
      speechStartedAt = 0;
      if (studentSpeechStarted) {
        if (!silenceStartedAt) silenceStartedAt = now;
        if (now - silenceStartedAt >= END_OF_SPEECH_DELAY_MS) {
          handleAnswer(latestTranscript || "__voice_detected__");
          return;
        }
      }
    }

    voiceActivityFrameId = requestAnimationFrame(detectVoice);
  };

  voiceActivityFrameId = requestAnimationFrame(detectVoice);
}

function shouldContinueListening() {
  return (
    !challengeFinished &&
    !challengePaused &&
    !answerHandled &&
    getQuestionElapsed() < QUESTION_DURATION_MS
  );
}

function stopListening() {
  cancelAnimationFrame(voiceActivityFrameId);
  clearTimeout(speechSilenceTimeoutId);
  clearTimeout(recognitionRestartTimerId);
  if (!speechRecognition) return;
  try {
    if (recognitionIsActive) speechRecognition.stop();
  } catch (error) {
    console.debug("Speech recognition was not active.", error);
  }
}

function setListeningStatus(message, isListening) {
  listeningStatus.lastChild.textContent = ` ${message}`;
  listeningStatus.classList.toggle("listening", isListening);
  listeningStatus.classList.toggle("paused", challengePaused);
}

function handleAnswer(transcript) {
  if (answerHandled || challengeFinished || challengePaused) return;
  answerHandled = true;
  clearTimeout(questionTimeoutId);
  clearTimeout(speechSilenceTimeoutId);
  questionElapsedBeforePause = getQuestionElapsed();
  stopListening();

  heardText.textContent = "";
  answerTimer.textContent = "Fatto";
  const reply = transcript
    ? createDialogueReply(transcript, currentQuestionIndex)
    : "";
  if (!reply) {
    answerHandled = false;
    setListeningStatus("Ascolto… Parla quando sei pronto.", true);
    startListening();
    return;
  }
  const shouldSayGoodbye = getChallengeRemaining() <= FAREWELL_WINDOW_MS;
  const spokenReply = shouldSayGoodbye ? `${reply} ${SPOKEN_FAREWELL}` : reply;
  setListeningStatus(
    shouldSayGoodbye
      ? `Giulia risponde e saluta: ${spokenReply}`
      : `Giulia risponde: ${reply}`,
    false
  );
  showEncouragement();

  if (shouldSayGoodbye) farewellInProgress = true;
  speakText(spokenReply, () => {
    if (challengeFinished || challengePaused) return;
    if (shouldSayGoodbye) {
      farewellInProgress = false;
      finishChallenge();
      return;
    }
    questionTimeoutId = window.setTimeout(() => {
      if (getChallengeRemaining() <= FAREWELL_WINDOW_MS) {
        playFarewell();
      } else {
        showQuestion(currentQuestionIndex + 1, false);
      }
    }, 450);
  });
}

function playFarewell() {
  if (challengeFinished || challengePaused || farewellInProgress) return;
  farewellInProgress = true;
  clearTimeout(questionTimeoutId);
  stopListening();
  answerHandled = true;
  questionNumber.textContent = "Saluto finale";
  questionText.textContent = "Grazie mille!";
  translationText.textContent = "Grazie per aver parlato con me. A presto!";
  answerTimer.textContent = "Fatto";
  setListeningStatus(`Giulia saluta: ${SPOKEN_FAREWELL}`, false);

  speakText(SPOKEN_FAREWELL, () => {
    farewellInProgress = false;
    finishChallenge();
  });
}

function normalizeItalian(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function answerStudentQuestion(text, currentPromptIndex) {
  const asksBack = containsAny(text, ["e tu", "e lei", "tu invece", "anche tu"]);
  if (asksBack) {
    return [
      "Sto molto bene, grazie.",
      GIULIA_PROFILE.name,
      GIULIA_PROFILE.age,
      GIULIA_PROFILE.origin,
      GIULIA_PROFILE.home,
      GIULIA_PROFILE.studies,
      GIULIA_PROFILE.siblings,
      GIULIA_PROFILE.family,
      GIULIA_PROFILE.freeTime,
      GIULIA_PROFILE.music,
      GIULIA_PROFILE.food,
      GIULIA_PROFILE.drink,
      GIULIA_PROFILE.city,
      GIULIA_PROFILE.morning,
      GIULIA_PROFILE.weekend,
      GIULIA_PROFILE.place
    ][currentPromptIndex];
  }

  // Also answer supported questions even when the student asks them out of order.
  if (containsAny(text, ["come stai", "come va"])) return "Sto molto bene, grazie. E tu?";
  if (containsAny(text, ["come ti chiami", "qual e il tuo nome"])) return `${GIULIA_PROFILE.name} E tu?`;
  if (containsAny(text, ["quanti anni hai", "che eta hai"])) return GIULIA_PROFILE.age;
  if (containsAny(text, ["di dove sei", "da dove vieni"])) return GIULIA_PROFILE.origin;
  if (containsAny(text, ["dove abiti", "dove vivi"])) return GIULIA_PROFILE.home;
  if (containsAny(text, ["che cosa studi", "cosa studi"])) return GIULIA_PROFILE.studies;
  if (containsAny(text, ["hai fratelli", "hai sorelle"])) return GIULIA_PROFILE.siblings;
  if (containsAny(text, ["com e la tua famiglia", "come la tua famiglia"])) return GIULIA_PROFILE.family;
  if (containsAny(text, ["tempo libero", "cosa ti piace fare"])) return GIULIA_PROFILE.freeTime;
  if (containsAny(text, ["ti piace la musica", "quale musica"])) return GIULIA_PROFILE.music;
  if (containsAny(text, ["cosa mangi", "cibo preferito"])) return GIULIA_PROFILE.food;
  if (containsAny(text, ["cosa bevi", "bevanda preferita"])) return GIULIA_PROFILE.drink;
  if (containsAny(text, ["com e la tua citta", "come la tua citta"])) return GIULIA_PROFILE.city;
  if (containsAny(text, ["cosa fai la mattina"])) return GIULIA_PROFILE.morning;
  if (containsAny(text, ["cosa fai nel fine settimana", "weekend"])) return GIULIA_PROFILE.weekend;
  if (containsAny(text, ["posto ti piace", "posto preferito"])) return GIULIA_PROFILE.place;
  return "";
}

function createDialogueReply(transcript, promptIndex) {
  const text = normalizeItalian(transcript);
  const directAnswer = answerStudentQuestion(text, promptIndex);

  // Use broad meaning only. Never repeat names, numbers, places or phrases
  // from an imperfect browser transcription.
  const reactions = [
    containsAny(text, ["molto bene", "bene", "felice", "contento", "contenta"])
      ? "Mi fa piacere! Anch’io sto molto bene."
      : containsAny(text, ["male", "stanco", "stanca", "triste"])
        ? "Mi dispiace. Spero che tu stia meglio presto."
        : "Grazie per la risposta. Io sto molto bene.",
    `Piacere! ${GIULIA_PROFILE.name}`,
    `Molto bene! ${GIULIA_PROFILE.age}`,
    `Che interessante! ${GIULIA_PROFILE.origin}`,
    `Bene! ${GIULIA_PROFILE.home}`,
    `Che interessante! ${GIULIA_PROFILE.studies}`,
    containsAny(text, ["non ho", "figlio unico", "figlia unica"])
      ? "Capisco. Io ho una sorella."
      : containsAny(text, ["fratello", "fratelli", "sorella", "sorelle"])
        ? "Che bello! Io ho una sorella."
        : `Grazie per la risposta. ${GIULIA_PROFILE.siblings}`,
    containsAny(text, ["grande"])
      ? "Che bello! La mia famiglia è piccola e molto allegra."
      : containsAny(text, ["piccola", "piccolo"])
        ? "Che bello! Anche la mia famiglia è piccola."
        : `Bella descrizione! ${GIULIA_PROFILE.family}`,
    `Sembra divertente! ${GIULIA_PROFILE.freeTime}`,
    containsAny(text, ["non mi piace"])
      ? "Capisco. A me piace la musica italiana."
      : containsAny(text, ["mi piace", "si"])
        ? "Che bello! A me piace la musica italiana."
        : GIULIA_PROFILE.music,
    `Che buono! ${GIULIA_PROFILE.food}`,
    `Molto bene. ${GIULIA_PROFILE.drink}`,
    containsAny(text, ["grande", "piccola", "piccolo", "bella", "bello", "tranquilla", "tranquillo", "vivace"])
      ? "Che interessante! La mia città è bella e vivace."
      : `Sembra interessante! ${GIULIA_PROFILE.city}`,
    `Ottima routine! ${GIULIA_PROFILE.morning}`,
    `Che bel programma! ${GIULIA_PROFILE.weekend}`,
    containsAny(text, ["parco", "museo", "ristorante", "bar", "spiaggia", "centro"])
      ? `Che bel posto! ${GIULIA_PROFILE.place}`
      : `Mi piacerebbe visitarlo! ${GIULIA_PROFILE.place}`
  ];

  if (directAnswer) {
    const asksOnlyQuestion = text.split(" ").length <= 4;
    return asksOnlyQuestion ? directAnswer : reactions[promptIndex];
  }
  return reactions[promptIndex];
}

function scheduleAnswerTimeout(delay) {
  clearTimeout(questionTimeoutId);
  questionTimeoutId = window.setTimeout(() => {
    if (latestTranscript || studentSpeechStarted) {
      handleAnswer(latestTranscript || "__voice_detected__");
      return;
    }

    // Do not invent an irrelevant answer when no transcript exists.
    // Repeat the same prompt and listen again while the three-minute clock continues.
    answerHandled = false;
    questionElapsedBeforePause = 0;
    questionSegmentStart = performance.now();
    setListeningStatus("Giulia ripete la domanda per ascoltare la tua risposta…", false);
    speakText(QUESTIONS[currentQuestionIndex].it, startListening);
    scheduleAnswerTimeout(QUESTION_DURATION_MS);
  }, Math.max(0, delay));
}

function showEncouragement() {
  clearTimeout(encouragementTimeoutId);
  const phrase = ENCOURAGEMENTS[(questionsShown - 2) % ENCOURAGEMENTS.length];
  encouragement.textContent = phrase;
  encouragement.classList.add("show");
  encouragementTimeoutId = window.setTimeout(() => {
    encouragement.classList.remove("show");
  }, 1800);
}

function updateTimers(now) {
  if (challengeFinished || challengePaused) return;

  const elapsed = getChallengeElapsed(now);
  const remaining = Math.max(0, CHALLENGE_DURATION_MS - elapsed);
  const questionElapsed = getQuestionElapsed(now);
  const questionRemaining = Math.max(0, QUESTION_DURATION_MS - questionElapsed);

  timer.textContent = formatTime(remaining);
  if (!answerHandled) {
    answerTimer.textContent = `${Math.ceil(questionRemaining / 1000)}s`;
  }

  const progress = Math.min(100, (elapsed / CHALLENGE_DURATION_MS) * 100);
  progressBar.style.width = `${progress}%`;
  progressTrack.setAttribute("aria-valuenow", String(Math.floor(elapsed / 1000)));

  if (remaining <= 0) {
    timer.textContent = "00:00";
    if (farewellInProgress) return;
    if (studentSpeechStarted && !answerHandled) {
      handleAnswer(latestTranscript || "__voice_detected__");
    } else {
      playFarewell();
    }
    return;
  }

  animationFrameId = requestAnimationFrame(updateTimers);
}

function getChallengeElapsed(now = performance.now()) {
  return challengeElapsedBeforePause + (challengePaused ? 0 : now - challengeSegmentStart);
}

function getChallengeRemaining(now = performance.now()) {
  return Math.max(0, CHALLENGE_DURATION_MS - getChallengeElapsed(now));
}

function getQuestionElapsed(now = performance.now()) {
  return questionElapsedBeforePause + (challengePaused ? 0 : now - questionSegmentStart);
}

function formatTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function finishChallenge(stoppedEarly = false) {
  if (challengeFinished) return;
  const elapsed = Math.min(CHALLENGE_DURATION_MS, getChallengeElapsed());
  challengeFinished = true;
  clearTimeout(questionTimeoutId);
  clearTimeout(speechSilenceTimeoutId);
  clearTimeout(recognitionRestartTimerId);
  clearTimeout(encouragementTimeoutId);
  cancelAnimationFrame(animationFrameId);
  stopListening();
  window.speechSynthesis?.cancel();

  if (!stoppedEarly) {
    timer.textContent = "00:00";
    progressBar.style.width = "100%";
  progressTrack.setAttribute("aria-valuenow", "180");
    completeTitle.textContent = "Complimenti!";
    completeMessage.textContent = "Hai completato la sfida di conversazione.";
  } else {
    completeTitle.textContent = "Sessione terminata";
    completeMessage.textContent = "La registrazione è terminata ed è pronta per essere riascoltata.";
  }
  recordedDuration.textContent = formatTimeFloor(elapsed);

  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
  if (mediaRecorder?.state !== "inactive") {
    mediaRecorder.stop();
  } else {
    preparePlayback();
  }

  mediaStream?.getTracks().forEach((track) => track.stop());
  audioContext?.close();
  audioContext = null;
  microphoneAnalyser = null;
  microphoneSamples = null;
  cameraPreview.srcObject = null;
  showScreen(completeScreen);
}

function togglePause() {
  if (challengeFinished) return;

  if (!challengePaused) {
    const now = performance.now();
    challengeElapsedBeforePause += now - challengeSegmentStart;
    questionElapsedBeforePause += now - questionSegmentStart;
    challengePaused = true;

    clearTimeout(questionTimeoutId);
    clearTimeout(speechSilenceTimeoutId);
    clearTimeout(recognitionRestartTimerId);
    cancelAnimationFrame(animationFrameId);
    stopListening();
    window.speechSynthesis?.cancel();
    if (mediaRecorder?.state === "recording") mediaRecorder.pause();

    pauseButton.innerHTML = '<span aria-hidden="true">▶</span> Riprendi';
    recordingState.textContent = "PAUSA";
    setListeningStatus("Attività in pausa.", false);
    answerTimer.textContent = `${Math.ceil(
      Math.max(0, QUESTION_DURATION_MS - questionElapsedBeforePause) / 1000
    )}s`;
    return;
  }

  challengePaused = false;
  challengeSegmentStart = performance.now();
  questionSegmentStart = performance.now();
  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
  pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pausa';
  recordingState.textContent = "REC";

  const questionRemaining = Math.max(0, QUESTION_DURATION_MS - questionElapsedBeforePause);
  if (questionRemaining <= 0) {
    handleAnswer("");
  } else {
    setListeningStatus("Giulia ripete la domanda…", false);
    speakText(QUESTIONS[currentQuestionIndex].it, startListening);
    scheduleAnswerTimeout(questionRemaining);
  }
  animationFrameId = requestAnimationFrame(updateTimers);
}

function preparePlayback() {
  if (!recordedChunks.length) return;

  const mimeType = mediaRecorder?.mimeType || "video/webm";
  const blob = new Blob(recordedChunks, { type: mimeType });

  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = URL.createObjectURL(blob);
  recordedVideo.src = recordingUrl;

  downloadButton.onclick = () => {
    const link = document.createElement("a");
    link.href = recordingUrl;
    link.download = `Italian_Beginners_Speaking_Challenge_${getDateStamp()}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
}

function formatTimeFloor(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

startButton.addEventListener("click", startChallenge);
repeatButton.addEventListener("click", () => {
  if (challengePaused || challengeFinished) return;
  stopListening();
  answerHandled = false;
  completeTranscript = "";
  latestTranscript = "";
  questionElapsedBeforePause = 0;
  questionSegmentStart = performance.now();
  clearTimeout(questionTimeoutId);
  heardText.textContent = "";
  setListeningStatus("Giulia ripete la domanda…", false);
  speakText(QUESTIONS[currentQuestionIndex].it, startListening);
  scheduleAnswerTimeout(QUESTION_DURATION_MS);
});
skipButton.addEventListener("click", () => {
  if (challengePaused || challengeFinished) return;
  showQuestion(currentQuestionIndex + 1);
});
pauseButton.addEventListener("click", togglePause);
stopButton.addEventListener("click", () => finishChallenge(true));

// Stop the camera if the page is closed during the challenge.
window.addEventListener("beforeunload", () => {
  mediaStream?.getTracks().forEach((track) => track.stop());
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
});
