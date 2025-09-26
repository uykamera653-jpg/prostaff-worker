// app.js — PROSTAFF (ishchi): Phone Auth + reCAPTCHA

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- 1) Firebase init (env.js ichidan keladi) ----
const firebaseConfig = window.__ENV; // env.js da window.__ENV bor
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
getFirestore(app); // (hozircha ishlatmasak ham init bo‘lsin)

// ---- 2) DOM ----
const phoneInput = document.getElementById("phone");
const sendBtn    = document.getElementById("send-code");
const codeRow    = document.getElementById("code-row");
const codeInput  = document.getElementById("code");
const verifyBtn  = document.getElementById("verify-code");
const msgEl      = document.getElementById("msg");
const logoutBtn  = document.getElementById("logout");
const dash       = document.getElementById("dashboard");
const workerState= document.getElementById("worker-state");

// ---- 3) reCAPTCHA (faqat bir marta yaratiladi) ----
let appVerifier = null;
function ensureRecaptcha() {
  if (!appVerifier) {
    appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible", // tugma bosilganda avtomatik tekshiradi
    });
  }
}

// ---- 4) SMS yuborish ----
let confirmationResult = null;

sendBtn?.addEventListener("click", async () => {
  try {
    ensureRecaptcha();

    let phone = (phoneInput.value || "").trim();
    if (!phone.startsWith("+")) {
      msg("Telefon raqamini +998… formatda kiriting.");
      return;
    }
    disable(sendBtn, true);
    msg("SMS yuborilmoqda…");

    confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);

    codeRow.style.display = "block";
    msg("SMS kod yuborildi. Kodni kiriting.");
  } catch (e) {
    console.error(e);
    showAuthError(e);
  } finally {
    disable(sendBtn, false);
  }
});

// ---- 5) Kodni tasdiqlash ----
verifyBtn?.addEventListener("click", async () => {
  try {
    if (!confirmationResult) {
      msg("Avval SMS kod yuboring.");
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
    console.error(e);
    msg("Kod noto‘g‘ri yoki vaqti o‘tgan.");
  } finally {
    disable(verifyBtn, false);
  }
});

// ---- 6) Auth holati ----
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Kirgan foydalanuvchi
    dash.style.display = "block";
    workerState.textContent = "onlayn";
    msg(`Kirdingiz: ${user.phoneNumber || user.uid}`);
  } else {
    // Chiqib ketgan
    dash.style.display = "none";
    workerState.textContent = "oflayn";
  }
});

// ---- 7) Chiqish ----
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  msg("Chiqdingiz.");
});

// ---- 8) Yordamchi ----
function msg(t) { msgEl.textContent = t; }
function disable(el, v) { if (el) el.disabled = !!v; }

function showAuthError(e) {
  // eng ko‘p uchraydigan xatolarni foydalanuvchiga tushunarli ko‘rsatish
  if (e.code === "auth/operation-not-allowed") {
    msg("Phone Auth yoqilmagan yoki SMS region policy cheklangan.");
  } else if (e.code === "auth/too-many-requests") {
    msg("Ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.");
  } else if (e.code === "auth/quota-exceeded") {
    msg("SMS kvotasi tugadi (10/kun). Billing qo‘shish kerak.");
  } else if (e.message) {
    msg("Xatolik: " + e.message);
  } else {
    msg("Xatolik yuz berdi.");
  }
}
