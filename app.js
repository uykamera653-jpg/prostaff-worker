// app.js — DIAGNOSTIKA: ko‘rinadigan reCAPTCHA + aniq xatolar

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1) Init
const app = initializeApp(window.__ENV);
const auth = getAuth(app);
getFirestore(app);

// 2) DOM
const phoneInput = document.getElementById("phone");
const sendBtn = document.getElementById("send-code");
const codeRow = document.getElementById("code-row");
const codeInput = document.getElementById("code");
const verifyBtn = document.getElementById("verify-code");
const msgEl = document.getElementById("msg");
const logoutBtn = document.getElementById("logout");
const dash = document.getElementById("dashboard");
const workerState = document.getElementById("worker-state");

// 3) reCAPTCHA — DIAGNOSTIK: 'normal' qilib ko‘rsatamiz
let appVerifier;
function initRecaptcha() {
  try {
    if (!appVerifier) {
      appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "normal" // ko‘rinadigan qilib qo‘ydik
      });
      msg("reCAPTCHA tayyor.");
    }
  } catch (e) {
    console.error("reCAPTCHA init error:", e);
    msg("reCAPTCHA ishga tushmadi: " + (e.code || e.message || e));
  }
}
initRecaptcha();

// 4) SMS yuborish
let confirmationResult = null;
sendBtn?.addEventListener("click", async () => {
  try {
    const phone = (phoneInput.value || "").trim();
    if (!phone.startsWith("+")) {
      msg("Telefon raqamini +998… formatda kiriting.");
      return;
    }
    disable(sendBtn, true);
    msg("SMS yuborilmoqda…");

    // reCAPTCHA render bo‘lmagan bo‘lsa, qayta init
    initRecaptcha();

    confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
    codeRow.style.display = "block";
    msg("SMS kod yuborildi.");
  } catch (e) {
    console.error("send SMS error:", e);
    showAuthError(e);
  } finally {
    disable(sendBtn, false);
  }
});

// 5) Kodni tasdiqlash
verifyBtn?.addEventListener("click", async () => {
  try {
    if (!confirmationResult) {
      msg("Avval SMS yuboring.");
      return;
    }
    const code = (codeInput.value || "").trim();
    if (code.length < 6) {
      msg("To‘liq 6 xonali kodni kiriting.");
      return;
    }
    disable(verifyBtn, true);
    msg("Tasdiqlanmoqda…");
    await confirmationResult.confirm(code);
    msg("Kirish muvaffaqiyatli!");
  } catch (e) {
    console.error("confirm error:", e);
    showAuthError(e);
  } finally {
    disable(verifyBtn, false);
  }
});

// 6) Auth holati
onAuthStateChanged(auth, (user) => {
  if (user) {
    dash.style.display = "block";
    if (workerState) workerState.textContent = "onlayn";
    msg(`Kirdingiz: ${user.phoneNumber || user.uid}`);
  } else {
    dash.style.display = "none";
    if (workerState) workerState.textContent = "oflayn";
  }
});

// 7) Chiqish
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  msg("Chiqdingiz.");
});

// Helpers
function msg(t) { msgEl.textContent = t; }
function disable(el, v) { if (el) el.disabled = !!v; }
function showAuthError(e) {
  const text = `Xatolik: ${(e.code || "")} ${(e.message || "")}`.trim();
  msg(text);
  alert(text); // xatoni aniq ko‘rish uchun
}
