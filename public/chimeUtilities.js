const EVENTS = Object.freeze({
  STATE: "state",
  HOST_CONTROLS: "host-controls",
  QUALITY: "quality",
  START: "app:start",
  STOP: "app:stop",
  VIDEO_TILE_UPDATE: "video:tile:update",
  VIDEO_TILE_REMOVE: "video:tile:remove",
  MUTE_ALL: "mute-all",
  MUTE_ATTENDEE: "mute-attendee",
  VIDEO_ATTENDEE: "video-attendee",
  ASSIGN_HOST: "assign-host",
  MEETING_DETAILS_UPDATE: "meeting-details-update",
  REACTION: "reaction",
});

const SELECTORS = Object.freeze({
  url: "[data-url]",
  perms: "[data-perms]",
  start: "[data-start]",
  stop: "[data-stop]",
  selVideo: "[data-video]",
  selAudio: "[data-audio]",
  selOutput: "[data-out]",
  preview: "[data-preview]",
  localVideo: "[data-local]",
  remotesWrap: "[data-remotes]",
  audioEl: "[data-audio-el]",
  status: "[data-status]",
  timer: "[data-timer]",
  quality: "[data-q]",
  roster: "[data-roster]",
  selfStatus: "[data-status-self]",
  mainVideo: "[data-main-video]",
  mainVideoStatus: "[data-main-video-status]",
  localVideoSidebar: "[data-local-video-sidebar]",
  toggleAudioBtn: "[data-toggle-audio]",
  toggleVideoBtn: "[data-toggle-video]",
  backgroundFilterSelect: "#background-filter-select",
  predefinedBackgrounds: "#predefined-backgrounds", 
  backgroundImageUrl: "#background-image-url",
  applyBackgroundFilter: "#apply-background-filter",
  hostControls: "#host-controls", // Changed from [data-host-controls] to #host-controls
  muteAll: "#mute-all", // Changed from [data-mute-all] to #mute-all
  unmuteAll: "#unmute-all", // Changed from [data-unmute-all] to #unmute-all
  pinAttendee: "#pin-attendee", // Changed from [data-pin-attendee] to #pin-attendee
  setMaxAttendees: "#set-max-attendees", // Changed from [data-set-max-attendees] to #set-max-attendees
  assignHost: "#assign-host", // Changed from [data-assign-host] to #assign-host
  hostCandidateSelect: "[data-host-candidate-select]",
  loveBtn: "#love-btn",
});

const $$ = (sel, root = document) => root.querySelector(sel);
const on = (el, ev, fn) => el?.addEventListener?.(ev, fn);
const setAttr = (el, k, v) => el?.setAttribute?.(k, v);
const text = (el, v) => {
  if (el) el.textContent = v;
};
const log = (...a) => console.log("[chimeUtils]", ...a);
const warn = (...a) => console.warn("[chimeUtils]", ...a);
const err = (...a) => console.error("[chimeUtils]", ...a);

const Bus = {
  on(type, fn) {
    window.addEventListener(type, fn);
  },
  emit(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  },
};

(function () {
  if (!("state" in window)) {
    Object.defineProperty(window, "state", {
      get: () => window.__chimeState,
      configurable: true,
    });
  }
  if (!("els" in window)) {
    Object.defineProperty(window, "els", {
      get: () => window.__chimeEls,
      configurable: true,
    });
  }
})();

function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function dmEncode(o) {
  try {
    return JSON.stringify(o);
  } catch {
    return "{}";
  }
}
function dmDecode(msg) {
  try {
    if (typeof msg.text === "function") return JSON.parse(msg.text());
  } catch {}
  try {
    const t = new TextDecoder().decode(msg.data);
    return JSON.parse(t);
  } catch {}
  return null;
}

function generateAvatar(username) {
  if (!username || username.trim() === "") return;

  const firstLetter = username.trim().charAt(0).toUpperCase();
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
    "#F1948A",
    "#85C1E9",
    "#D7BDE2",
  ];

  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const avatar = document.getElementById("user-avatar");

  if (avatar) {
    avatar.style.backgroundColor = randomColor;
    avatar.textContent = firstLetter;
    avatar.title = username;
  }

  return { firstLetter, backgroundColor: randomColor };
}

function showMeetingDetailsForm() {
  const meetingDetailsSection = document.getElementById(
    "meeting-details-section"
  );
  if (meetingDetailsSection) {
    meetingDetailsSection.hidden = false;
  }
}

function hideMeetingDetailsForm() {
  const meetingDetailsSection = document.getElementById(
    "meeting-details-section"
  );
  if (meetingDetailsSection) {
    meetingDetailsSection.hidden = true;
  }
}

function showMeetingDetailsDisplay() {
  const meetingDetailsDisplay = document.getElementById(
    "meeting-details-display"
  );
  if (meetingDetailsDisplay) {
    meetingDetailsDisplay.hidden = false;
  }
}

function hideMeetingDetailsDisplay() {
  const meetingDetailsDisplay = document.getElementById(
    "meeting-details-display"
  );
  if (meetingDetailsDisplay) {
    meetingDetailsDisplay.hidden = true;
  }
}

function updateMeetingDetailsDisplay(meetingInfo) {
  if (!meetingInfo) return;

  const titleEl = document.getElementById("display-meeting-title");
  const topicEl = document.getElementById("display-meeting-topic");
  const pointsListEl = document.getElementById("discussion-points-list");

  if (titleEl && meetingInfo.title) {
    titleEl.textContent = meetingInfo.title;
  }

  if (topicEl && meetingInfo.topic) {
    topicEl.textContent = meetingInfo.topic;
  }

  if (pointsListEl && meetingInfo.discussionPoints) {
    pointsListEl.innerHTML = "";
    const points = meetingInfo.discussionPoints
      .split("\n")
      .filter((point) => point.trim());
    points.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point.trim();
      pointsListEl.appendChild(li);
    });
  }
}

async function saveMeetingDetails() {
  const title = document.getElementById("meeting-title")?.value?.trim();
  const topic = document.getElementById("meeting-topic")?.value?.trim();
  const discussionPoints = document
    .getElementById("discussion-points")
    ?.value?.trim();

  if (!title && !topic && !discussionPoints) {
    alert("Please fill in at least one field");
    return;
  }

  try {
    const meetingId = state.meetingSession?.configuration?.meetingId;
    const response = await fetch(`/meeting-details/${meetingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        topic,
        discussionPoints,
        hostAttendeeId: HostControlsHandler._state.currentUser,
      }),
    });

    if (response.ok) {
      updateMeetingDetailsDisplay({ title, topic, discussionPoints });
      showMeetingDetailsDisplay();
      hideMeetingDetailsForm();

      const av = CamMicHandler._state.av;
      if (av) {
        const message = {
          type: "meeting-details-update",
          title,
          topic,
          discussionPoints,
        };
        av.realtimeSendDataMessage(EVENTS.STATE, dmEncode(message), 5000);
      }

      alert("Meeting details saved successfully!");
    } else {
      alert("Failed to save meeting details");
    }
  } catch (error) {
    console.error("Save meeting details error:", error);
    alert("Error saving meeting details");
  }
}

function validate_callback(obj, spec = {}) {
  if (!obj || typeof obj !== "object") return false;
  for (const [k, rule] of Object.entries(spec)) {
    const v = obj[k];
    if (rule.required && (v === undefined || v === null)) return false;
    if (v !== undefined && rule.type && typeof v !== rule.type) return false;
  }
  return true;
}

class CamMic {
  constructor(callback = () => {}) {
    this.watchPermissionChanges(callback);
  }
  static _liveStreams = new Set();

  setAudioPermission(allowed) {
    // instance method for compatibility
    CamMic.setAudioPermission(allowed);
  }
  static setAudioPermission(allowed) {
    localStorage.setItem("AudioPermission", allowed ? "granted" : "denied");
    log("AudioPermission set →", allowed ? "granted" : "denied");
  }

  static async checkPermissions() {
    log("🔍 Checking Permissions");
    const cam = await CamMic.getPermission("camera");
    const mic = await CamMic.getPermission("microphone");
    log("camera:", cam, "| microphone:", mic);
  }
  static async getPermission(kind) {
    if (!navigator.permissions) return "unsupported";
    try {
      const s = await navigator.permissions.query({ name: kind });
      return s.state;
    } catch {
      return "error";
    }
  }
  static async watchPermissionChanges(callback) {
    if (!navigator.permissions) {
      warn("Permissions API not supported.");
      return;
    }
    ["camera", "microphone"].forEach(async (type) => {
      try {
        const status = await navigator.permissions.query({ name: type });
        status.onchange = () => {
          log(`${type} permission →`, status.state);
          callback(type, status.state);
        };
      } catch (e) {
        warn(`Failed to bind permission listener for ${type}`, e);
      }
    });
  }
  static async requestCamera() {
    if (!navigator.mediaDevices?.getUserMedia)
      return err("getUserMedia not supported");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      CamMic._registerStream(s);
      log("✅ Camera access");
    } catch (e) {
      err("❌ Camera access error", e);
    }
  }
  static async requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia)
      return err("getUserMedia not supported");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      CamMic._registerStream(s);
      log("Mic access");
    } catch (e) {
      err("Mic access error", e);
    }
  }
  static async requestCameraAndMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia)
      return err("getUserMedia not supported");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      CamMic._registerStream(s);
      log("✅ Cam+Mic access");
    } catch (e) {
      err("❌ Cam+Mic access error", e);
    }
  }
  static setPreferredDevice(kind, deviceId) {
    localStorage.setItem(`CamMicPreferred-${kind}`, deviceId);
    log(`saved preferred ${kind} → ${deviceId}`);
  }
  static getPreferredDevice(kind) {
    return localStorage.getItem(`CamMicPreferred-${kind}`) || null;
  }
  static async listAvailableDevices() {
    if (!navigator.mediaDevices?.enumerateDevices)
      return err("enumerateDevices not supported");
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const prefCam = CamMic.getPreferredDevice("camera");
      const prefMic = CamMic.getPreferredDevice("microphone");
      console.group("[CamMic] available devices");
      devices.forEach((d, i) => {
        const star =
          (d.kind === "videoinput" && d.deviceId === prefCam) ||
          (d.kind === "audioinput" && d.deviceId === prefMic)
            ? "⭐ "
            : "  ";
        console.log(
          `${star}${i + 1}. ${d.kind} id=${d.deviceId} label="${
            d.label || "(no label)"
          }`
        );
      });
      console.groupEnd();
    } catch (e) {
      err("listAvailableDevices error", e);
    }
  }
  static _registerStream(stream) {
    CamMic._liveStreams.add(stream);
    const off = () => CamMic._liveStreams.delete(stream);
    stream
      .getTracks()
      .forEach((t) => t.addEventListener("ended", off, { once: true }));
  }
  static stopAllStreams() {
    if (CamMic._liveStreams.size === 0) return warn("No active stream to stop");
    CamMic._liveStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    CamMic._liveStreams.clear();
    log("🔻 All streams stopped.");
  }
}

class CamMicHandler {
  static _dom = {};
  static _lastMode = null;
  static _interval = null;
  static _state = {
    isMuted: false,
    isVideoOn: false,
    connectionQuality: "n/a",
    meetingSession: null,
    av: null,
    selfId: null,
  };

  static init() {
    CamMicHandler.mapDOM();
    CamMicHandler.setupToggleHandlers();
    if (!window.camMic)
      window.camMic = new CamMic((type, state) => {
        log("Permission changed:", type, state);
        const mode = CamMicHandler._lastMode;
        if (!mode) return;
        CamMicHandler._recheckAndRender(mode);
      });

    on(CamMicHandler._dom.btnStartBoth, "click", () =>
      CamMicHandler._beginPermissionFlow("both")
    );
    on(CamMicHandler._dom.btnStartCamera, "click", () =>
      CamMicHandler._beginPermissionFlow("camera")
    );
    on(CamMicHandler._dom.btnStartMic, "click", () =>
      CamMicHandler._beginPermissionFlow("microphone")
    );
  }

  static setupToggleHandlers() {
    log("Setting up toggle handlers…");
    const a = $$(SELECTORS.toggleAudioBtn);
    const v = $$(SELECTORS.toggleVideoBtn);
    log("Audio toggle el:", a, "Video toggle el:", v);

    if (a) {
      a.style.pointerEvents = "auto";
      a.style.cursor = "pointer";

      CamMicHandler._audioClickHandler = () => {
        log("Audio button clicked!");
        CamMicHandler.toggleAudio();
      };

      a.addEventListener("click", CamMicHandler._audioClickHandler);
      log("Audio button event listener attached");

      a.addEventListener("click", () => {
        log("Test: Audio button was clicked!");
      });
    } else {
      warn("Audio toggle button not found");
    }

    if (v) {
      v.style.pointerEvents = "auto";
      v.style.cursor = "pointer";

      CamMicHandler._videoClickHandler = () => {
        log("Video button clicked!");
        CamMicHandler.toggleVideo();
      };

      v.addEventListener("click", CamMicHandler._videoClickHandler);
      log("Video button event listener attached");

      v.addEventListener("click", () => {
        log("Test: Video button was clicked!");
      });
    } else {
      warn("Video toggle button not found");
    }
  }

  static testButtonClickability() {
    const a = $$(SELECTORS.toggleAudioBtn);
    const v = $$(SELECTORS.toggleVideoBtn);

    if (a) {
      log("Audio button is working correctly");
      // Remove test colors
      a.style.backgroundColor = "";
      a.style.zIndex = "";
      a.style.position = "";
    }

    if (v) {
      log("Video button is working correctly");
      // Remove test colors
      v.style.backgroundColor = "";
      v.style.zIndex = "";
      v.style.position = "";
    }
  }

  static toggleAudio() {
    log("toggleAudio called", CamMicHandler._state.av);
    const av = CamMicHandler._state.av;
    if (!av) return warn("No audioVideo available for toggle");
    try {
      const wasMuted = av.realtimeIsLocalAudioMuted?.();
      log("Current audio muted state:", wasMuted);

      if (wasMuted) {
        log("Unmuting audio...");
        av.realtimeUnmuteLocalAudio?.();
        CamMicHandler._state.isMuted = false;
      } else {
        log("Muting audio...");
        av.realtimeMuteLocalAudio?.();
        CamMicHandler._state.isMuted = true;
      }

      log("New audio muted state:", CamMicHandler._state.isMuted);
      CamMicHandler.updateToggleButtonText();
      CamMicHandler.refreshSelfStatus();
      CamMicHandler.broadcastStateChange("audio", CamMicHandler._state.isMuted);
    } catch (e) {
      err("toggle audio failed", e);
    }
  }

  static async toggleVideo() {
    log("toggleVideo called", CamMicHandler._state.av);
    const av = CamMicHandler._state.av;
    if (!av) return warn("No audioVideo available for toggle");
    try {
      log("Current video state:", CamMicHandler._state.isVideoOn);

      if (CamMicHandler._state.isVideoOn) {
        log("Stopping video...");
        await av.stopLocalVideoTile?.();
        await new Promise((resolve) => setTimeout(resolve, 100));
        CamMicHandler._state.isVideoOn = false;
      } else {
        log("Starting video...");
        await av.startLocalVideoTile?.();
        await new Promise((resolve) => setTimeout(resolve, 100));
        CamMicHandler._state.isVideoOn = true;
      }

      log("New video state:", CamMicHandler._state.isVideoOn);
      CamMicHandler.updateToggleButtonText();
      CamMicHandler.refreshSelfStatus();
      CamMicHandler.broadcastStateChange(
        "video",
        CamMicHandler._state.isVideoOn
      );
    } catch (e) {
      err("toggle video failed", e);
    }
  }
  static updateToggleButtonText() {
    const a = $$(SELECTORS.toggleAudioBtn);
    const v = $$(SELECTORS.toggleVideoBtn);

    if (a) {
      const newText = CamMicHandler._state.isMuted ? "Unmute" : "Mute";
      a.textContent = newText;
      log("Audio button text updated to:", newText);
    }

    if (v) {
      const newText = CamMicHandler._state.isVideoOn ? "Video Off" : "Video On";
      v.textContent = newText;
      log("Video button text updated to:", newText);
    }
  }

  static enableInCallControls(onOff) {
    const a = $$(SELECTORS.toggleAudioBtn);
    const v = $$(SELECTORS.toggleVideoBtn);

    log("enableInCallControls:", { onOff, aFound: !!a, vFound: !!v });

    if (a) {
      a.disabled = !onOff;
      log("Audio button disabled:", a.disabled, "Button text:", a.textContent);

      if (onOff) {
        if (CamMicHandler._audioClickHandler) {
          a.removeEventListener("click", CamMicHandler._audioClickHandler);
        }

        CamMicHandler._audioClickHandler = () => {
          log("Audio button clicked!");
          CamMicHandler.toggleAudio();
        };

        a.addEventListener("click", CamMicHandler._audioClickHandler);
        log("Audio button event listener attached");
      }
    } else {
      warn("Audio toggle button not found for enableInCallControls");
    }

    if (v) {
      v.disabled = !onOff;
      log("Video button disabled:", v.disabled, "Button text:", v.textContent);

      if (onOff) {
        if (CamMicHandler._videoClickHandler) {
          v.removeEventListener("click", CamMicHandler._videoClickHandler);
        }

        CamMicHandler._videoClickHandler = () => {
          log("Video button clicked!");
          CamMicHandler.toggleVideo();
        };

        v.addEventListener("click", CamMicHandler._videoClickHandler);
        log("Video button event listener attached");
      }
    } else {
      warn("Video toggle button not found for enableInCallControls");
    }
  }

  static refreshSelfStatus() {
    const el = $$(SELECTORS.selfStatus);
    if (!el) return;
    const s = `${CamMicHandler._state.isMuted ? "🔇" : "🎤"}  ${
      CamMicHandler._state.isVideoOn ? "🎥 On" : "🎥 Off"
    }  Q:${CamMicHandler._state.connectionQuality}`;
    text(el, s);
  }

  static setMeetingState(meetingSession, av, selfId) {
    CamMicHandler._state.meetingSession = meetingSession;
    CamMicHandler._state.av = av;
    CamMicHandler._state.selfId = selfId;
  }

  static updateConnectionQuality(quality) {
    CamMicHandler._state.connectionQuality = quality || "n/a";
    CamMicHandler.refreshSelfStatus();
  }

  static syncVideoState(isVideoOn) {
    CamMicHandler._state.isVideoOn = !!isVideoOn;
    CamMicHandler.updateToggleButtonText();
    CamMicHandler.refreshSelfStatus();
  }

  static broadcastStateChange(type, value) {
    const av = CamMicHandler._state.av;
    const self = CamMicHandler._state.selfId;
    if (!av || !self) return;
    const message = { type, attendeeId: self };
    if (type === "audio") message.muted = value;
    else if (type === "video") message.enabled = value;
    try {
      av.realtimeSendDataMessage(EVENTS.STATE, dmEncode(message), 5000);
      log("Broadcasted state change:", type, value);
    } catch (e) {
      warn("broadcast state change failed", e);
    }
  }

  static mapDOM() {
    CamMicHandler._dom = {
      loader: $$("[data-cm-loader]"),
      permissionIcons: $$("[data-cm-permission-icons]"),
      needCamera: $$("[data-cm-need-camera]"),
      needMicrophone: $$("[data-cm-need-microphone]"),
      deviceSelect: $$("[data-cm-device-select]"),
      videoSelect: $$("[data-cm-video-select]"),
      audioSelect: $$("[data-cm-audio-select]"),
      btnStartBoth: $$("[data-cm-start-both]"),
      btnStartCamera: $$("[data-cm-start-camera]"),
      btnStartMic: $$("[data-cm-start-microphone]"),
    };
  }

  static async _beginPermissionFlow(mode) {
    CamMicHandler._lastMode = mode;
    CamMicHandler.resetUI();
    CamMicHandler._dom.loader?.removeAttribute("hidden");
    await new Promise((r) => setTimeout(r, 300));
    CamMicHandler._recheckAndRender(mode);
  }

  static async _recheckAndRender(mode) {
    const camPerm = await CamMic.getPermission("camera");
    const micPerm = await CamMic.getPermission("microphone");
    const needsCam = mode === "camera" || mode === "both";
    const needsMic = mode === "microphone" || mode === "both";
    if (
      (needsCam && camPerm !== "granted") ||
      (needsMic && micPerm !== "granted")
    ) {
      CamMicHandler.displayPermissionsNotGrantedUI(needsCam, needsMic);
      setTimeout(() => {
        CamMicHandler._requestPermissions(mode);
        CamMicHandler._startPermissionWatcher(mode);
      }, 50);
    } else {
      CamMicHandler.displayPermissionsGrantedUI(mode);
    }
  }

  static async _requestPermissions(mode) {
    if (mode === "both") await CamMic.requestCameraAndMicrophone();
    else if (mode === "camera") await CamMic.requestCamera();
    else if (mode === "microphone") await CamMic.requestMicrophone();
  }

  static _startPermissionWatcher(mode) {
    if (CamMicHandler._interval) clearInterval(CamMicHandler._interval);
    CamMicHandler._interval = setInterval(async () => {
      const camPerm = await CamMic.getPermission("camera");
      const micPerm = await CamMic.getPermission("microphone");
      const ok =
        (mode === "both" && camPerm === "granted" && micPerm === "granted") ||
        (mode === "camera" && camPerm === "granted") ||
        (mode === "microphone" && micPerm === "granted");
      if (ok) {
        clearInterval(CamMicHandler._interval);
        CamMicHandler.displayPermissionsGrantedUI(mode);
      }
      if (camPerm === "denied" || micPerm === "denied") {
        clearInterval(CamMicHandler._interval);
        alert("Permissions denied. Reload.");
      }
    }, 200);
  }

  static async displayPermissionsGrantedUI(mode) {
    CamMicHandler.resetUI();
    const devices = await navigator.mediaDevices.enumerateDevices();
    const vSel = CamMicHandler._dom.videoSelect;
    const aSel = CamMicHandler._dom.audioSelect;
    const prefCam = CamMic.getPreferredDevice("camera");
    const prefMic = CamMic.getPreferredDevice("microphone");

    if (vSel && (mode === "camera" || mode === "both")) {
      vSel.innerHTML = "";
      devices
        .filter((d) => d.kind === "videoinput")
        .forEach((d) => {
          const o = document.createElement("option");
          o.value = d.deviceId;
          o.text = d.label || "Unnamed camera";
          if (d.deviceId === prefCam) o.selected = true;
          vSel.appendChild(o);
        });
      vSel.onchange = () => CamMic.setPreferredDevice("camera", vSel.value);
      vSel.parentElement?.removeAttribute("hidden");
    }
    if (aSel && (mode === "microphone" || mode === "both")) {
      aSel.innerHTML = "";
      devices
        .filter((d) => d.kind === "audioinput")
        .forEach((d) => {
          const o = document.createElement("option");
          o.value = d.deviceId;
          o.text = d.label || "Unnamed mic";
          if (o.value === prefMic) o.selected = true;
          aSel.appendChild(o);
        });
      aSel.onchange = () => CamMic.setPreferredDevice("microphone", aSel.value);
      aSel.parentElement?.removeAttribute("hidden");
    }
    CamMicHandler._dom.deviceSelect?.removeAttribute("hidden");
    CamMicHandler._dom.loader?.setAttribute("hidden", "");
  }

  static displayPermissionsNotGrantedUI(showCam, showMic) {
    CamMicHandler.resetUI();
    (async () => {
      const cam = await CamMic.getPermission("camera");
      const mic = await CamMic.getPermission("microphone");
      if (showCam && cam !== "granted")
        CamMicHandler._dom.needCamera?.removeAttribute("hidden");
      if (showMic && mic !== "granted")
        CamMicHandler._dom.needMicrophone?.removeAttribute("hidden");
    })();
    CamMicHandler._dom.permissionIcons?.removeAttribute("hidden");
    CamMicHandler._dom.loader?.setAttribute("hidden", "");
  }

  static resetUI() {
    const d = CamMicHandler._dom;
    d.loader?.setAttribute("hidden", "");
    d.permissionIcons?.setAttribute("hidden", "");
    d.needCamera?.setAttribute("hidden", "");
    d.needMicrophone?.setAttribute("hidden", "");
    d.deviceSelect?.setAttribute("hidden", "");
    d.videoSelect?.parentElement?.setAttribute("hidden", "");
    d.audioSelect?.parentElement?.setAttribute("hidden", "");
  }
}
let globalHostId = null;
let serverHostId = null;
class HostControlsHandler {
  static _state = {
    isHost: false,
    meetingId: null,
    attendees: new Map(),
    currentUser: null,
    isGroupCall: false,
    maxAttendees: 10,
    pinnedAttendee: null,
    mainVideoAttendee: null,
    hostAttendeeId: null,
    collaborators: new Set(),
    maxCoCreators: 4,
  };
  static _hostPollTimer = null;

  static init() {
    HostControlsHandler.setupHostControls();
    HostControlsHandler.startHostStatusCheck();
    log("Host controls initialized");
  }

  static setMeetingState(
    isHost,
    meetingId,
    attendeeId,
    isGroupCall,
    maxAttendees,
    hostAttendeeId
  ) {
    const s = HostControlsHandler._state;
    s.isHost = !!isHost;
    s.meetingId = meetingId || null;
    s.currentUser = attendeeId || null;
    s.isGroupCall = !!isGroupCall;
    s.maxAttendees = Number(maxAttendees || 10);
    s.hostAttendeeId = hostAttendeeId || null;

    const assignHostBtn = document.getElementById("assign-host");
    const hostCandidateSelect = document.getElementById(
      "host-candidate-select"
    );
    if (assignHostBtn) assignHostBtn.hidden = !s.isHost;
    if (hostCandidateSelect) hostCandidateSelect.hidden = !s.isHost;

    if (!s.isHost && s.hostAttendeeId) s.mainVideoAttendee = s.hostAttendeeId;
    HostControlsHandler.updateMeetingInfo();
    if (s.isGroupCall)
      s.isHost
        ? HostControlsHandler.showHostControls()
        : HostControlsHandler.hideHostControls();
    else HostControlsHandler.hideHostControls();
  }

  static isPrivileged(attendeeId) {
    const s = HostControlsHandler._state;
    return (
      attendeeId &&
      (attendeeId === s.hostAttendeeId ||
        (s.collaborators && s.collaborators.has(attendeeId)))
    );
  }

  static updateMeetingInfo() {
    const meetingIdEl = document.getElementById("meeting-id");
    const participantCountEl = document.getElementById("participant-count");
    const maxParticipantsEl = document.getElementById("max-participants");
    const meetingTypeEl = document.getElementById("meeting-type");

    if (meetingIdEl)
      meetingIdEl.textContent =
        HostControlsHandler._state.meetingId?.slice(0, 8) || "-";
    if (participantCountEl)
      participantCountEl.textContent = String(
        HostControlsHandler._state.attendees.size
      );
    if (maxParticipantsEl)
      maxParticipantsEl.textContent =
        HostControlsHandler._state.maxAttendees || 10;
    if (meetingTypeEl)
      meetingTypeEl.textContent = HostControlsHandler._state.isGroupCall
        ? "Group Call"
        : "Direct Call";
  }

  static updateAttendeeProfile(attendeeId, profile) {
    const a = HostControlsHandler._state.attendees.get(attendeeId) || {};
    const next = Object.assign({}, a, {
      name: profile?.name || a.name,
      avatarInitial: profile?.avatarInitial || a.avatarInitial,
      avatarColor: profile?.avatarColor || a.avatarColor,
    });
    HostControlsHandler._state.attendees.set(attendeeId, next);
    HostControlsHandler.updateHostCandidateSelect();
    HostControlsHandler.renderAttendeeList();
    Utils.refreshVideoLabelsFor(attendeeId);
  }

  static setupHostControls() {
    const muteAllBtn = document.getElementById("mute-all");
    const unmuteAllBtn = document.getElementById("unmute-all");
    const assignHostBtn = document.getElementById("assign-host");
    const hostCandidateSelect = document.getElementById(
      "host-candidate-select"
    );

    const me = HostControlsHandler._state.currentUser;
    const isHost = me === HostControlsHandler._state.hostAttendeeId;
    if (assignHostBtn) assignHostBtn.hidden = !isHost;
    if (hostCandidateSelect) hostCandidateSelect.hidden = !isHost;

    if (muteAllBtn) {
      on(muteAllBtn, "click", () => {
        log("Mute all clicked");
        HostControlsHandler.broadcastHostAction("mute-all", true);
        HostControlsHandler.showNotification("Muting all attendees...");
      });
    }

    if (unmuteAllBtn) {
      on(unmuteAllBtn, "click", () => {
        log("Unmute all clicked");
        HostControlsHandler.broadcastHostAction("mute-all", false);
        HostControlsHandler.showNotification("Unmuting all attendees...");
      });
    }

    if (assignHostBtn && hostCandidateSelect) {
      on(assignHostBtn, "click", async () => {
        const me = HostControlsHandler._state.currentUser;
        if (me !== HostControlsHandler._state.hostAttendeeId) {
          HostControlsHandler.showNotification(
            "Only the host can assign a new host."
          );
          return;
        }

        const selectedAttendeeId = hostCandidateSelect.value;
        if (!selectedAttendeeId) {
          HostControlsHandler.showNotification(
            "Please select a participant first"
          );
          return;
        }

        const selectedAttendee =
          HostControlsHandler._state.attendees.get(selectedAttendeeId);
        if (!selectedAttendee) {
          HostControlsHandler.showNotification(
            "Selected participant not found"
          );
          return;
        }

        log("Assigning host to:", selectedAttendeeId, selectedAttendee);

        try {
          const response = await fetch(
            `/assign-host/${state.meetingSession?.configuration?.meetingId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                currentHostId: HostControlsHandler._state.currentUser,
                newHostId: selectedAttendeeId,
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            log("Host assignment successful:", result);
            serverHostId = result.newHost;
            log("Updated server host ID:", serverHostId);

            // Add this ONE line to trigger the existing video position logic:
            HostControlsHandler.forceVideoPositionUpdate(selectedAttendeeId);

            HostControlsHandler.broadcastHostAction(EVENTS.ASSIGN_HOST, {
              attendeeId: selectedAttendeeId,
              attendeeName:
                selectedAttendee.name || selectedAttendeeId.slice(0, 8),
            });

            HostControlsHandler.showNotification(
              `Host assigned to ${
                selectedAttendee.name || selectedAttendeeId.slice(0, 8)
              }`
            );
          } else {
            const error = await response.json();
            HostControlsHandler.showNotification(
              `Host assignment failed: ${error.error}`
            );
          }
        } catch (error) {
          console.error("Host assignment error:", error);
          HostControlsHandler.showNotification(
            "Host assignment failed. Please try again."
          );
        }
      });
    }
    const collabInput = document.getElementById("collab-input");
    const collabSave = document.getElementById("collab-save");
    const maxCap = HostControlsHandler._state.maxCoCreators;
    const warn = (msg) => HostControlsHandler.showNotification(msg);

    const updateCollabUiState = () => {
      if (!collabInput || !collabSave) return;
      const entries = (collabInput.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (entries.length > maxCap) {
        collabSave.disabled = true;
      } else {
        collabSave.disabled = false;
      }
    };

    if (collabSave && collabInput) {
      // Live validation / disable when exceeding 4
      on(collabInput, "input", () => {
        const parts = (collabInput.value || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > maxCap) {
          warn(`Maximum of ${maxCap} collaborators allowed. Remove extra entries.`);
        }
        updateCollabUiState();
      });
      on(collabSave, "click", async () => {
        const meetingId = state.meetingSession?.configuration?.meetingId;
        const currentHostId = HostControlsHandler._state.currentUser;

        const rawList = (collabInput.value || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (rawList.length > maxCap) {
          warn(`You can only add up to ${maxCap} collaborators.`);
          return;
        }

        const list = rawList.slice(0, maxCap);

        try {
          const resp = await fetch(`/collaborators/${meetingId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentHostId, collaboratorIds: list }),
          });

          if (!resp.ok) {
            try {
              const err = await resp.json();
              warn(err?.error || "Failed to update collaborators");
            } catch (_) {
              warn("Failed to update collaborators");
            }
            updateCollabUiState();
            return;
          }

          const { collaborators } = await resp.json();
          HostControlsHandler._state.collaborators = new Set(collaborators);
          HostControlsHandler.renderAttendeeList();

          HostControlsHandler.broadcastHostAction(
            "update-collaborators",
            collaborators
          );
          HostControlsHandler.showNotification("Collaborators updated");
          updateCollabUiState();
        } catch (e) {
          console.error("Error updating collaborators:", e);
          HostControlsHandler.showNotification("Error updating collaborators");
        }
      });
    }
  }

  static updateHostCandidateSelect() {
    const hostCandidateSelect = document.getElementById(
      "host-candidate-select"
    );
    if (!hostCandidateSelect) return;

    hostCandidateSelect.innerHTML =
      '<option value="">Select participant...</option>';

    HostControlsHandler._state.attendees.forEach((attendee, attendeeId) => {
      if (attendeeId !== HostControlsHandler._state.currentUser) {
        const option = document.createElement("option");
        option.value = attendeeId;
        option.textContent = attendee.name || attendeeId.slice(0, 8);
        hostCandidateSelect.appendChild(option);
      }
    });
  }

  static async checkHostStatus() {
    try {
      const meetingId = state.meetingSession?.configuration?.meetingId;
      if (!meetingId) return;

      const response = await fetch(`/host/${meetingId}`);
      if (response.ok) {
        const result = await response.json();
        const currentHostId = result.hostId;
        serverHostId = currentHostId;

        if (currentHostId !== HostControlsHandler._state.hostAttendeeId) {
          log("Host status changed:", currentHostId);

          if (currentHostId === HostControlsHandler._state.currentUser) {
            // Current user is now host
            HostControlsHandler._state.isHost = true;
            HostControlsHandler._state.hostAttendeeId = currentHostId;
            HostControlsHandler.showHostControls();
            HostControlsHandler.showNotification("You are now the host");
          } else {
            // Someone else is host
            HostControlsHandler._state.isHost = false;
            HostControlsHandler._state.hostAttendeeId = currentHostId;
            HostControlsHandler.hideHostControls();

            const hostAttendee =
              HostControlsHandler._state.attendees.get(currentHostId);
            if (hostAttendee) {
              HostControlsHandler.showNotification(
                `${
                  hostAttendee.name || currentHostId.slice(0, 8)
                } is now the host`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Host status check error:", error);
    }
  }

  static setupEventListeners() {
    const muteAllBtn = document.getElementById("mute-all");
    const unmuteAllBtn = document.getElementById("unmute-all");
    const pinAttendeeBtn = document.getElementById("pin-attendee");
    const setMaxAttendeesBtn = document.getElementById("set-max-attendees");
    const assignHostBtn = document.getElementById("assign-host");

    if (muteAllBtn) {
      muteAllBtn.addEventListener("click", () => {
        log("Mute all button clicked");
        HostControlsHandler.muteAllAttendees();
      });
    }

    if (unmuteAllBtn) {
      unmuteAllBtn.addEventListener("click", () => {
        log("Unmute all button clicked");
        HostControlsHandler.unmuteAllAttendees();
      });
    }

    if (pinAttendeeBtn) {
      pinAttendeeBtn.addEventListener("click", () => {
        log("Pin attendee button clicked");
        HostControlsHandler.showPinDialog();
      });
    }

    if (setMaxAttendeesBtn) {
      setMaxAttendeesBtn.addEventListener("click", () => {
        log("Set max attendees button clicked");
        HostControlsHandler.showMaxAttendeesDialog();
      });
    }

    if (assignHostBtn) {
      assignHostBtn.addEventListener("click", () => {
        log("Assign host button clicked");
        HostControlsHandler.assignHost();
      });
    }
  }

  static showPinDialog() {
    if (!HostControlsHandler._state.isHost) return;
    const attendeeId = prompt("Enter attendee ID to pin to main video:");
    if (attendeeId && HostControlsHandler._state.attendees.has(attendeeId)) {
      HostControlsHandler.pinAttendee(attendeeId);
    }
  }

  static showMaxAttendeesDialog() {
    if (!HostControlsHandler._state.isHost) return;
    const max = parseInt(prompt("Set maximum attendees:"), 10);
    if (Number.isFinite(max) && max > 0)
      HostControlsHandler.setMaxAttendees(max);
  }

  static pinAttendee(attendeeId) {
    const s = HostControlsHandler._state;
    s.pinnedAttendee = attendeeId;
    s.mainVideoAttendee = attendeeId;
    HostControlsHandler.broadcastHostAction("pin-attendee", attendeeId);
    HostControlsHandler.updateMainVideo();
  }

  static setMaxAttendees(max) {
    HostControlsHandler._state.maxAttendees = max;
    HostControlsHandler.broadcastHostAction("set-max-attendees", max);
  }

  static async assignHost() {
    if (!HostControlsHandler._state.isHost) return;
    try {
      const select = $$(SELECTORS.hostCandidateSelect);
      const selectedAttendeeId = select?.value || null;
      if (!selectedAttendeeId) {
        alert("Please select a participant to assign as host");
        return;
      }

      // const av = CamMicHandler._state.av;
      // if (av) {
      //   const message = {
      //     type: "assign-host",
      //     attendeeId: selectedAttendeeId,
      //     previousHost: HostControlsHandler._state.currentUser,
      //   };
      //   av.realtimeSendDataMessage(EVENTS.STATE, dmEncode(message), 5000);
      // }

      // // local UI demotion
      // HostControlsHandler._state.isHost = false;
      // HostControlsHandler._state.hostAttendeeId = selectedAttendeeId;
      // HostControlsHandler.hideHostControls();
    } catch (e) {
      err("assignHost failed", e);
    }
  }

  // static updateHostCandidateSelect() {
  //   const select = $$(SELECTORS.hostCandidateSelect);
  //   if (!select) return;
  //   select.innerHTML = '<option value="">Select participant…</option>';
  //   HostControlsHandler._state.attendees.forEach((att, id) => {
  //     if (id !== HostControlsHandler._state.currentUser) {
  //       const o = document.createElement("option");
  //       o.value = id;
  //       o.text = att.name || id.slice(0, 8);
  //       select.appendChild(o);
  //     }
  //   });
  // }

  static updateMainVideo() {
    log(
      "updateMainVideo called but skipping - video binding handled by tile updates"
    );
    return;
  }

  static forceVideoPositionUpdate(newHostId) {
    const av = CamMicHandler._state.av;
    if (!av) return;

    const mainVideo = document.querySelector("[data-main-video]");
    if (mainVideo) {
      mainVideo.srcObject = null;
      mainVideo.style.display = "none";
    }

    const oldHostId = HostControlsHandler._state.hostAttendeeId;
    if (oldHostId && oldHostId !== newHostId) {
      const localTileId = window.state.localTileId;
      if (localTileId) {
        const localVideo = document.querySelector("[data-local]");
        const localSidebar = document.getElementById("local-video-sidebar");
        if (localVideo && localSidebar) {
          try {
            av.bindVideoElement(localTileId, localVideo);
            localVideo.style.display = "block";
            localSidebar.hidden = false;
            log("Moved old host to sidebar");
          } catch (e) {
            console.warn("Failed to move old host to sidebar:", e);
          }
        }
      }
    }

    setTimeout(() => {
      for (const [tileId, attendeeId] of window.state.tiles.entries()) {
        if (attendeeId === newHostId) {
          if (mainVideo) {
            try {
              av.bindVideoElement(tileId, mainVideo);
              mainVideo.style.display = "block";
              log("Forced immediate video position update for new host");
            } catch (e) {
              console.warn("Force video update failed:", e);
            }
          }
          break;
        }
      }
    }, 50);
  }

  static setHostState(isHost, meetingId, attendeeId) {
    const s = HostControlsHandler._state;
    console.log("ssssssssss", s);

    s.isHost = !!isHost;
    s.meetingId = meetingId || null;
    s.currentUser = attendeeId || null;
    if (isHost) {
      globalHostId = attendeeId;
    }
    s.isHost
      ? HostControlsHandler.showHostControls()
      : HostControlsHandler.hideHostControls();
  }

  static showHostControls() {
    const hostControls = document.getElementById("host-controls");
    if (hostControls) {
      hostControls.hidden = false;
      HostControlsHandler.updateHostCandidateSelect();
      log("Host controls shown");
    }
  }

  static hideHostControls() {
    const hostControls = document.getElementById("host-controls");
    if (hostControls) {
      hostControls.hidden = true;
      log("Host controls hidden");
    }
  }

  static addAttendee(attendeeId, name, isHost = false) {
    HostControlsHandler._state.attendees.set(attendeeId, {
      name,
      isHost,
      audioMuted: false,
      videoOn: true,
      quality: "good",
    });
    HostControlsHandler.updateHostCandidateSelect();
    HostControlsHandler.renderAttendeeList();
    HostControlsHandler.updateMeetingInfo();
  }

  static removeAttendee(attendeeId) {
    HostControlsHandler._state.attendees.delete(attendeeId);
    HostControlsHandler.updateHostCandidateSelect();
    HostControlsHandler.renderAttendeeList();
    HostControlsHandler.updateMeetingInfo();
  }
  static startHostStatusCheck() {
    if (HostControlsHandler._hostPollTimer) return;
    HostControlsHandler._hostPollTimer = setInterval(() => {
      const s = HostControlsHandler._state;
      if (!s.isGroupCall || s.isHost) return;
      HostControlsHandler.checkHostStatus();
    }, 15000);
  }

  static stopHostStatusCheck() {
    if (HostControlsHandler._hostPollTimer) {
      clearInterval(HostControlsHandler._hostPollTimer);
      HostControlsHandler._hostPollTimer = null;
    }
  }

  static updateAttendeeState(attendeeId, updates) {
    const a = HostControlsHandler._state.attendees.get(attendeeId);
    if (a) Object.assign(a, updates || {});
  }

  static renderAttendeeList() {
    const attendeeList = document.getElementById("attendee-list");
    if (!attendeeList) return;

    const lines = [];
    const collabs = HostControlsHandler._state.collaborators || new Set();
    HostControlsHandler._state.attendees.forEach((attendee, attendeeId) => {
      const controls = [];
      const isHost = attendeeId === HostControlsHandler._state.hostAttendeeId;
      const isCollab = collabs.has(attendeeId);
      if (attendee.canRemove) {
        controls.push(
          `<button onclick="HostControlsHandler.removeAttendeeFromMeeting('${attendeeId}')">Remove</button>`
        );
      }
      const me = HostControlsHandler._state.currentUser;

      if (HostControlsHandler.isPrivileged(me) && attendeeId !== me) {
        controls.push(
          `<button onclick="HostControlsHandler.toggleAttendeeAudio('${attendeeId}')">${
            attendee.audioMuted ? "Unmute" : "Mute"
          }</button>`
        );
        controls.push(
          `<button onclick="HostControlsHandler.toggleAttendeeVideo('${attendeeId}')">${
            attendee.videoOn ? "Video Off" : "Video On"
          }</button>`
        );
      }
      console.log("attendee name", attendee?.name);

      lines.push(
        `${isHost ? "⭐ " : isCollab ? "🛠️ " : ""}${
          attendee.name || attendeeId.slice(0, 8)
        } ${attendee.audioMuted ? "🔇" : "🎤"} ${
          attendee.videoOn ? "🎥" : "📷"
        } ${controls.join(" ")}`
      );
    });

    attendeeList.innerHTML = lines.join("<br>");
    console.log("[AttendeeList] Rendered attendee list with controls");
  }

  static async muteAllAttendees() {
    // if (!HostControlsHandler._state.isHost) return;
    const me = HostControlsHandler._state.currentUser;
    if (!HostControlsHandler.isPrivileged(me)) return;

    try {
      HostControlsHandler.broadcastHostAction("mute-all", true);
      HostControlsHandler.showNotification("Muted all attendees");
      console.log("[HostControls] Muted all attendees");
    } catch (e) {
      console.error("[HostControls] Failed to mute all:", e);
    }
  }

  static async unmuteAllAttendees() {
    // if (!HostControlsHandler._state.isHost) return;
    const me = HostControlsHandler._state.currentUser;
    if (!HostControlsHandler.isPrivileged(me)) return;

    try {
      HostControlsHandler.broadcastHostAction("mute-all", false);
      HostControlsHandler.showNotification("Unmuted all attendees");
      console.log("[HostControls] Unmuted all attendees");
    } catch (e) {
      console.error("[HostControls] Failed to unmute all:", e);
    }
  }
  static async removeAttendeeFromMeeting(attendeeId) {
    // if (!HostControlsHandler._state.isHost) return;
    const me = HostControlsHandler._state.currentUser;
    if (!HostControlsHandler.isPrivileged(me)) return;

    HostControlsHandler.broadcastHostAction("remove-attendee", attendeeId);
  }

  static showHostControls() {
    const hc = document.getElementById("host-controls");
    if (hc) hc.hidden = false;
    HostControlsHandler.renderAttendeeList();
  }

  static hideHostControls() {
    const hc = document.getElementById("host-controls");
    if (hc) hc.hidden = true;
  }

  static async toggleAttendeeAudio(attendeeId) {
    // if (!HostControlsHandler._state.isHost) return;
    const me = HostControlsHandler._state.currentUser;
    if (!HostControlsHandler.isPrivileged(me)) return;

    const a = HostControlsHandler._state.attendees.get(attendeeId);
    if (!a) return;
    const muted = !a.audioMuted;
    HostControlsHandler.broadcastHostAction("mute-attendee", {
      attendeeId,
      muted,
    });
    HostControlsHandler.updateAttendeeState(attendeeId, { audioMuted: muted });
    HostControlsHandler.renderAttendeeList();
  }

  static async toggleAttendeeVideo(attendeeId) {
    // if (!HostControlsHandler._state.isHost) return;
    const me = HostControlsHandler._state.currentUser;
    if (!HostControlsHandler.isPrivileged(me)) return;

    const a = HostControlsHandler._state.attendees.get(attendeeId);
    if (!a) return;
    const enabled = !a.videoOn;
    HostControlsHandler.broadcastHostAction("video-attendee", {
      attendeeId,
      enabled,
    });
    HostControlsHandler.updateAttendeeState(attendeeId, { videoOn: enabled });
    HostControlsHandler.renderAttendeeList();
  }

  static broadcastHostAction(action, data) {
    const av = CamMicHandler._state.av;
    if (!av) return;
    const message = {
      type: "host-action",
      action,
      data,
      hostId: HostControlsHandler._state.currentUser,
      timestamp: Date.now(),
    };
    try {
      av.realtimeSendDataMessage(EVENTS.HOST_CONTROLS, dmEncode(message), 5000);
    } catch (e) {
      warn("broadcast host action failed", e);
    }
  }

  static handleHostAction(message) {
    if (
      !validate_callback(message, {
        action: { type: "string", required: true },
      })
    )
      return;
    const { action, data } = message;
    log("Host action recv:", action, data);
    const av = CamMicHandler._state.av;
    switch (action) {
      case "mute-all": {
        if (data) {
          av?.realtimeMuteLocalAudio?.();
          CamMicHandler._state.isMuted = true;
          HostControlsHandler.showNotification("Host has muted all attendees");
        } else {
          av?.realtimeUnmuteLocalAudio?.();
          CamMicHandler._state.isMuted = false;
          HostControlsHandler.showNotification(
            "Host has unmuted all attendees"
          );
        }
        CamMicHandler.updateToggleButtonText();
        CamMicHandler.refreshSelfStatus();
        break;
      }
      case EVENTS.ASSIGN_HOST: {
        const newHostId = data.attendeeId;
        HostControlsHandler._state.hostAttendeeId = newHostId;

        // Update global host
        serverHostId = newHostId;

        if (newHostId === HostControlsHandler._state.currentUser) {
          HostControlsHandler._state.isHost = true;
          HostControlsHandler.showHostControls();
        } else {
          HostControlsHandler._state.isHost = false;
          HostControlsHandler.hideHostControls();
        }
        break;
      }
      case "mute-attendee": {
        if (data.attendeeId === HostControlsHandler._state.currentUser) {
          if (data.muted) {
            av?.realtimeMuteLocalAudio?.();
            CamMicHandler._state.isMuted = true;
            HostControlsHandler.showNotification("Host has muted your audio");
          } else {
            av?.realtimeUnmuteLocalAudio?.();
            CamMicHandler._state.isMuted = false;
            HostControlsHandler.showNotification("Host has unmuted your audio");
          }
          CamMicHandler.updateToggleButtonText();
          CamMicHandler.refreshSelfStatus();
        }
        HostControlsHandler.updateAttendeeState(data.attendeeId, {
          audioMuted: data.muted,
        });
        HostControlsHandler.renderAttendeeList();
        break;
      }
      case "video-attendee": {
        if (data.attendeeId === HostControlsHandler._state.currentUser) {
          if (!data.enabled) {
            av?.stopLocalVideoTile?.();
            CamMicHandler._state.isVideoOn = false;
            HostControlsHandler.showNotification(
              "Host has turned off your video"
            );
          } else {
            av?.startLocalVideoTile?.();
            CamMicHandler._state.isVideoOn = true;
            HostControlsHandler.showNotification(
              "Host has turned on your video"
            );
          }
          CamMicHandler.updateToggleButtonText();
          CamMicHandler.refreshSelfStatus();
        }
        HostControlsHandler.updateAttendeeState(data.attendeeId, {
          videoOn: data.enabled,
        });
        HostControlsHandler.renderAttendeeList();
        break;
      }
      case "remove-attendee": {
        if (data === HostControlsHandler._state.currentUser) {
          HostControlsHandler.showNotification(
            "You have been removed from the meeting"
          );
          setTimeout(() => {
            try {
              av?.stop?.();
            } catch {}
          }, 1000);
        }
        break;
      }
      case "update-collaborators": {
        if (!Array.isArray(data)) break;
        HostControlsHandler._state.collaborators = new Set(data);
        HostControlsHandler.renderAttendeeList();
        HostControlsHandler.showNotification("Collaborators updated");
        break;
      }
    }
  }
  static showNotification(message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

function loadChimeSDK() {
  return new Promise((resolve, reject) => {
    function ok() {
      resolve();
    }
    if (
      window.ChimeSDK ||
      window.AmazonChimeSDK ||
      window.chimeSDK ||
      window.appChimeSDK
    )
      return ok();
    const s = document.createElement("script");
    s.src =
      "https://fs.codelinden.com/wp-content/plugins/fansocial/assets/chime-final-test/chime.min.js";
    s.onload = () => {
      console.log("[CHIME] SDK loaded (fs.codelinden.com)");
      ok();
    };
    s.onerror = () => {
      const c = document.createElement("script");
      c.src =
        "https://static.sdkassets.chime.aws/sdk/latest/amazon-chime-sdk.min.js";
      c.onload = () => {
        console.log("[CHIME] SDK loaded (AWS CDN)");
        ok();
      };
      c.onerror = () => {
        console.error("[CHIME] SDK failed to load");
        reject(new Error("SDK load failed"));
      };
      document.head.appendChild(c);
    };
    document.head.appendChild(s);
  });
}

function SDK() {
  return (
    window.ChimeSDK ||
    window.AmazonChimeSDK ||
    window.chimeSDK ||
    window.appChimeSDK ||
    null
  );
}
function ROOT() {
  const ns = SDK();
  return ns ? ns.default || ns : null;
}

(function () {
  const $ = (sel) => document.querySelector(sel);
  const on = (n, ev, fn) => n && n.addEventListener(ev, fn);
  const set = (n, k, v) => n && n.setAttribute(k, v);

  // Simple event bus
  const Bus = {
    on(type, fn) {
      window.addEventListener(type, fn);
    },
    emit(type, detail) {
      window.dispatchEvent(new CustomEvent(type, { detail }));
    },
  };

  const els = {
    url: $("[data-url]"),
    perms: $("[data-perms]"),
    start: $("[data-start]"),
    stop: $("[data-stop]"),
    selV: $("[data-video]"),
    selA: $("[data-audio]"),
    selO: $("[data-out]"),
    prevAll: Array.from(document.querySelectorAll("[data-preview]")),
    local: $("[data-local]"),
    remotes: $("[data-remotes]"),
    audioEl: $("[data-audio-el]"),
    status: $("[data-status]"),
    timer: $("[data-timer]"),
    q: $("[data-q]"),
    roster: $("[data-roster]"),
    selfStatus: $("[data-status-self]"),
    mainVideo: $("[data-main-video]"),
    mainVideoStatus: $("[data-main-video-status]"),
    localSidebar: $("[data-local-video-sidebar]"),
  };

  window.__chimeEls = els;

  const state = {
    meetingSession: null,
    av: null,
    observer: null,
    timerId: null,
    startedAt: 0,
    devicesLocked: false,
    videoDevice: "",
    audioDevice: "",
    outputDevice: "",
    localTileId: null,
    remoteTileIds: new Set(),
    selfId: null,
    lastQualityLevel: "good",
    lastQualitySentAt: 0,
    tiles: new Map(), // tileId -> attendeeId
    badges: new Map(), // attendeeId -> HTMLElement
    roster: new Map(), // attendeeId -> {audioMuted, videoOn, quality, externalUserId}
    backgroundFilter: {
      enabled: false,
      type: "none", // none, blur-low, blur-medium, blur-high, replacement
      imageUrl: "",
      processor: null,
      transformDevice: null
    },
  };

  window.__chimeState = state;
  state.names = new Map();
  state.sentName = false;

  let previewStream = null;

  /* ---------- Utilities ---------- */
  const Utils = {
    safeJSON(s) {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    },
    dmEncode(o) {
      return JSON.stringify(o);
    },
    dmDecode(msg) {
      try {
        if (typeof msg.text === "function") return JSON.parse(msg.text());
      } catch {}
      try {
        const t = new TextDecoder().decode(msg.data);
        return JSON.parse(t);
      } catch {}
      return null;
    },
    levelFromHealth({ down = 0, up = 0, loss = 0 }) {
      return down < 1000 || up < 64 || loss >= 5
        ? "bad"
        : down < 3000 || up < 150 || loss >= 2
        ? "fair"
        : "good";
    },
    statusText(s) {
      return `${s.audioMuted ? "🔇" : "🎤"}  ${
        s.videoOn ? "🎥 On" : "🎥 Off"
      }  Q:${s.quality || "n/a"}`;
    },
    ensureBadge(attendeeId, afterNode) {
      if (state.badges.has(attendeeId)) return state.badges.get(attendeeId);
      const d = document.createElement("div");
      d.className = "statusline";
      d.setAttribute("data-badge", attendeeId);
      afterNode?.insertAdjacentElement("afterend", d);
      state.badges.set(attendeeId, d);
      return d;
    },
    renderBadge(attendeeId) {
      const s = state.roster.get(attendeeId) || {};
      const el = state.badges.get(attendeeId);
      if (!el) return;
      el.innerHTML = `
        <span class="badge b-audio ${s.audioMuted ? "muted" : "live"}">${
        s.audioMuted ? "🔇 Muted" : "🎤 Live"
      }</span>
        <span class="badge b-video ${s.videoOn ? "on" : "off"}">${
        s.videoOn ? "🎥 On" : "🎥 Off"
      }</span>
        <span class="badge b-q ${s.quality || "good"}">Q: ${
        s.quality || "good"
      }</span>
        <span class="mono" style="opacity:.6">${attendeeId}</span>
      `;
    },
    upsertRoster(attendeeId, patch) {
      const cur = state.roster.get(attendeeId) || {
        audioMuted: null,
        videoOn: null,
        quality: "good",
        externalUserId: null,
      };
      const next = Object.assign(cur, patch || {});
      state.roster.set(attendeeId, next);
      Utils.renderRoster();
      if (state.badges.has(attendeeId)) Utils.renderBadge(attendeeId);
    },
    renderRoster() {
      if (!els.roster) return;
      const lines = [];
      state.roster.forEach((v, k) => {
        lines.push(
          `${k.slice(0, 8)} …  ${v.audioMuted ? "🔇" : "🎤"}  ${
            v.videoOn ? "🎥 On" : "🎥 Off"
          }  Q:${v.quality || "good"}`
        );
      });
      els.roster.textContent = lines.join("\n");
    },
    sendMyNameOnce() {
      if (state.sentName) return;
      const nameEl = document.getElementById("username-input");
      const name =
        (nameEl?.value || "").trim() || (state.selfId || "").slice(0, 8);
      if (!state.av || !state.selfId) return;
      try {
        state.av.realtimeSendDataMessage(
          EVENTS.STATE,
          Utils.dmEncode({ type: "name", attendeeId: state.selfId, name }),
          5000
        );
        state.names.set(state.selfId, name);
        state.sentName = true;
        this.refreshVideoLabelsFor(state.selfId);
      } catch {}
    },
    getDisplayNameFor(attendeeId) {
      const a = HostControlsHandler?._state?.attendees?.get(attendeeId);
      return (
        state.names?.get(attendeeId) || a?.name || attendeeId?.slice(0, 8) || ""
      );
    },
    getAvatarFor(attendeeId) {
      const a = HostControlsHandler?._state?.attendees?.get(attendeeId) || {};
      return {
        initial: (
          a.avatarInitial || (a.name || attendeeId || "").charAt(0)
        ).toUpperCase(),
        color: a.avatarColor || "#666",
      };
    },
    ensureVideoLabel(videoEl) {
      if (!videoEl) return null;
      let label = videoEl.parentElement?.querySelector?.("[data-video-label]");
      if (!label) {
        label = document.createElement("div");
        label.setAttribute("data-video-label", "1");
        label.style.cssText =
          "position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:6px;padding:4px 8px;background:rgba(0,0,0,0.5);color:#fff;font-size:12px;line-height:1;border-top-left-radius:4px;border-top-right-radius:4px;pointer-events:none;";
        const wrap = document.createElement("div");
        wrap.style.position = "relative";
        videoEl.parentElement?.insertBefore(wrap, videoEl);
        wrap.appendChild(videoEl);
        wrap.appendChild(label);
      }
      return label;
    },
    setVideoBadge(videoEl, attendeeId) {
      const label = this.ensureVideoLabel(videoEl);
      if (!label) return;
      const name = this.getDisplayNameFor(attendeeId);
      label.innerHTML = name;
    },
    refreshVideoLabelsFor(attendeeId) {
      try {
        const av = window.state?.av;
        if (!attendeeId) return;

        // Main video
        const mainVideo = document.querySelector("[data-main-video]");
        if (mainVideo) {
          // Find if main currently bound to this attendee
          for (const [tileId, attId] of window.state.tiles.entries()) {
            if (attId === attendeeId) {
              this.setVideoBadge(mainVideo, attendeeId);
              break;
            }
          }
        }

        const localVideo = document.querySelector("[data-local]");
        if (localVideo) {
          if (attendeeId === window.state.selfId) {
            this.setVideoBadge(localVideo, attendeeId);
          }
        }

        for (const [tileId, attId] of window.state.tiles.entries()) {
          if (attId !== attendeeId) continue;
          const el = document.getElementById(`remote-${tileId}`);
          if (el) this.setVideoBadge(el, attendeeId);
        }
      } catch (e) {
        console.warn("refreshVideoLabelsFor failed", e);
      }
    },
  };

  /* ---------- Permissions / preview ---------- */
  on(els.perms, "click", async () => {
    console.log("[CamMic] Requesting camera + microphone access…");
    await CamMic.requestCameraAndMicrophone();
    await populateDevices();
    if (state.videoDevice) await startPreview(state.videoDevice);
  });

  on(els.selV, "change", async (e) => {
    const deviceId = e.target.value;
    state.videoDevice = deviceId;
    try {
      if (state.av) {
        await switchVideoInput(deviceId);
      } else {
        await startPreview(deviceId);
      }
    } catch (ex) {
      console.warn("video device switch failed", ex);
    }
  });
  on(els.selA, "change", async (e) => {
    const deviceId = e.target.value;
    state.audioDevice = deviceId;
    try {
      if (state.av) {
        await switchAudioInput(deviceId);
      }
    } catch (ex) {
      console.warn("audio device switch failed", ex);
    }
  });
  on(els.selO, "change", async (e) => {
    if (state.devicesLocked) return;
    state.outputDevice = e.target.value;
    try {
      if (els.audioEl?.setSinkId)
        await els.audioEl.setSinkId(state.outputDevice);
    } catch (ex) {
      console.warn("setSinkId failed", ex);
    }
  });

  /* ---------- Start ---------- */
  on(els.start, "click", async () => {
    await stopPreview();
    try {
      await loadChimeSDK();
      const Root = ROOT();
      if (!Root) {
        alert("Chime SDK not available");
        return;
      }

      HostControlsHandler.init();
      BackgroundFilterHandler.init();

      const {
        ConsoleLogger,
        DefaultDeviceController,
        MeetingSessionConfiguration,
        DefaultMeetingSession,
      } = Root;
      const logger = new ConsoleLogger("MeetingLogger");
      const deviceController = new DefaultDeviceController(logger);

      const params = new URLSearchParams(location.search);
      const info = Utils.safeJSON(atob(params.get("meetingInfo") || "")) || {};
      console.log("[Meeting] Parsed meeting info:", info);
      serverHostId = info.hostAttendeeId;
      console.log("[Meeting] Server host ID:", serverHostId);

      const isHost = !!info.isHost;
      const isGroupCall = !!info.isGroupCall;
      const maxAttendees = info.maxAttendees || 10;
      const hostAttendeeId = info.hostAttendeeId || null;
      const collabs = Array.isArray(info.collaborators)
        ? info.collaborators
        : [];
      HostControlsHandler._state.collaborators = new Set(collabs);

      const usernameInput = document.getElementById("username-input");
      const username = usernameInput?.value?.trim();

      if (!username) {
        alert("Please enter your name before starting the meeting");
        return;
      }

      const avatarInfo = generateAvatar(username);

      if (isHost) {
        showMeetingDetailsForm();
        hideMeetingDetailsDisplay();
      } else {
        hideMeetingDetailsForm();
        if (info.meetingDetails) {
          updateMeetingDetailsDisplay(info.meetingDetails);
          showMeetingDetailsDisplay();
        }
      }

      HostControlsHandler.setMeetingState(
        isHost,
        info.Meeting?.MeetingId || null,
        info.Attendee?.AttendeeId || null,
        isGroupCall,
        maxAttendees,
        hostAttendeeId
      );
      HostControlsHandler.setHostState(
        isHost,
        info.Meeting?.MeetingId || null,
        info.Attendee?.AttendeeId || null
      );

      const configuration = new MeetingSessionConfiguration(
        info.Meeting,
        info.Attendee
      );
      const session = new DefaultMeetingSession(
        configuration,
        logger,
        deviceController
      );

      try {
        const mid =
          state.meetingSession?.configuration?.meetingId ||
          info.Meeting?.MeetingId;
        if (mid) {
          const resp = await fetch(`/meeting-details/${mid}`);
          if (resp.ok) {
            const json = await resp.json();
            const details = json?.meetingDetails;
            if (
              details &&
              (details.title || details.topic || details.discussionPoints)
            ) {
              updateMeetingDetailsDisplay(details);
              showMeetingDetailsDisplay();
            }
          }
        }
      } catch (e) {
        console.warn("fetch meeting-details failed", e);
      }

      state.meetingSession = session;
      const av = session.audioVideo;
      state.av = av;

      // -----------------------------
      // Video tiles wiring (local + remote)
      // -----------------------------
      try {
        if (!window.__videoTilesWired) {
          window.__videoTilesWired = true;

          const remotesWrap = document.querySelector('[data-remotes]');
          const localVideoEl = document.querySelector('[data-local]');
          const tileIdToEl = new Map();

          function createRemoteVideoElement(tileId) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = false;
            video.dataset.tileId = String(tileId);
            video.style.width = '100%';
            video.style.background = '#000';
            return video;
          }

          const tilesObserver = {
            videoTileDidUpdate: (tileState) => {
              if (tileState.isContent) return;

              if (tileState.localTile) {
                if (localVideoEl && tileState.tileId) {
                  try { av.bindVideoElement(tileState.tileId, localVideoEl); } catch {}
                }
                return;
              }

              const tileId = tileState.tileId;
              if (!tileId) return;

              if (tileState.active && tileState.boundAttendeeId) {
                let el = tileIdToEl.get(tileId);
                if (!el) {
                  el = createRemoteVideoElement(tileId);
                  tileIdToEl.set(tileId, el);
                  remotesWrap && remotesWrap.appendChild(el);
                }
                try { av.bindVideoElement(tileId, el); } catch {}
              } else {
                const el = tileIdToEl.get(tileId);
                if (el) {
                  try { av.unbindVideoElement(tileId); } catch {}
                  el.remove();
                  tileIdToEl.delete(tileId);
                }
              }
            },
            videoTileWasRemoved: (tileId) => {
              const el = tileIdToEl.get(tileId);
              if (el) {
                try { av.unbindVideoElement(tileId); } catch {}
                el.remove();
                tileIdToEl.delete(tileId);
              }
            },
          };

          try { av.addObserver(tilesObserver); } catch {}

          const toggleVideoBtn = document.querySelector('[data-toggle-video]');
          if (toggleVideoBtn) {
            let videoOn = false;
            toggleVideoBtn.disabled = false;
            toggleVideoBtn.textContent = 'Video Off';
            toggleVideoBtn.addEventListener('click', async () => {
              try {
                if (!videoOn) {
                  const devices = await av.listVideoInputDevices();
                  if (devices?.length) await av.chooseVideoInputDevice(devices[0].deviceId);
                  await av.startLocalVideoTile();
                  videoOn = true;
                  toggleVideoBtn.textContent = 'Video On';
                } else {
                  await av.stopLocalVideoTile();
                  videoOn = false;
                  toggleVideoBtn.textContent = 'Video Off';
                }
              } catch (e) {
                console.warn('[VIDEO] toggle failed', e);
              }
            });
          }
        }
      } catch {}

      try {
        if (typeof av.setMaxVideoTileCount === "function")
          av.setMaxVideoTileCount(16);
      } catch {}

      state.selfId = configuration.credentials?.attendeeId || null;

      const nameInput = document.getElementById("username-input");
      const name = (nameInput?.value || "").trim() || state.selfId?.slice(0, 8);
      state.names.set(state.selfId, name);
      try {
        state.av?.realtimeSendDataMessage?.(
          EVENTS.STATE,
          Utils.dmEncode({ type: "name", attendeeId: state.selfId, name }),
          5000
        );
      } catch {}

      CamMicHandler.setMeetingState(session, av, state.selfId);

      state.devicesLocked = false;
      [els.selV, els.selA, els.selO].forEach((s) => s && (s.disabled = false));
      els.audioEl && av.bindAudioElement?.(els.audioEl);

      // Choose inputs (defensive)
      if (state.audioDevice) {
        try {
          if (typeof av.startAudioInput === "function")
            await av.startAudioInput(state.audioDevice);
          else if (typeof av.chooseAudioInputDevice === "function")
            await av.chooseAudioInputDevice(state.audioDevice);
        } catch (e) {
          console.warn("audio input failed", e);
        }
      }
      if (state.videoDevice) {
        try {
          if (typeof av.chooseVideoInputDevice === "function")
            await av.chooseVideoInputDevice(state.videoDevice);
          if (typeof av.startVideoInput === "function")
            await av.startVideoInput(state.videoDevice);
        } catch (e) {
          console.warn("video input setup failed", e);
        }
      } else {
        console.warn("No video device selected - requesting permissions first");
        await CamMic.requestCameraAndMicrophone();
        await populateDevices();
        try {
          if (state.audioDevice) {
            if (typeof av.startAudioInput === "function")
              await av.startAudioInput(state.audioDevice);
            else if (typeof av.chooseAudioInputDevice === "function")
              await av.chooseAudioInputDevice(state.audioDevice);
          }
        } catch (e) {
          console.warn("audio input setup failed after permission", e);
        }
        try {
          if (state.videoDevice) {
            if (typeof av.chooseVideoInputDevice === "function")
              await av.chooseVideoInputDevice(state.videoDevice);
            if (typeof av.startVideoInput === "function")
              await av.startVideoInput(state.videoDevice);
          }
        } catch (e) {
          console.warn("video input setup failed after permission", e);
        }
      }

      if (state.outputDevice && els.audioEl?.setSinkId) {
        try {
          await els.audioEl.setSinkId(state.outputDevice);
        } catch (e) {
          console.warn("setSinkId failed", e);
        }
      }

      // Observers
      if (state.observer) {
        try {
          state.av?.removeObserver(state.observer);
        } catch {}
      }
      state.observer = {
        audioVideoDidStartConnecting: (reconnecting) => {
          setStatus("connecting");
          console.log("[CHIME] connecting", { reconnecting });
        },
        audioVideoDidStart: () => {
          setStatus("connected");
          console.log("[CHIME] connected");
          startTimer();
          CamMicHandler.enableInCallControls(true);
          BackgroundFilterHandler.enableControls(true);
          Utils.sendMyNameOnce();
        },

        audioVideoDidStop: (status) => {
          setStatus("disconnected");
          console.log("[CHIME] stopped", status);
          stopTimer();
          CamMicHandler.enableInCallControls(false);
          BackgroundFilterHandler.enableControls(false);
        },

        videoTileDidUpdate: (tile) => {
          console.log("[VideoTile] update:", {
            tileId: tile.tileId,
            local: tile.localTile,
            active: tile.active,
            attendee: tile.boundAttendeeId,
            serverHostId: serverHostId,
          });

          const av = CamMicHandler._state.av;
          if (!av) {
            console.warn("[VideoTile] No audioVideo available");
            return;
          }

          if (tile.localTile) {
            state.localTileId = tile.tileId;
            log(
              "Processing local video tile for user:",
              tile.boundAttendeeId,
              "active:",
              tile.active
            );

            if (tile.boundAttendeeId === serverHostId) {
              const mainVideo = $$(SELECTORS.mainVideo);
              if (mainVideo) {
                try {
                  av.bindVideoElement(tile.tileId, mainVideo);
                  Utils.setVideoBadge(mainVideo, tile.boundAttendeeId);
                  mainVideo.style.display = tile.active ? "block" : "none";
                  log(
                    "Host local video bound to main video, active:",
                    tile.active
                  );
                } catch (e) {
                  console.warn("Failed to bind host local video to main:", e);
                }
              } else {
                console.warn("[VideoTile] Main video element not found");
              }
            } else {
              const localVideo = $$(SELECTORS.localVideo);
              const localSidebar = document.getElementById(
                "local-video-sidebar"
              );
              if (localVideo && localSidebar) {
                try {
                  av.bindVideoElement(tile.tileId, localVideo);
                  Utils.setVideoBadge(localVideo, tile.boundAttendeeId);
                  localSidebar.hidden = !tile.active;
                  localVideo.style.display = tile.active ? "block" : "none";
                  log(
                    "Attendee local video bound to sidebar, active:",
                    tile.active
                  );
                } catch (e) {
                  console.warn(
                    "Failed to bind attendee local video to sidebar:",
                    e
                  );
                }
              } else {
                console.warn("[VideoTile] Local video elements not found:", {
                  localVideo,
                  localSidebar,
                });
              }
            }
          } else {
            const attendeeId = tile.boundAttendeeId;
            log(
              "Processing remote video tile for attendee:",
              attendeeId,
              "active:",
              tile.active
            );

            state.tiles.set(tile.tileId, attendeeId);
            state.remoteTileIds.add(tile.tileId);

            if (attendeeId === serverHostId) {
              const mainVideo = $$(SELECTORS.mainVideo);
              if (mainVideo) {
                try {
                  av.bindVideoElement(tile.tileId, mainVideo);
                  Utils.setVideoBadge(mainVideo, tile.boundAttendeeId);
                  mainVideo.style.display = tile.active ? "block" : "none";
                  log(
                    "Host remote video bound to main video, active:",
                    tile.active
                  );
                } catch (e) {
                  console.warn("Failed to bind host remote video to main:", e);
                }
              } else {
                console.warn(
                  "[VideoTile] Main video element not found for host"
                );
              }
            } else {
              const remotesWrap = $$(SELECTORS.remotesWrap);
              if (remotesWrap) {
                let videoEl = document.getElementById(`remote-${tile.tileId}`);
                if (!videoEl) {
                  videoEl = document.createElement("video");
                  videoEl.id = `remote-${tile.tileId}`;
                  videoEl.autoplay = true;
                  videoEl.playsinline = true;
                  videoEl.muted = true;
                  videoEl.style.width = "200px";
                  videoEl.style.background = "#000";
                  remotesWrap.appendChild(videoEl);
                  log("Created remote video element:", videoEl.id);
                }

                try {
                  av.bindVideoElement(tile.tileId, videoEl);
                  Utils.setVideoBadge(videoEl, attendeeId);
                  videoEl.style.display = tile.active ? "block" : "none";
                  log("Attendee video bound to grid, active:", tile.active);
                } catch (e) {
                  console.warn("Failed to bind attendee video to grid:", e);
                }
              } else {
                console.warn("[VideoTile] Remotes wrapper not found");
              }
            }
          }
        },

        realtimeSubscribeToAttendeeIdPresence: (attendeeId, present) => {
          console.log("[Attendee] presence:", attendeeId, present);
          if (present) {
            if (
              attendeeId === HostControlsHandler._state.currentUser &&
              HostControlsHandler._state.isHost
            ) {
              HostControlsHandler.addAttendee(attendeeId, "You (Host)", true);
              log("Added self as host");
            } else if (attendeeId !== HostControlsHandler._state.currentUser) {
              HostControlsHandler.addAttendee(
                attendeeId,
                attendeeId.slice(0, 8)
              );
              log("Added remote attendee:", attendeeId);
            } else {
              // This is the current user but not host
              HostControlsHandler.addAttendee(attendeeId, "You", false);
              log("Added self as attendee (non-host)");
            }

            if (attendeeId === state.selfId) {
              Utils.sendMyNameOnce();
            }

            const attendeeCount = HostControlsHandler._state.attendees.size;
            if (attendeeCount >= 2 && !HostControlsHandler._state.isGroupCall) {
              HostControlsHandler._state.isGroupCall = true;
              HostControlsHandler.updateMeetingInfo();
              if (HostControlsHandler._state.isHost)
                HostControlsHandler.showHostControls();
              // Completely remove updateMainVideo calls
            }
          } else {
            HostControlsHandler.removeAttendee(attendeeId);

            const tilesToRemove = [];
            state.tiles.forEach((tileAttendeeId, tileId) => {
              if (tileAttendeeId === attendeeId) {
                tilesToRemove.push(tileId);
              }
            });

            tilesToRemove.forEach((tileId) => {
              const v = document.getElementById("remote-" + tileId);
              if (v) {
                v.remove();
                console.log("[Attendee] removed video tile:", tileId);
              }
              state.tiles.delete(tileId);
              state.remoteTileIds.delete(tileId);
            });

            const attendeeCount = HostControlsHandler._state.attendees.size;
            if (attendeeCount < 2 && HostControlsHandler._state.isGroupCall) {
              HostControlsHandler._state.isGroupCall = false;
              HostControlsHandler.updateMeetingInfo();
              HostControlsHandler.hideHostControls();
            }

            if (attendeeId !== state.selfId) {
              HostControlsHandler.showNotification(
                `Attendee ${attendeeId.slice(0, 8)} has left the meeting`
              );
            }
            // Completely remove updateMainVideo calls
          }
        },

        videoTileWasRemoved: (tileId) => {
          console.log("[VideoTile] removed:", tileId);

          // Handle local tile removal
          if (state.localTileId === tileId) {
            state.localTileId = null;
            const localVideo = $$(SELECTORS.localVideo);
            if (localVideo) {
              localVideo.srcObject = null;
              localVideo.style.display = "none";
            }
            const localSidebar = document.getElementById("local-video-sidebar");
            if (localSidebar) {
              localSidebar.hidden = true;
            }
            return;
          }

          // Handle remote tile removal
          if (state.remoteTileIds.has(tileId)) {
            state.remoteTileIds.delete(tileId);
            const v = document.getElementById("remote-" + tileId);
            if (v) {
              v.remove();
              console.log("[VideoTile] removed remote video element:", tileId);
            }

            const attId = state.tiles.get(tileId);
            if (attId) {
              state.tiles.delete(tileId);
              Utils.upsertRoster(attId, { videoOn: false });
              console.log(
                "[VideoTile] updated roster for removed attendee:",
                attId
              );
            }
          }
        },
      };
      av.addObserver(state.observer);

      // Presence + volume
      av.realtimeSubscribeToAttendeeIdPresence?.(
        (attendeeId, present, externalUserId) => {
          if (present) {
            const isHostUser =
              attendeeId === HostControlsHandler._state.currentUser &&
              HostControlsHandler._state.isHost;
            HostControlsHandler.addAttendee(
              attendeeId,
              externalUserId || attendeeId.slice(0, 8),
              isHostUser
            );
            Utils.upsertRoster(attendeeId, { externalUserId, videoOn: false });

            const attendeeCount = HostControlsHandler._state.attendees.size;
            if (attendeeCount >= 2 && !HostControlsHandler._state.isGroupCall) {
              HostControlsHandler._state.isGroupCall = true;
              HostControlsHandler.updateMeetingInfo();
              if (HostControlsHandler._state.isHost)
                HostControlsHandler.showHostControls();
              // Remove updateMainVideo call
            }

            av.realtimeSubscribeToVolumeIndicator?.(
              attendeeId,
              (volumeAttendeeId, volume, muted) => {
                Utils.upsertRoster(volumeAttendeeId, { audioMuted: !!muted });
                HostControlsHandler.updateAttendeeState(volumeAttendeeId, {
                  audioMuted: !!muted,
                });
              }
            );
          } else {
            HostControlsHandler.removeAttendee(attendeeId);
            Utils.upsertRoster(attendeeId, {
              audioMuted: true,
              videoOn: false,
            });

            const attendeeCount = HostControlsHandler._state.attendees.size;
            if (attendeeCount < 2 && HostControlsHandler._state.isGroupCall) {
              HostControlsHandler._state.isGroupCall = false;
              HostControlsHandler.updateMeetingInfo();
              HostControlsHandler.hideHostControls();
            }

            if (attendeeId !== state.selfId) {
              HostControlsHandler.showNotification(
                `Attendee ${attendeeId.slice(0, 8)} has left the meeting`
              );
            }
            // Remove updateMainVideo call
          }
        }
      );

      // Host controls messages
      av.realtimeSubscribeToReceiveDataMessage?.(
        EVENTS.HOST_CONTROLS,
        (msg) => {
          try {
            const data = JSON.parse(msg.text());
            HostControlsHandler.handleHostAction(data);
          } catch (e) {
            console.warn("Failed to parse host action message:", e);
          }
        }
      );

      // State messages
      av.realtimeSubscribeToReceiveDataMessage?.(EVENTS.STATE, (msg) => {
        const data = Utils.dmDecode(msg) || {};
        if (!data.type || !data.attendeeId) return;

        log("Received state message:", data);

        switch (data.type) {
          case "audio":
            Utils.upsertRoster(data.attendeeId, { audioMuted: !!data.muted });
            HostControlsHandler.updateAttendeeState(data.attendeeId, {
              audioMuted: !!data.muted,
            });
            HostControlsHandler.renderAttendeeList();
            log(
              "Updated audio state for attendee:",
              data.attendeeId,
              "muted:",
              data.muted
            );
            break;
          case "video":
            Utils.upsertRoster(data.attendeeId, { videoOn: !!data.enabled });
            HostControlsHandler.updateAttendeeState(data.attendeeId, {
              videoOn: !!data.enabled,
            });
            HostControlsHandler.renderAttendeeList();
            log(
              "Updated video state for attendee:",
              data.attendeeId,
              "enabled:",
              data.enabled
            );
            break;
          case "quality":
            Utils.upsertRoster(data.attendeeId, { quality: data.level });
            break;

          case "assign-host": {
            const newHostId = data.attendeeId;
            HostControlsHandler._state.hostAttendeeId = newHostId;

            if (newHostId === HostControlsHandler._state.currentUser) {
              HostControlsHandler._state.isHost = true;
              HostControlsHandler.showHostControls();
            } else {
              HostControlsHandler._state.isHost = false;
              HostControlsHandler.hideHostControls();
            }
            break;
          }
          case "meeting-details-update": {
            const meetingInfo = {
              title: data.title,
              topic: data.topic,
              discussionPoints: data.discussionPoints,
            };
            updateMeetingDetailsDisplay(meetingInfo);
            showMeetingDetailsDisplay();
            break;
          }
          case "name": {
            state.names.set(
              data.attendeeId,
              data.name || data.attendeeId.slice(0, 8)
            );
            Utils.refreshVideoLabelsFor(data.attendeeId);
            HostControlsHandler.renderAttendeeList();
            break;
          }
        }
      });

      // Connection health → quality broadcast (5000ms TTL)
      const subHealth =
        av.subscribeToConnectionHealthChanges ||
        av.realtimeSubscribeToConnectionHealth;
      if (typeof subHealth === "function") {
        subHealth.call(av, (d) => {
          const down = d.downlinkBandwidthKbps || 0;
          const up = d.uplinkBandwidthKbps || 0;
          const loss = Math.max(d.consecutivePacketLosses || 0, 0);
          const lvl =
            down < 500 || up < 200 || loss >= 3
              ? "bad"
              : down < 1000 || up < 500 || loss >= 1
              ? "fair"
              : "good";
          set(els.q, "data-level", lvl);
          state.lastQualityLevel = lvl;
          Utils.upsertRoster(state.selfId || "self", { quality: lvl });

          const now = Date.now();
          if (state.av && now - state.lastQualitySentAt > 2000) {
            try {
              state.av.realtimeSendDataMessage(
                EVENTS.STATE,
                Utils.dmEncode({
                  type: "quality",
                  level: lvl,
                  attendeeId: state.selfId,
                }),
                5000 // TTL ms
              );
            } catch {}
            state.lastQualitySentAt = now;
          }

          Bus.emit("quality", { level: lvl, down, up, loss });
        });
      } else {
        console.warn(
          "[CHIME] No connection health subscription API on audioVideo"
        );
      }

      // start session
      await av.start();
      try {
        state.av.realtimeUnmuteLocalAudio?.();
      } catch {}
      await stopPreview();

      log("Video device before startLocalVideoTile:", state.videoDevice);
      log("Video device element value:", els.selV?.value);

      if (state.videoDevice) {
        log("Starting local video tile with device:", state.videoDevice);
        await av.startLocalVideoTile?.();
        state.isVideoOn = true;
        log("Local video tile started, isVideoOn:", state.isVideoOn);
      } else {
        log("No video device selected, setting isVideoOn to false");
        state.isVideoOn = false;
      }

      // init own roster + badges
      Utils.ensureBadge(state.selfId, els.local);
      Utils.upsertRoster(state.selfId, {
        audioMuted: false,
        videoOn: state.isVideoOn,
        quality: state.lastQualityLevel,
      });
      CamMicHandler.refreshSelfStatus();

      // Reactions: subscribe to incoming reaction messages
      try {
        av?.realtimeSubscribeToReceiveDataMessage?.(EVENTS.REACTION, (msg) => {
          try {
            const decoded = dmDecode(msg) || msg?.text?.() || "LOVE";
            const payload = typeof decoded === "string" ? decoded : decoded?.payload || "LOVE";
            if (payload === "LOVE") showToast("❤️ LOVE reaction");
            if (payload === "LOVE") showCenterReaction("❤️");
          } catch {
            showToast("❤️ LOVE reaction");
            showCenterReaction("❤️");
          }
        });
      } catch {}

      // Enable LOVE button after join and wire click to send reaction
      try {
        const loveBtn = $$(SELECTORS.loveBtn);
        if (loveBtn) {
          loveBtn.disabled = false;
          loveBtn.onclick = () => {
            try {
              // Prefer Socket.io if available on the page
              if (window.io && window.socket) {
                window.socket.emit && window.socket.emit("reaction", "LOVE");
              } else {
                // Fallback to Chime DataMessage broadcast
                state.av?.realtimeSendDataMessage?.(EVENTS.REACTION, "LOVE", 1000);
              }
              showToast("❤️ LOVE sent");
              showCenterReaction("❤️");
            } catch {}
          };
        }
      } catch {}
    } catch (err) {
      console.error("[CHIME] start error", err);
      alert("Start failed. Open console for details.");
    }
  });

  /* ---------- Stop ---------- */
  on(els.stop, "click", async () => {
    try {
      const av = state.meetingSession?.audioVideo;
      try {
        await av?.stopLocalVideoTile?.();
      } catch {}
      try {
        await av?.stopVideoInput?.();
      } catch {}
      try {
        await av?.stopAudioInput?.();
      } catch {}
      try {
        await av?.stop?.();
      } catch {}
      if (state.observer) {
        try {
          av?.removeObserver(state.observer);
        } catch {}
        state.observer = null;
      }
      await stopPreview();
    } catch (e) {
      console.warn("Stop error", e);
    }

    cleanupAllVideoElements();
    setStatus("disconnected");
    stopTimer();
    state.devicesLocked = false;
    [els.selV, els.selA, els.selO].forEach((s) => s && (s.disabled = false));
    CamMicHandler.enableInCallControls(false);
    BackgroundFilterHandler.enableControls(false);
    if (state.videoDevice) await startPreview(state.videoDevice);
  });

  /* ---------- Helpers ---------- */
  async function switchAudioInput(deviceId) {
    try {
      const av = state.av;
      if (!av || !deviceId) return;
      if (typeof av.startAudioInput === "function") {
        await av.startAudioInput(deviceId);
      } else if (typeof av.chooseAudioInputDevice === "function") {
        await av.chooseAudioInputDevice(deviceId);
      }
    } catch (e) {
      console.warn("switchAudioInput failed", e);
    }
  }

  async function switchVideoInput(deviceId) {
    try {
      const av = state.av;
      if (!av || !deviceId) return;

      const useBg = !!state.backgroundFilter?.enabled;
      const transformDevice = state.backgroundFilter?.transformDevice;

      if (useBg && transformDevice) {
        try {
          if (typeof transformDevice.chooseNewInnerDevice === "function") {
            await transformDevice.chooseNewInnerDevice(deviceId);
            await av.startVideoInput(transformDevice);
            console.log(`[VIDEO] Switched to camera via transform: ${deviceId}`);
            // Ensure local element reflects change immediately
            try {
              if (state.localTileId && els.local) {
                av.bindVideoElement(state.localTileId, els.local);
              }
            } catch {}
            return;
          }
        } catch (e) {
          console.warn("[VIDEO] chooseNewInnerDevice failed, recreating transform", e);
        }
        try {
          await BackgroundFilterHandler.applyFilter(state.backgroundFilter.type, state.backgroundFilter.imageUrl || "");
          console.log("[VIDEO] Background filter reapplied after camera switch");
          console.log(`[VIDEO] Switched to camera: ${deviceId}`);
          try {
            if (state.localTileId && els.local) {
              av.bindVideoElement(state.localTileId, els.local);
            }
          } catch {}
          return;
        } catch (e) {
          console.warn("[VIDEO] Re-applying background filter failed, falling back to raw device", e);
        }
      }

      if (typeof av.chooseVideoInputDevice === "function") {
        await av.chooseVideoInputDevice(deviceId);
      }
      if (typeof av.startVideoInput === "function") {
        await av.startVideoInput(deviceId);
      }
      console.log(`[VIDEO] Switched to camera: ${deviceId}`);
      try {
        // Rebind local element to reflect new camera instantly
        if (state.localTileId && els.local) {
          av.bindVideoElement(state.localTileId, els.local);
        }
      } catch {}
    } catch (e) {
      console.error("[VIDEO] Video device switch failed:", e);
    }
  }

  async function refreshDeviceLists() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const currentV = state.videoDevice;
      const currentA = state.audioDevice;
      const currentO = state.outputDevice;

      // Video
      if (els.selV) {
        const videoItems = list.filter((d) => d.kind === "videoinput");
        const prev = els.selV.value;
        fill(els.selV, videoItems, "Camera");
        const keep = videoItems.find((d) => d.deviceId === prev) ? prev : (videoItems[0]?.deviceId || "");
        if (keep) els.selV.value = keep;
        state.videoDevice = keep || currentV || state.videoDevice;
      }

      // Audio in
      if (els.selA) {
        const audioItems = list.filter((d) => d.kind === "audioinput");
        const prev = els.selA.value;
        fill(els.selA, audioItems, "Microphone");
        const keep = audioItems.find((d) => d.deviceId === prev) ? prev : (audioItems[0]?.deviceId || "");
        if (keep) els.selA.value = keep;
        state.audioDevice = keep || currentA || state.audioDevice;
      }

      // Audio out
      if (els.selO) {
        const outItems = list.filter((d) => d.kind === "audiooutput");
        const prev = els.selO.value;
        fill(els.selO, outItems, "Speaker");
        const keep = outItems.find((d) => d.deviceId === prev) ? prev : (outItems[0]?.deviceId || "");
        if (keep) els.selO.value = keep;
        state.outputDevice = keep || currentO || state.outputDevice;
      }
    } catch (e) {
      console.warn("refreshDeviceLists failed", e);
    }
  }

  async function handleDeviceChange() {
    try {
      const prevVideo = state.videoDevice;
      const prevAudio = state.audioDevice;
      await refreshDeviceLists();

      const videoStillThere = Array.from(els.selV?.options || []).some(
        (o) => o.value === prevVideo
      );
      const audioStillThere = Array.from(els.selA?.options || []).some(
        (o) => o.value === prevAudio
      );

      // Auto-select first available if previous disappeared
      if (!videoStillThere && els.selV?.value) {
        console.log(`[DEVICE] Camera unplugged or missing: ${prevVideo}. Auto-failover to: ${els.selV.value}`);
        state.videoDevice = els.selV.value;
        if (state.av) await switchVideoInput(state.videoDevice);
      }
      if (!audioStillThere && els.selA?.value) {
        console.log(`[DEVICE] Microphone unplugged or missing: ${prevAudio}. Auto-failover to: ${els.selA.value}`);
        state.audioDevice = els.selA.value;
        if (state.av) await switchAudioInput(state.audioDevice);
      }
    } catch (e) {
      console.warn("[DEVICE] handleDeviceChange failed", e);
    }
  }

  // Listen for hardware changes
  try {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === "function") {
      navigator.mediaDevices.addEventListener("devicechange", () => {
        console.log("[DEVICE] devicechange detected");
        handleDeviceChange().catch(() => {});
      });
    }
  } catch {}
  function cleanupAllVideoElements() {
    if (els.local) els.local.srcObject = null;
    document.querySelectorAll('[id^="remote-"]').forEach((v) => v.remove());
    if (els.remotes) els.remotes.innerHTML = "";
    state.localTileId = null;
    state.remoteTileIds.clear();
    state.tiles.clear();
    state.badges.clear();
    state.roster.clear();
    Utils.renderRoster();
    state.devicesLocked = false;
    [els.selV, els.selA, els.selO].forEach((s) => s && (s.disabled = false));
    console.log("All video elements cleaned up");
  }

  function setStatus(s) {
    els.status?.setAttribute("data-status", s);
    if (els.status) els.status.textContent = s;
  }

  function startTimer() {
    if (state.timerId) return;
    state.startedAt = Date.now();
    if (els.timer) els.timer.textContent = "00:00";
    state.timerId = setInterval(() => {
      const ms = Date.now() - state.startedAt;
      const ss = Math.floor(ms / 1000);
      const m = Math.floor(ss / 60);
      const r = ss % 60;
      if (els.timer)
        els.timer.textContent =
          String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
    }, 250);
  }
  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  async function populateDevices() {
    const list = await navigator.mediaDevices.enumerateDevices();
    fill(
      els.selV,
      list.filter((d) => d.kind === "videoinput"),
      "Camera"
    );
    fill(
      els.selA,
      list.filter((d) => d.kind === "audioinput"),
      "Microphone"
    );
    fill(
      els.selO,
      list.filter((d) => d.kind === "audiooutput"),
      "Speaker"
    );

    if (els.selV?.options?.length) {
      els.selV.value = els.selV.options[0].value;
      state.videoDevice = els.selV.value;
    }
    if (els.selA?.options?.length) {
      els.selA.value = els.selA.options[0].value;
      state.audioDevice = els.selA.value;
    }
    if (els.selO?.options?.length) {
      els.selO.value = els.selO.options[0].value;
      state.outputDevice = els.selO.value;
    }
  }

  function fill(sel, items, label) {
    if (!sel) return;
    sel.innerHTML = "";
    items.forEach((d) => {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || `${label} (${d.deviceId.slice(0, 6)})`;
      sel.appendChild(o);
    });
  }

  async function startPreview(deviceId) {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        previewStream = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      previewStream = stream;
      els.prevAll.forEach((v) => {
        v.hidden = false;
        v.srcObject = stream;
      });
    } catch (e) {
      console.error("preview error", e);
    }
  }

  async function stopPreview() {
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      previewStream = null;
    }
    els.prevAll.forEach((v) => {
      v.hidden = true;
      v.srcObject = null;
    });
  }

  function parseMeetingInfo(urlOrQuery) {
    try {
      const q = urlOrQuery.startsWith("?")
        ? urlOrQuery
        : new URL(urlOrQuery, location.href).search;
      const ps = new URLSearchParams(q);
      const raw = ps.get("meetingInfo");
      if (!raw) return null;
      let txt = raw;
      try {
        txt = decodeURIComponent(txt);
      } catch {}
      try {
        txt = atob(txt);
      } catch {}
      const obj = JSON.parse(txt);

      let parsedInfo = null;
      if (Array.isArray(obj) && obj.length >= 2) {
        parsedInfo = {
          meeting: obj[0],
          attendee: obj[1].Attendee || obj[1],
          isHost: obj[1].isHost || false,
          hostAttendeeId: null,
        };
      } else if (obj.Meeting && obj.Attendee) {
        parsedInfo = {
          meeting: obj.Meeting,
          attendee: obj.Attendee,
          isHost: obj.isHost || false,
          hostAttendeeId: null,
        };
      }
      if (parsedInfo && parsedInfo.isHost) {
        parsedInfo.hostAttendeeId = parsedInfo.attendee.AttendeeId;
      }
      return parsedInfo;
    } catch (e) {
      console.error("parse meetingInfo failed", e);
      return null;
    }
  }
})();





document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save Meeting Details";
  saveButton.style.cssText =
    "background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 8px;";
  saveButton.onclick = saveMeetingDetails;

  const meetingDetailsSection = document.getElementById(
    "meeting-details-section"
  );
  if (meetingDetailsSection) {
    meetingDetailsSection.appendChild(saveButton);
  }
});
class BackgroundFilterHandler {
  // Predefined background images as base64 data URIs
  static PREDEFINED_BACKGROUNDS = {
    office: "./backgrounds/office.jpg",
    nature: "./backgrounds/nature.jpg"
  };

  static init() {
    BackgroundFilterHandler.setupFilterControls();
  }

  static setupFilterControls() {
    const filterSelect = $$(SELECTORS.backgroundFilterSelect);
    const predefinedSelect = $$(SELECTORS.predefinedBackgrounds);
    const imageUrlInput = $$(SELECTORS.backgroundImageUrl);
    const applyBtn = $$(SELECTORS.applyBackgroundFilter);

    if (!filterSelect || !predefinedSelect || !imageUrlInput || !applyBtn) {
      console.warn("[BackgroundFilter] Controls not found");
      return;
    }

    on(filterSelect, "change", () => {
      const value = filterSelect.value;
      const showPredefined = value === "predefined";
      const showImageUrl = value === "replacement";
      
      predefinedSelect.style.display = showPredefined ? "block" : "none";
      imageUrlInput.style.display = showImageUrl ? "block" : "none";
      
      if (showPredefined) {
        predefinedSelect.disabled = false;
      } else {
        predefinedSelect.disabled = true;
        predefinedSelect.value = "";
      }
    });

    on(applyBtn, "click", async () => {
      const filterType = filterSelect.value;
      let imageUrl = "";
      
      if (filterType === "predefined") {
        const selectedBg = predefinedSelect.value;
        if (!selectedBg) {
          console.warn("[BackgroundFilter] Please select a predefined background");
          return;
        }
        imageUrl = BackgroundFilterHandler.PREDEFINED_BACKGROUNDS[selectedBg];
        console.log("[BackgroundFilter] Using predefined image:", imageUrl);
      } else if (filterType === "replacement") {
        imageUrl = imageUrlInput.value.trim();
      }
      
      try {
        await BackgroundFilterHandler.applyFilter(filterType, imageUrl);
      } catch (error) {
        console.error("[BackgroundFilter] Failed to apply filter:", error);
      }
    });
  }

  static async applyFilter(filterType, imageUrl = "") {
    const { state } = window;
    const av = state.av;
    
    if (!av) {
      console.warn("[BackgroundFilter] AudioVideo not available");
      return;
    }

    try {
      // If we have an existing processor, clean it up
      if (state.backgroundFilter.processor) {
        await BackgroundFilterHandler.cleanup();
      }

      if (filterType === "none") {
        // Just use the raw video device
        if (state.videoDevice) {
          await av.startVideoInput(state.videoDevice);
        }
        state.backgroundFilter.enabled = false;
        state.backgroundFilter.type = "none";
        console.log("[BackgroundFilter] Disabled  ");
        return;
      }

      // Use the legacy processor approach since VideoFxConfig is not available
      await BackgroundFilterHandler.applyLegacyFilter(filterType, imageUrl, av, state);

    } catch (error) {
      console.error("[BackgroundFilter] Failed to apply filter:", error);
      throw error;
    }
  }

  static async applyLegacyFilter(filterType, imageUrl, av, state) {
    const root = ROOT();
    let processor = null;

    // Create processor based on filter type
    if (filterType.startsWith("blur-")) {
      if (!root.BackgroundBlurVideoFrameProcessor) {
        throw new Error("BackgroundBlurVideoFrameProcessor not available");
      }
      
      const strength = filterType.split("-")[1]; // low, medium, high
      
      // Use the BackgroundBlurStrength enum if available
      let blurStrength;
      if (root.BackgroundBlurStrength) {
        const strengthMap = {
          low: root.BackgroundBlurStrength.LOW,
          medium: root.BackgroundBlurStrength.MEDIUM, 
          high: root.BackgroundBlurStrength.HIGH
        };
        blurStrength = strengthMap[strength] || root.BackgroundBlurStrength.MEDIUM;
      } else {
        // Fallback to numeric values
        const strengthMap = { low: 5, medium: 15, high: 25 };
        blurStrength = strengthMap[strength] || 15;
      }
      
      console.log(`[BackgroundFilter] Creating blur processor with strength: ${strength} (${blurStrength})`);
      
      processor = await root.BackgroundBlurVideoFrameProcessor.create({
        blurStrength: blurStrength
      });
      
    } else if (filterType === "replacement" || filterType === "predefined") {
      if (!root.BackgroundReplacementVideoFrameProcessor) {
        throw new Error("BackgroundReplacementVideoFrameProcessor not available");
      }
      
      if (!imageUrl) {
        console.warn("[BackgroundFilter] Image URL required for replacement");
        return;
      }
      
      console.log(`[BackgroundFilter] Creating replacement processor with image: ${imageUrl}`);
      
      // Create image element and convert to blob
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const imageBlob = await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log("[BackgroundFilter] Image loaded successfully:", img.width, "x", img.height);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              console.log("[BackgroundFilter] Blob created successfully:", blob.size, "bytes");
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from image"));
            }
          }, 'image/jpeg', 0.8);
        };
        
        img.onerror = () => reject(new Error("Failed to load background image"));
        img.src = imageUrl;
      });
      
      processor = await root.BackgroundReplacementVideoFrameProcessor.create(null, {
        imageBlob: imageBlob
      });
    }

    if (!processor) {
      throw new Error(`Unsupported filter type: ${filterType}`);
    }

    // Create VideoTransformDevice
    const logger = new root.ConsoleLogger("BackgroundFilter", root.LogLevel.INFO);
    
    if (!root.DefaultVideoTransformDevice) {
      throw new Error("DefaultVideoTransformDevice not available");
    }
    
    const videoTransformDevice = new root.DefaultVideoTransformDevice(
      logger,
      state.videoDevice,
      [processor]
    );

    console.log("[BackgroundFilter] Starting video input with transform device");

    // Apply the transform device
    await av.startVideoInput(videoTransformDevice);

    // Update state
    state.backgroundFilter.enabled = true;
    state.backgroundFilter.type = filterType;
    state.backgroundFilter.imageUrl = imageUrl;
    state.backgroundFilter.processor = processor;
    state.backgroundFilter.transformDevice = videoTransformDevice;

    console.log(`[BackgroundFilter] Successfully applied ${filterType} filter`);
  }

  static async cleanup() {
    const { state } = window;
    
    if (state.backgroundFilter.processor) {
      try {
        // Check if processor has destroy method
        if (typeof state.backgroundFilter.processor.destroy === 'function') {
          await state.backgroundFilter.processor.destroy();
          console.log("[BackgroundFilter] Processor destroyed");
        }
      } catch (e) {
        console.warn("[BackgroundFilter] Cleanup error:", e);
      }
    }

    if (state.backgroundFilter.transformDevice) {
      try {
        // Check if transform device has stop method
        if (typeof state.backgroundFilter.transformDevice.stop === 'function') {
          await state.backgroundFilter.transformDevice.stop();
          console.log("[BackgroundFilter] Transform device stopped");
        }
      } catch (e) {
        console.warn("[BackgroundFilter] Transform device cleanup error:", e);
      }
    }

    state.backgroundFilter.processor = null;
    state.backgroundFilter.transformDevice = null;
    state.backgroundFilter.enabled = false;
    state.backgroundFilter.type = "none";
    state.backgroundFilter.imageUrl = "";
  }

  static enableControls(enabled) {
    const filterSelect = $$(SELECTORS.backgroundFilterSelect);
    const predefinedSelect = $$(SELECTORS.predefinedBackgrounds);
    const applyBtn = $$(SELECTORS.applyBackgroundFilter);
    
    if (filterSelect) filterSelect.disabled = !enabled;
    if (applyBtn) applyBtn.disabled = !enabled;
    
    // Only enable predefined dropdown if main filter is enabled and "predefined" is selected
    if (predefinedSelect) {
      if (enabled && filterSelect && filterSelect.value === "predefined") {
        predefinedSelect.disabled = false;
      } else {
        predefinedSelect.disabled = true;
      }
    }
  }

  static getFilterStatus() {
    const { state } = window;
    return {
      enabled: state.backgroundFilter.enabled,
      type: state.backgroundFilter.type,
      imageUrl: state.backgroundFilter.imageUrl
    };
  }

  // Helper method to test image URLs
  static async testImageUrl(imageUrl) {
    console.log(`[BackgroundFilter] Testing image URL: ${imageUrl}`);
    try {
      const blob = await BackgroundFilterHandler.loadImageAsBlob(imageUrl);
      console.log(`[BackgroundFilter] Image test successful: ${blob.size} bytes, type: ${blob.type}`);
      return true;
    } catch (error) {
      console.error(`[BackgroundFilter] Image test failed:`, error);
      return false;
    }
  }

  // Helper method to get some working demo images
  static getDemoImageUrls() {
    return [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop', // Mountain landscape
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop', // Forest
      'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1920&h=1080&fit=crop', // Office
      'https://picsum.photos/1920/1080', // Random image
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyI+PHN0b3Agc3RvcC1jb2xvcj0iIzQzOGVmNiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzEwNzVmZiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=' // Blue gradient
    ];
  }
}

// Toast system (no external libs)
function showToast(message) {
  try {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = message;
    container.appendChild(el);
    // animate in
    requestAnimationFrame(() => el.classList.add("show"));
    // auto-hide
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => {
        el.remove();
      }, 220);
    }, 3000);
  } catch {}
}

// Center reaction (Teams-like float)
function showCenterReaction(emoji) {
  try {
    const layer = document.getElementById("reaction-layer");
    if (!layer) return;
    const el = document.createElement("div");
    el.className = "reaction-float";
    el.textContent = emoji;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  } catch {}
}