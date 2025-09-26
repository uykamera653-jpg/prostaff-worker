const cfg = window.__ENV;
firebase.initializeApp(cfg);
const auth = firebase.auth();
const db   = firebase.firestore();
const msg  = firebase.messaging.isSupported() ? firebase.messaging() : null;

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const screenAuth = $('#screenAuth');
const screenHome = $('#screenHome');
const btnSendCode = $('#btnSendCode');
const btnVerify = $('#btnVerify');
const btnSignOut = $('#btnSignOut');
const btnToggleOnline = $('#btnToggleOnline');
const onlineState = $('#onlineState');
const jobList = $('#jobList');
const assignedList = $('#assignedList');
const catGrid = $('#catGrid');
const btnSaveCats = $('#btnSaveCats');
const emptyState = $('#emptyState');

let confirmationResult = null;
let me = null;        // current user doc snapshot
let unsubAssigned = null;

// ---- UI helpers
function toast(t){ alert(t); }
function show(tab){ $$('.tab').forEach(x=>x.classList.remove('active')); $('#'+tab).classList.add('active'); $$('.tabs button').forEach(b=>b.classList.remove('active')); $(`.tabs [data-tab="${tab.replace('tab','').toLowerCase()}"]`).classList.add('active'); }

// ---- Auth
auth.onAuthStateChanged(async user=>{
  if(!user){
    screenAuth.classList.remove('hide');
    screenHome.classList.add('hide');
    return;
  }
  screenAuth.classList.add('hide');
  screenHome.classList.remove('hide');

  // create user doc if not exists
  const ref = db.collection('users').doc(user.uid);
  await db.runTransaction(async tx=>{
    const snap = await tx.get(ref);
    if(!snap.exists){
      tx.set(ref,{
        role:'worker',
        phone:user.phoneNumber||null,
        name:'',
        surname:'',
        gender:'',
        categories:[],
        online:false,
        location:null,         // {lat,lng,geohash}
        fcmTokens:[],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  me = await ref.get();

  // render profile
  $('#pName').value = me.data().name||'';
  $('#pSurname').value = me.data().surname||'';
  $('#pGender').value = me.data().gender||'';

  // categories chips
  catGrid.innerHTML = '';
  window.CATEGORIES.forEach(c=>{
    const div = document.createElement('div');
    div.className='chip' + (me.data().categories?.includes(c)?' active':'');
    div.textContent=c;
    div.onclick=()=>div.classList.toggle('active');
    catGrid.appendChild(div);
  });

  // start FCM registration
  if(msg){
    try{
      await Notification.requestPermission();
      const token = await msg.getToken({ vapidKey: cfg.vapidKey });
      if(token){
        await ref.update({ fcmTokens: firebase.firestore.FieldValue.arrayUnion(token) });
        navigator.serviceWorker?.register('./firebase-messaging-sw.js');
      }
    }catch(e){ console.warn('FCM token error',e); }
    msg.onMessage(payload=>{
      // ko‘rsatish
      toast(payload.notification?.title || 'Yangi buyurtma!');
      // real-time ro‘yxat yangilanadi
      loadAssigned();
    });
  }

  // subscribed to assigned jobs
  loadAssigned();
});

window.addEventListener('load',()=>{
  navigator.serviceWorker?.register('./sw.js');
});

// Phone login
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha',{size:'invisible'});
btnSendCode.onclick = async ()=>{
  const phone = $('#phone').value.trim();
  if(!phone.startsWith('+')) return toast('Telefon +998... ko‘rinishda bo‘lsin');
  try{
    confirmationResult = await auth.signInWithPhoneNumber(phone, window.recaptchaVerifier);
    $('#codeBox').classList.remove('hide');
    toast('SMS yuborildi');
  }catch(e){ toast(e.message); }
};
btnVerify.onclick = async ()=>{
  try{
    await confirmationResult.confirm($('#code').value.trim());
  }catch(e){ toast(e.message); }
};

btnSignOut.onclick = ()=>auth.signOut();

// Online toggle
btnToggleOnline.onclick = async ()=>{
  const uref = db.collection('users').doc(auth.currentUser.uid);
  const cur = (await uref.get()).data().online;
  const next = !cur;
  await uref.update({ online: next });
  onlineState.innerHTML = `Status: <b>${next?'online':'offline'}</b>`;
  btnToggleOnline.textContent = next ? 'Tugatish' : 'Boshlash';
};

// categories save
btnSaveCats.onclick = async ()=>{
  const cats = $$('#tabCategories .chip.active').map(x=>x.textContent);
  await db.collection('users').doc(auth.currentUser.uid).update({ categories: cats });
  toast('Saqlandi');
};

// set location + geohash
$('#btnSetLocation').onclick = ()=>{
  if(!navigator.geolocation) return toast('Geolokatsiya yoqilmagan');
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude:lat, longitude:lng} = pos.coords;
    const geohash = geohashEncode(lat,lng); // quyida oddiy encoder
    await db.collection('users').doc(auth.currentUser.uid).update({
      location:{lat,lng,geohash}
    });
    toast('Lokatsiya yangilandi');
  }, ()=>toast('Lokatsiyaga ruxsat bering'));
};

// Assigned jobs listener (worker tanlanganidan keyin)
function loadAssigned(){
  unsubAssigned?.();
  const q = db.collection('jobs')
    .where('assignedWorkerIds','array-contains',auth.currentUser.uid)
    .orderBy('createdAt','desc').limit(20);
  unsubAssigned = q.onSnapshot(snap=>{
    assignedList.innerHTML='';
    if(snap.empty){ assignedList.innerHTML='<p class="muted">Biriktirilgan ishlar yo‘q.</p>'; return; }
    snap.forEach(doc=>{
      const j = doc.data();
      const div = document.createElement('div');
      div.className='item';
      div.innerHTML = `
        <b>${j.category}</b><br/>
        ${j.desc||''}<br/>
        <small>${(j.price||'–')} | ${j.payment||'–'}</small><br/>
        <div class="row"><button data-id="${doc.id}" class="ghost open">Ko‘rish</button></div>
      `;
      assignedList.appendChild(div);
    });
    $$('.open').forEach(b=>b.onclick=()=>openJob(b.dataset.id));
  });
}

async function openJob(id){
  const d = await db.collection('jobs').doc(id).get();
  const j = d.data();
  const url = `https://www.google.com/maps/dir/?api=1&destination=${j.location.lat},${j.location.lng}`;
  const photos = (j.photos||[]).map(u=>`<img src="${u}" style="max-width:100%;border-radius:8px;margin:6px 0" />`).join('');
  const ok = confirm(`${j.category}\n\n${j.desc||''}\n\nSizga mos: ${j.price||'–'} | ${j.payment||'–'}\n\nYo‘l ko‘rsatilsinmi?`);
  if(ok) location.href=url;
}

// ---- minimal geohash (5 char ≈ 5km aniqlik)
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
function geohashEncode(lat, lon, precision=5){
  let idx=0, bit=0, evenBit=true; let latMin=-90, latMax=90, lonMin=-180, lonMax=180; let gh='';
  while(gh.length<precision){
    if(evenBit){ const lonMid=(lonMin+lonMax)/2; if(lon>=lonMid){ idx=idx*2+1; lonMin=lonMid; } else { idx=idx*2; lonMax=lonMid; } }
    else{ const latMid=(latMin+latMax)/2; if(lat>=latMid){ idx=idx*2+1; latMin=latMid; } else { idx=idx*2; latMax=latMid; } }
    evenBit=!evenBit; if(++bit==5){ gh+=BASE32.charAt(idx); bit=0; idx=0; }
  }
  return gh;
}

// Tabs
$$('.tabs button').forEach(b=>b.onclick=()=>show('tab'+b.dataset.tab[0].toUpperCase()+b.dataset.tab.slice(1)));
