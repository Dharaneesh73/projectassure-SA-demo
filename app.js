// ══════════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION & DATABASE MODULE
// ══════════════════════════════════════════════════════════════════
// 
// SETUP INSTRUCTIONS (see SETUP_GUIDE.md for full details):
//   1. Go to https://console.firebase.google.com
//   2. Create a new project (free Spark plan is sufficient)
//   3. Enable Authentication → Email/Password
//   4. Create Firestore Database (start in test mode)
//   5. Replace the firebaseConfig object below with YOUR project's config
//      (found in Project Settings → General → Your apps → SDK setup)
//
const firebaseConfig = {
  apiKey:            "AIzaSyDyUXnY9BNxELiDa4CfLdCNGqoqWJZG-aQ",
  authDomain:        "projectassure-sa.firebaseapp.com",
  projectId:         "projectassure-sa",
  storageBucket:     "projectassure-sa.firebasestorage.app",
  messagingSenderId: "952310059578",
  appId:             "1:952310059578:web:62f609b0ee361e00e5db03"
};

// ── Firebase SDK (loaded via CDN in index.html) ──────────────────
// These globals are available after the CDN scripts load:
//   firebase, firebase.auth(), firebase.firestore()

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let FB_READY = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK not loaded — falling back to localStorage');
      return false;
    }
    if (!firebase.apps.length) {
      fbApp = firebase.initializeApp(firebaseConfig);
    } else {
      fbApp = firebase.apps[0];
    }
    fbAuth = firebase.auth();
    fbDb   = firebase.firestore();
    FB_READY = true;
    console.log('[Firebase] Initialized successfully');
    return true;
  } catch (e) {
    console.warn('[Firebase] Init failed — falling back to localStorage:', e.message);
    FB_READY = false;
    return false;
  }
}

// ── DATABASE HELPERS ─────────────────────────────────────────────
// These wrap Firestore with localStorage fallback so the app works
// even before Firebase is configured.

const DB = {
  // Save a user document to Firestore (merges with existing)
  async saveUser(user) {
    if (!FB_READY || !fbDb || !user || !user.email) {
      // Fallback: localStorage (existing behaviour)
      try {
        const users = getUsers();
        users[user.email] = user;
        saveUsers(users);
      } catch(e) {}
      return;
    }
    try {
      const ref = fbDb.collection('users').doc(user.email);
      await ref.set(user, { merge: true });
    } catch (e) {
      console.warn('[Firebase] saveUser failed:', e.message);
      // Fallback
      try { const u = getUsers(); u[user.email] = user; saveUsers(u); } catch(_) {}
    }
  },

  // Fetch a single user document from Firestore
  async getUser(email) {
    if (!FB_READY || !fbDb) {
      return getUsers()[email] || null;
    }
    try {
      const snap = await fbDb.collection('users').doc(email).get();
      return snap.exists ? snap.data() : null;
    } catch (e) {
      console.warn('[Firebase] getUser failed:', e.message);
      return getUsers()[email] || null;
    }
  },

  // Save a session (mirrors CURR_USER to Firestore user doc)
  async saveSession(user) {
    if (!user) return;
    lsSave('pa_session', JSON.stringify(user)); // always keep local copy
    await DB.saveUser(user);
  },

  // Listen for auth-state changes (real-time sign-in/out)
  onAuthStateChanged(callback) {
    if (!FB_READY || !fbAuth) return;
    fbAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in via Firebase Auth
        const dbUser = await DB.getUser(firebaseUser.email);
        if (dbUser) callback(dbUser);
      } else {
        callback(null);
      }
    });
  },

  // Firebase Auth — sign in with email/password
  async signIn(email, password) {
    if (!FB_READY || !fbAuth) return null;
    const cred = await fbAuth.signInWithEmailAndPassword(email, password);
    return cred.user;
  },

  // Firebase Auth — create account
  async createAccount(email, password) {
    if (!FB_READY || !fbAuth) return null;
    const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
    return cred.user;
  },

  // Firebase Auth — sign out
  async signOut() {
    if (!FB_READY || !fbAuth) return;
    await fbAuth.signOut();
  },

  // Save an analysis result (optional: store analysis metadata per user)
  async saveAnalysis(email, analysisData) {
    if (!FB_READY || !fbDb || !email) return;
    try {
      await fbDb
        .collection('users').doc(email)
        .collection('analyses')
        .add({
          ...analysisData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
      console.warn('[Firebase] saveAnalysis failed:', e.message);
    }
  }
};

// ══════════════════════════════════════════════════════════════════
// END FIREBASE MODULE
// ══════════════════════════════════════════════════════════════════






function addTblFilter(wrapperId,tableId,colDefs){
  var wrap=document.getElementById(wrapperId);
  var tbl=document.getElementById(tableId);
  if(!wrap||!tbl)return;
  // Remove existing filter bar if any
  var existing=wrap.querySelector('.tbl-fbar');if(existing)existing.remove();
  var bar=document.createElement('div');
  bar.className='tbl-fbar';
  bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;padding:7px 10px;background:var(--s2);border:1px solid var(--border);border-radius:7px';
  bar.innerHTML='<span style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap">&#x1F50D; Filter</span>';
  var inputs=[];
  colDefs.forEach(function(col){
    var h=document.createElement('div');h.style.cssText='display:flex;align-items:center;gap:4px';
    var lbl=document.createElement('span');lbl.style.cssText='font-size:10.5px;color:var(--t3);white-space:nowrap';lbl.textContent=col.label+':';h.appendChild(lbl);
    var el;
    if(col.type==='select'){
      el=document.createElement('select');
      el.style.cssText='font-size:11px;border:1.5px solid var(--border);border-radius:6px;padding:3px 8px;background:var(--surface);color:var(--t1);font-family:inherit;cursor:pointer;max-width:150px';
      el.innerHTML='<option value="">All</option>';
      var seen={};[].forEach.call(tbl.querySelectorAll('tbody tr'),function(row){var td=row.cells[col.idx];if(td){var v=(td.textContent||'').trim();if(v&&!seen[v]){seen[v]=1;var opt=document.createElement('option');opt.value=v;opt.textContent=v;el.appendChild(opt);}}});
    } else {
      el=document.createElement('input');el.type='search';el.placeholder='Search…';
      el.style.cssText='font-size:11px;border:1.5px solid var(--border);border-radius:6px;padding:3px 9px;background:var(--surface);color:var(--t1);width:130px;font-family:inherit;outline:none;transition:border-color .15s';
      el.onfocus=function(){this.style.borderColor='var(--ind)';};
      el.onblur=function(){this.style.borderColor='var(--border)';};
    }
    inputs.push({el:el,col:col});h.appendChild(el);bar.appendChild(h);
  });
  var clr=document.createElement('button');
  clr.innerHTML='&#x2715; Clear';clr.title='Clear all filters';
  clr.style.cssText='font-size:10.5px;padding:3px 9px;border:1.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--t3);cursor:pointer;font-family:inherit;white-space:nowrap';
  clr.onclick=function(){inputs.forEach(function(i){i.el.value='';});applyF();};
  bar.appendChild(clr);
  var cnt=document.createElement('span');cnt.style.cssText='font-size:10px;color:var(--t4);margin-left:auto;white-space:nowrap';bar.appendChild(cnt);
  function applyF(){
    var rows=tbl.querySelectorAll('tbody tr');var vis=0;
    rows.forEach(function(row){
      var show=true;
      inputs.forEach(function(inp){
        var v=(inp.el.value||'').trim().toLowerCase();if(!v)return;
        var td=row.cells[inp.col.idx];var cell=(td?td.textContent||'':'').toLowerCase();
        if(!cell.includes(v))show=false;
      });
      row.style.display=show?'':'none';if(show)vis++;
    });
    var tot=tbl.querySelectorAll('tbody tr').length;
    cnt.textContent=vis===tot?tot+' rows':vis+'/'+tot;
  }
  inputs.forEach(function(i){i.el.oninput=applyF;if(i.el.tagName==='SELECT')i.el.onchange=applyF;});
  wrap.insertBefore(bar,wrap.firstChild);
  var tot=tbl.querySelectorAll('tbody tr').length;cnt.textContent=tot+' rows';
}

function initTableFilters(){
  addTblFilter('cpWrap','cpTbody',[{idx:1,label:'Activity ID',type:'text'},{idx:2,label:'Name',type:'text'},{idx:3,label:'Type',type:'select'},{idx:4,label:'Status',type:'select'}]);
  addTblFilter('ncWrap','ncTbody',[{idx:1,label:'Activity ID',type:'text'},{idx:2,label:'Name',type:'text'}]);
  addTblFilter('msWrap','msTbody',[{idx:1,label:'Activity ID',type:'text'},{idx:2,label:'Name',type:'text'},{idx:0,label:'Status',type:'select'}]);
  addTblFilter('rsrcWrap','rsrcUnitTbody',[{idx:0,label:'Resource',type:'text'},{idx:1,label:'Type',type:'select'}]);
  if(document.getElementById('missTable'))addTblFilter('missWrap','missTable',[{idx:0,label:'Activity ID',type:'text'},{idx:2,label:'Missing',type:'select'}]);
  if(document.getElementById('oosTable'))addTblFilter('oosWrap','oosTable',[{idx:0,label:'Activity ID',type:'text'},{idx:1,label:'Name',type:'text'}]);
}

var CURR_USER=null;
var PLANS={day:{label:'Daily',credits:5,days:1,price:'$9',priceN:9,popular:false,features:['5 XER analyses','Full DCMA/EVM reports','PDF/Excel/Word exports','24-hour access']},week:{label:'Weekly',credits:25,days:7,price:'$29',priceN:29,popular:false,features:['25 XER analyses','Full DCMA/EVM reports','Forensic comparison','7-day access']},month:{label:'Monthly',credits:100,days:30,price:'$79',priceN:79,popular:true,features:['100 XER analyses','Full DCMA/EVM reports','Forensic comparison','Unlimited exports','30-day access']},annual:{label:'Annual',credits:999999,days:365,price:'$599',priceN:599,popular:false,features:['Unlimited XER analyses','Full DCMA/EVM reports','Forensic comparison','Unlimited exports','365-day access','Priority support']}};
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSave(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function getUsers(){var u=lsGet('pa_users');try{return JSON.parse(u)||{};}catch(e){return {};}}
function saveUsers(u){lsSave('pa_users',JSON.stringify(u));}
function initAuth(){
  // Initialize Firebase (if SDK loaded and config provided)
  initFirebase();

  // Seed default admin in localStorage (always, as fallback)
  var users=getUsers();
  if(!users['admin@projectassure.in']){users['admin@projectassure.in']={name:'Admin',email:'admin@projectassure.in',org:'PA Pvt Ltd',pass:'Admin@2025',role:'admin',plan:'annual',planLabel:'Annual',credits:999999,maxCredits:999999,expiry:'2099-12-31',joined:new Date().toISOString().slice(0,10)};saveUsers(users);}

  // Restore session from localStorage (fast path, works offline)
  var saved=lsGet('pa_session');if(saved){try{CURR_USER=JSON.parse(saved);}catch(e){}}
  if(CURR_USER){updateNavUser();showPage('pgUpload');}else{showPage('pgLogin');}

  // If Firebase is ready, also listen for real-time auth changes
  DB.onAuthStateChanged(function(fbUser){
    if(fbUser && !CURR_USER){
      CURR_USER=fbUser; lsSave('pa_session',JSON.stringify(fbUser));
      updateNavUser(); showPage('pgUpload');
    }
  });
}
function doLogin(){
  var email=(document.getElementById('loginEmail').value||'').trim().toLowerCase();
  var pass=document.getElementById('loginPass').value||'';
  var err=document.getElementById('loginErr');if(err)err.className='auth-err';
  if(!email||!pass){if(err){err.textContent='Please enter email and password.';err.className='auth-err show';}return;}
  var u=getUsers()[email];
  if(!u||u.pass!==pass){if(err){err.textContent='Invalid email or password.';err.className='auth-err show';}return;}
  if(u.role!=='admin'&&u.expiry&&new Date(u.expiry)<new Date()){if(err){err.textContent='Subscription expired. Please renew.';err.className='auth-err show';}CURR_USER=u;lsSave('pa_session',JSON.stringify(u));setTimeout(function(){showPage('pgSubscribe');},1500);return;}
  CURR_USER=u;lsSave('pa_session',JSON.stringify(u));updateNavUser();
  if(u.role==='admin'||u.role==='superuser'){showPage('pgAdmin');renderAdmin();}else showPage('pgUpload');
}
function doRegister(){
  var name=(document.getElementById('regName').value||'').trim();
  var email=(document.getElementById('regEmail').value||'').trim().toLowerCase();
  var org=(document.getElementById('regOrg').value||'').trim();
  var pass=document.getElementById('regPass').value||'';
  var err=document.getElementById('regErr');if(err)err.className='auth-err';
  if(!name||!email||!pass){if(err){err.textContent='All fields required.';err.className='auth-err show';}return;}
  if(pass.length<8){if(err){err.textContent='Password must be 8+ characters.';err.className='auth-err show';}return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){if(err){err.textContent='Invalid email.';err.className='auth-err show';}return;}
  var users=getUsers();
  if(users[email]){if(err){err.textContent='Account already exists.';err.className='auth-err show';}return;}
  var nu={name:name,email:email,org:org,pass:pass,role:'user',plan:null,credits:0,maxCredits:0,expiry:null,joined:new Date().toISOString().slice(0,10)};
  users[email]=nu;saveUsers(users);CURR_USER=nu;lsSave('pa_session',JSON.stringify(nu));showPage('pgSubscribe');
}
function selectPlan(plan){
  if(!CURR_USER){showPage('pgLogin');return;}
  var p=PLANS[plan];if(!p)return;
  var exp=new Date();exp.setDate(exp.getDate()+p.days);
  CURR_USER.plan=plan;CURR_USER.planLabel=p.label;
  CURR_USER.credits=p.credits;CURR_USER.maxCredits=p.credits;
  CURR_USER.expiry=exp.toISOString().slice(0,10);
  try{var users=getUsers();users[CURR_USER.email]=CURR_USER;saveUsers(users);}catch(e){}
  lsSave('pa_session',JSON.stringify(CURR_USER));
  // Persist subscription update to Firebase
  DB.saveUser(CURR_USER);
  updateNavUser();
  showPage('pgUpload');
}
function doLogout(){
  CURR_USER=null;lsSave('pa_session','');
  DB.signOut(); // sign out of Firebase Auth
  var le=document.getElementById('loginEmail');if(le)le.value='';
  var lp=document.getElementById('loginPass');if(lp)lp.value='';
  var le2=document.getElementById('loginErr');if(le2)le2.className='auth-err';
  showPage('pgLogin');
}
function useCredit(reason){
  reason=reason||'XER analysis';
  if(!CURR_USER)return true;
  if(CURR_USER.role==='admin'||CURR_USER.role==='superuser'){
    showCreditToast('Admin: unlimited',CURR_USER.role,true);
    return true;
  }
  if(!CURR_USER.plan){alert('No active subscription.');showPage('pgSubscribe');return false;}
  if(CURR_USER.expiry&&new Date(CURR_USER.expiry)<new Date()){alert('Subscription expired.');showPage('pgSubscribe');return false;}
  if(CURR_USER.credits<=0){
    showCreditToast('No credits remaining',reason,false);
    setTimeout(function(){alert('No analyses remaining. Please upgrade.');showPage('pgSubscribe');},800);
    return false;
  }
  var oldCredits=CURR_USER.credits;
  CURR_USER.credits--;
  var users=getUsers();
  if(users[CURR_USER.email]){users[CURR_USER.email].credits=CURR_USER.credits;saveUsers(users);}
  lsSave('pa_session',JSON.stringify(CURR_USER));
  // Sync credit deduction to Firebase
  DB.saveUser(CURR_USER);
  // Real-time burn-out visualization
  animateCreditBurn(oldCredits,CURR_USER.credits);
  showCreditToast('1 credit used',reason,true);
  updateNavUser();
  updateCreditRing();
  return true;
}

// ── REAL-TIME CREDIT BURN VISUALIZATION ──────────────────────────
function animateCreditBurn(from,to){
  var cd=document.getElementById('creditDisplay');
  var cc=document.getElementById('creditCount');
  if(!cd||!cc)return;
  // Pulse the pill with red flash
  cd.classList.add('credit-burning');
  // Animated count-down
  var dur=600;var start=Date.now();
  function step(){
    var t=Math.min((Date.now()-start)/dur,1);
    var eased=1-Math.pow(1-t,3);
    var current=Math.round(from-(from-to)*eased);
    cc.textContent=String(current);
    if(t<1)requestAnimationFrame(step);
    else{cc.textContent=String(to);setTimeout(function(){cd.classList.remove('credit-burning');},400);}
  }
  requestAnimationFrame(step);
}

function showCreditToast(msg,sub,success){
  var existing=document.getElementById('creditToast');
  if(existing)existing.remove();
  var toast=document.createElement('div');
  toast.id='creditToast';
  toast.className='credit-toast '+(success?'success':'error');
  toast.innerHTML='<div class="ct-icon">'+(success?'⚡':'⚠')+'</div>'
    +'<div class="ct-body"><div class="ct-msg">'+msg+'</div><div class="ct-sub">'+sub+'</div></div>';
  document.body.appendChild(toast);
  setTimeout(function(){toast.classList.add('show');},10);
  setTimeout(function(){toast.classList.remove('show');setTimeout(function(){if(toast.parentNode)toast.parentNode.removeChild(toast);},400);},3200);
}

function updateCreditRing(){
  var ring=document.getElementById('creditRing');
  if(!ring||!CURR_USER)return;
  var isUnlimited=CURR_USER.credits>=999999||CURR_USER.role==='admin';
  var maxC=Math.max(1,CURR_USER.maxCredits||100);
  var pct=isUnlimited?100:Math.max(0,Math.min(100,Math.round(CURR_USER.credits/maxC*100)));
  // Update SVG circle dasharray
  var circ=ring.querySelector('.ring-prog');
  if(circ){
    var R=22;var C=2*Math.PI*R;
    circ.style.strokeDasharray=C;
    circ.style.strokeDashoffset=C*(1-pct/100);
    circ.style.stroke=isUnlimited?'var(--em)':pct<=20?'var(--rd)':pct<=50?'var(--am)':'var(--ind)';
  }
  var lbl=ring.querySelector('.ring-lbl');
  if(lbl)lbl.textContent=isUnlimited?'∞':String(CURR_USER.credits);
  var sub=ring.querySelector('.ring-sub');
  if(sub)sub.textContent=isUnlimited?'unlimited':'/ '+(CURR_USER.maxCredits||0);
}
function updateNavUser(){
  if(!CURR_USER)return;
  var nu=document.getElementById('navUser');if(nu)nu.style.display='inline-flex';
  var av=document.getElementById('navAvatar');if(av)av.textContent=(CURR_USER.name||CURR_USER.email||'?').charAt(0).toUpperCase();
  var un=document.getElementById('navUname');if(un)un.textContent=(CURR_USER.name||(CURR_USER.email||'').split('@')[0]||'User');
  var np=document.getElementById('navPlan');if(np)np.textContent=CURR_USER.role==='admin'?'Admin':(CURR_USER.planLabel||'No Plan');
  var isUnlimited=CURR_USER.credits>=999999||CURR_USER.role==='admin';
  var cd=document.getElementById('creditDisplay');
  if(cd){cd.style.display='inline-flex';
    var cc=document.getElementById('creditCount');if(cc)cc.textContent=isUnlimited?String.fromCharCode(8734):String(CURR_USER.credits);
    var low=!isUnlimited&&CURR_USER.credits<=5;
    cd.className=low?'credit-pill credit-low':'credit-pill';
  }
  if(typeof updateCreditRing==='function')updateCreditRing();
}
function showUserMenu(e){
  if(e&&e.stopPropagation)e.stopPropagation();
  var m=document.getElementById('userMenu');if(!m)return;
  var nm=document.getElementById('umName');if(nm)nm.textContent=CURR_USER&&CURR_USER.name||'User';
  var em=document.getElementById('umEmail');if(em)em.textContent=CURR_USER&&CURR_USER.email||'';
  var ua=document.getElementById('umAdmin');if(ua)ua.style.display=(CURR_USER&&CURR_USER.role==='admin')?'flex':'none';
  m.classList.toggle('show');
  setTimeout(function(){document.addEventListener('click',hideUserMenu,{once:true});},10);
}
function hideUserMenu(){var m=document.getElementById('userMenu');if(m)m.classList.remove('show');}
function setMode(m){
  MODE=m;
  var s=document.getElementById('uploadSingle');var c=document.getElementById('uploadCompare');
  var ms=document.getElementById('mSingle');var mc=document.getElementById('mCompare');
  if(s&&s.classList)s.classList.toggle('hidden',m!=='single');
  if(c&&c.classList)c.classList.toggle('hidden',m!=='compare');
  if(ms&&ms.style){ms.style.color=m==='single'?'var(--ind)':'var(--t3)';ms.style.borderBottomColor=m==='single'?'var(--ind)':'transparent';}
  if(mc&&mc.style){mc.style.color=m==='compare'?'var(--ind)':'var(--t3)';mc.style.borderBottomColor=m==='compare'?'var(--ind)':'transparent';}
}
function renderAdmin(){
  var users=getUsers();var all=Object.values(users);
  var stats=document.getElementById('adminStats');
  if(stats){var active=all.filter(function(u){return u.plan&&u.expiry&&new Date(u.expiry)>=new Date();});
    stats.innerHTML=[{v:all.length,l:'Total Users'},{v:active.length,l:'Active Subscriptions'},{v:all.filter(function(u){return u.role==='admin';}).length,l:'Admin Users'},{v:'$'+all.reduce(function(s,u){var p=PLANS[u.plan];return s+(p&&p.price?parseInt(p.price.replace(/[^\d]/g,''))||0:0);},0).toLocaleString('en-IN'),l:'Revenue (Sim.)'}].map(function(s){return'<div class="admin-stat"><div class="admin-stat-v">'+s.v+'</div><div class="admin-stat-l">'+s.l+'</div></div>';}).join('');}
  var tb=document.getElementById('adminUserBody');
  if(tb){tb.innerHTML=all.map(function(u){var isExp=u.expiry&&new Date(u.expiry)<new Date();return'<tr><td class="nm" style="font-weight:600">'+u.name+'</td><td class="mono">'+u.email+'</td><td><span class="badge '+(u.plan?'b-pass':'b-warn')+'">'+(u.planLabel||u.plan||'None')+'</span></td><td class="num">'+(u.credits>=999999?'&#x221E;':u.credits)+'</td><td><span class="badge '+(isExp?'b-fail':'b-pass')+'">'+(u.expiry||'&ndash;')+'</span></td><td class="mono">'+u.joined+'</td><td style="white-space:nowrap"><button class="btn btn-g" style="font-size:10.5px;padding:3px 9px" onclick="topUpUser(\''+u.email+'\')">Top Up</button> <button class="btn" style="font-size:10.5px;padding:3px 9px;color:var(--red);border-color:rgba(220,38,38,.2)" onclick="deleteUser(\''+u.email+'\')">Remove</button></td></tr>';}).join('');}
}
function topUpUser(email){var users=getUsers();var u=users[email];if(!u)return;var amt=parseInt(prompt('Add credits to '+u.name+'?','10')||'0');if(isNaN(amt)||amt<=0)return;u.credits=Math.min(999999,(u.credits||0)+amt);users[email]=u;saveUsers(users);if(CURR_USER&&CURR_USER.email===email){CURR_USER.credits=u.credits;lsSave('pa_session',JSON.stringify(CURR_USER));updateNavUser();}renderAdmin();}
function deleteUser(email){if(email==='admin@projectassure.in'){alert('Cannot delete admin.');return;}if(!confirm('Remove '+email+'?'))return;var users=getUsers();delete users[email];saveUsers(users);renderAdmin();}















// ── STATE ──────────────────────────────────────────────────────────────
var MODE='single',STEP=0,TONE='formal',CTONE='formal';
var RAW=null,M=null,EVM=null;
var RAW1=null,M1=null,F1='';
var RAW2=null,M2=null,F2='';
var BRAW=null,BM=null,BEVM=null,BFNAME='';
var RTEXT='',SC=null,RSC=null,_vlinesRegistered=false;
var SEC_LIST=[
  {k:'exec',      l:'Executive Summary',                    on:true,  custom:false},
  {k:'quality',   l:'Schedule Quality & Maturity Score',    on:true,  custom:false},
  {k:'dcma',      l:'DCMA 14-Point Assessment',             on:true,  custom:false},
  {k:'gao',       l:'GAO Schedule Assessment',              on:true,  custom:false},
  {k:'nasa',      l:'NASA / Best-Practice Checks',          on:false, custom:false},
  {k:'logic',     l:'Schedule Logic Analysis',              on:true,  custom:false},
  {k:'cp',        l:'Critical Path Analysis',               on:true,  custom:false},
  {k:'evm',       l:'Earned Value Performance',             on:true,  custom:false},
  {k:'nc',        l:'Near-Critical Register',               on:true,  custom:false},
  {k:'ms',        l:'Milestone Tracker',                    on:true,  custom:false},
  {k:'compWeek',  l:'Completions This Week',                on:true,  custom:false},
  {k:'compMonth', l:'Completions This Month',               on:true,  custom:false},
  {k:'ahead1w',   l:'1-Week Look-Ahead',                    on:true,  custom:false},
  {k:'ahead1m',   l:'1-Month Look-Ahead',                   on:true,  custom:false},
  {k:'ahead3m',   l:'3-Month Look-Ahead',                   on:true,  custom:false},
  {k:'ahead6m',   l:'6-Month Look-Ahead Summary',           on:true,  custom:false},
  {k:'mitigation',l:'Mitigation & Recovery Actions',        on:true,  custom:false},
  {k:'forensic',  l:'Forensic Change Tracking (if compare)',on:false, custom:false},
  {k:'risk',      l:'Risk & Decision Dashboard',            on:true,  custom:false}
];
var _csIdx=0;
// Legacy shim so old code still works (SECS.k.on)
var SECS=(function(){var o={};SEC_LIST.forEach(function(s){o[s.k]=s;});return o;})();

// ── XER PARSER ────────────────────────────────────────────────────────

// ── APP CODE ───────────────────────────────

// ── TABLE FILTER UTILITY ─────────────────────────────────────────
function addTblFilter(wrapperId,tableId,colDefs){
  var wrap=document.getElementById(wrapperId);
  var tbl=document.getElementById(tableId);
  if(!wrap||!tbl)return;
  var existing=wrap.querySelector('.tbl-fbar');if(existing&&existing.remove)existing.remove();
  var bar=document.createElement('div');
  bar.className='tbl-fbar';
  bar.innerHTML='<span style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap">\u{1F50D} Filter</span>';
  var inputs=[];
  colDefs.forEach(function(col){
    var h=document.createElement('div');h.style.cssText='display:flex;align-items:center;gap:4px';
    var lbl=document.createElement('span');lbl.style.cssText='font-size:10.5px;color:var(--tx3);white-space:nowrap';lbl.textContent=col.label+':';h.appendChild(lbl);
    var el;
    if(col.type==='select'){
      el=document.createElement('select');
      el.innerHTML='<option value="">All</option>';
      var seen={};
      [].forEach.call(tbl.querySelectorAll('tbody tr'),function(row){
        var td=row.cells[col.idx];if(!td)return;
        var v=(td.textContent||'').trim();
        if(v&&!seen[v]&&v!=='--'){seen[v]=1;var opt=document.createElement('option');opt.value=v;opt.textContent=v;el.appendChild(opt);}
      });
    } else {
      el=document.createElement('input');el.type='search';el.placeholder='Search\u2026';
      el.style.width='130px';
    }
    inputs.push({el:el,col:col});h.appendChild(el);bar.appendChild(h);
  });
  var clr=document.createElement('button');
  clr.innerHTML='\u2715 Clear';clr.title='Clear filters';
  clr.style.cssText='font-size:10.5px;padding:4px 9px;border:1.5px solid var(--b1);border-radius:5px;background:var(--surface);color:var(--tx3);cursor:pointer;font-family:inherit';
  clr.onclick=function(){inputs.forEach(function(i){i.el.value='';});applyF();};
  bar.appendChild(clr);
  var cnt=document.createElement('span');
  cnt.style.cssText='margin-left:auto;font-size:10px;color:var(--tx3);font-family:monospace';
  bar.appendChild(cnt);
  function applyF(){
    var rows=tbl.querySelectorAll('tbody tr');var vis=0;
    [].forEach.call(rows,function(row){
      var show=true;
      inputs.forEach(function(i){
        var v=(i.el.value||'').toLowerCase();
        if(!v)return;
        var td=row.cells[i.col.idx];if(!td){show=false;return;}
        var cell=(td.textContent||'').toLowerCase();
        if(!cell.includes(v))show=false;
      });
      row.style.display=show?'':'none';if(show)vis++;
    });
    var tot=rows.length;
    cnt.textContent=vis===tot?tot+' rows':vis+'/'+tot;
  }
  inputs.forEach(function(i){i.el.oninput=applyF;if(i.el.tagName==='SELECT')i.el.onchange=applyF;});
  wrap.insertBefore(bar,wrap.firstChild);
  cnt.textContent=tbl.querySelectorAll('tbody tr').length+' rows';
}

















// ── STATE ──────────────────────────────────────────────────────────────
var MODE='single',STEP=0,TONE='formal',CTONE='formal';
var RAW=null,M=null,EVM=null;
var RAW1=null,M1=null,F1='';
var RAW2=null,M2=null,F2='';
var BRAW=null,BM=null,BEVM=null,BFNAME='';
var RTEXT='',SC=null,RSC=null,_vlinesRegistered=false;
var SEC_LIST=[
  {k:'exec',      l:'Executive Summary',                    on:true,  custom:false},
  {k:'quality',   l:'Schedule Quality & Maturity Score',    on:true,  custom:false},
  {k:'dcma',      l:'DCMA 14-Point Assessment',             on:true,  custom:false},
  {k:'gao',       l:'GAO Schedule Assessment',              on:true,  custom:false},
  {k:'nasa',      l:'NASA / Best-Practice Checks',          on:false, custom:false},
  {k:'logic',     l:'Schedule Logic Analysis',              on:true,  custom:false},
  {k:'cp',        l:'Critical Path Analysis',               on:true,  custom:false},
  {k:'evm',       l:'Earned Value Performance',             on:true,  custom:false},
  {k:'nc',        l:'Near-Critical Register',               on:true,  custom:false},
  {k:'ms',        l:'Milestone Tracker',                    on:true,  custom:false},
  {k:'compWeek',  l:'Completions This Week',                on:true,  custom:false},
  {k:'compMonth', l:'Completions This Month',               on:true,  custom:false},
  {k:'ahead1w',   l:'1-Week Look-Ahead',                    on:true,  custom:false},
  {k:'ahead1m',   l:'1-Month Look-Ahead',                   on:true,  custom:false},
  {k:'ahead3m',   l:'3-Month Look-Ahead',                   on:true,  custom:false},
  {k:'ahead6m',   l:'6-Month Look-Ahead Summary',           on:true,  custom:false},
  {k:'mitigation',l:'Mitigation & Recovery Actions',        on:true,  custom:false},
  {k:'forensic',  l:'Forensic Change Tracking (if compare)',on:false, custom:false},
  {k:'risk',      l:'Risk & Decision Dashboard',            on:true,  custom:false}
];
var _csIdx=0;
// Legacy shim so old code still works (SECS.k.on)
var SECS=(function(){var o={};SEC_LIST.forEach(function(s){o[s.k]=s;});return o;})();

// ── XER PARSER ────────────────────────────────────────────────────────
function parseXER(text){
  var s={},t=null,f=null,r=[];
  var lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    var l=lines[i].replace(/\r$/,'');
    if(l.startsWith('%T\t')){if(t&&f)s[t]={f:f,r:r};t=l.slice(3).trim();f=null;r=[];}
    else if(l.startsWith('%F\t'))f=l.slice(3).split('\t');
    else if(l.startsWith('%R\t')&&f){var v=l.slice(3).split('\t'),o={};for(var j=0;j<f.length;j++)o[f[j]]=v[j]!==undefined?v[j]:'';r.push(o);}
  }
  if(t&&f)s[t]={f:f,r:r};
  return s;
}

// ── COMPREHENSIVE METRICS ────────────────────────────────────────────
function extractAll(s){
  var nc=parseInt((document.getElementById('cfgNc')||{value:'5'}).value)||5;
  var hf=parseInt((document.getElementById('cfgHf')||{value:'45'}).value)||45;
  var hd=parseInt((document.getElementById('cfgHd')||{value:'44'}).value)||44;
  var tk=(s.TASK&&s.TASK.r)?s.TASK.r:[];
  var pr=(s.TASKPRED&&s.TASKPRED.r)?s.TASKPRED.r:[];
  var wb=(s.PROJWBS&&s.PROJWBS.r)?s.PROJWBS.r:[];
  var pj=(s.PROJECT&&s.PROJECT.r&&s.PROJECT.r[0])?s.PROJECT.r[0]:{};
  // ── Currency from CURRTYPE ──────────────────────────────────────
  (function(){
    var ct=(s.CURRTYPE&&s.CURRTYPE.r)?s.CURRTYPE.r:[];
    var rsrc2=(s.RSRC&&s.RSRC.r)?s.RSRC.r:[];
    // Find curr_id used by cost resources (RT_Equip typically carries cost)
    var costR=rsrc2.find(function(r){return r.curr_id&&(r.rsrc_type==='RT_Equip'||r.rsrc_type==='RT_Labor');});
    var cid=costR?costR.curr_id:'1';
    var curr=ct.find(function(c){return c.curr_id===cid;})||ct.find(function(c){return c.base_exch_rate==='1';})||ct[0]||{};
    CURR_SYM=curr.curr_symbol||curr.curr_short_name||'$';
    CURR_CODE=curr.curr_short_name||'USD';
    // If symbol is empty (like EUR in some P6 versions), fall back to code
    if(!CURR_SYM.trim())CURR_SYM=CURR_CODE;
  })();
  var sc2=(s.SCHEDOPTIONS&&s.SCHEDOPTIONS.r&&s.SCHEDOPTIONS.r[0])?s.SCHEDOPTIONS.r[0]:{};
  var tr=(s.TASKRSRC&&s.TASKRSRC.r)?s.TASKRSRC.r:[];
  var rsrc=(s.RSRC&&s.RSRC.r)?s.RSRC.r:[];
  var udf=(s.UDFVALUE&&s.UDFVALUE.r)?s.UDFVALUE.r:[];
  var bl=(s.TASKPREV&&s.TASKPREV.r)?s.TASKPREV.r:[];
  var wm={};wb.forEach(function(w){wm[w.wbs_id]=w;});
  var tm={};tk.forEach(function(t){tm[t.task_id]=t;});
  var reg=tk.filter(function(t){return t.task_type==='TT_Task';});
  var open=tk.filter(function(t){return t.status_code!=='TK_Complete';});
  var openReg=reg.filter(function(t){return t.status_code!=='TK_Complete';});
  var tw=0,tp=0;
  tk.forEach(function(t){var w=parseFloat(t.target_drtn_hr_cnt)||0,p=parseFloat(t.phys_complete_pct)||0;tw+=w;tp+=w*p;});
  var prgS=tk.length>0?tk.reduce(function(a,t){return a+(parseFloat(t.phys_complete_pct)||0);},0)/tk.length:0;
  var prgW=tw>0?tp/tw:0;
  var cpAll=tk.filter(function(t){return t.driving_path_flag==='Y';});
  var cpOpen=cpAll.filter(function(t){return t.status_code!=='TK_Complete';});
  var fd={neg:0,zero:0,nc:0,f6:0,f16:0,hi:0};
  open.forEach(function(t){var v=(parseFloat(t.total_float_hr_cnt)||0)/8;if(v<0)fd.neg++;else if(v===0)fd.zero++;else if(v<=nc)fd.nc++;else if(v<=15)fd.f6++;else if(v<=30)fd.f16++;else fd.hi++;});
  var relT={PR_FS:0,PR_FF:0,PR_SS:0,PR_SF:0};
  var negLags=[],longLags=[];
  pr.forEach(function(p){if(relT.hasOwnProperty(p.pred_type))relT[p.pred_type]++;var lg=(parseFloat(p.lag_hr_cnt)||0)/8;if(lg<0){if(negLags.length<40)negLags.push({pred:p.pred_task_id,succ:p.task_id,lag:lg.toFixed(1),type:p.pred_type});}if(lg>5){if(longLags.length<40)longLags.push({pred:p.pred_task_id,succ:p.task_id,lag:lg.toFixed(1),type:p.pred_type});}});
  var predMap={},succMap={};
  pr.forEach(function(p){if(!predMap[p.task_id])predMap[p.task_id]=[];predMap[p.task_id].push(p);if(!succMap[p.pred_task_id])succMap[p.pred_task_id]=[];succMap[p.pred_task_id].push(p);});
  var noPred=[],noSucc=[],noLogic=[];
  openReg.forEach(function(t){var np=!predMap[t.task_id]||!predMap[t.task_id].length;var ns=!succMap[t.task_id]||!succMap[t.task_id].length;if(np)noPred.push(t);if(ns)noSucc.push(t);if(np||ns)noLogic.push({t:t,np:np,ns:ns});});
  var oosSet={};udf.forEach(function(u){if(u.udf_type_id==='813'&&u.udf_text&&u.udf_text.trim())oosSet[u.fk_id]=true;});
  var oosArr=Object.keys(oosSet).filter(function(id){var t2=tm[id];return t2&&t2.status_code==='TK_NotStart';});var oosOpen=oosArr.length;var oosActs=oosArr.map(function(id){var t2=tm[id];return{id:t2.task_code||id,name:(t2.task_name||'').slice(0,60)};});
  var constTypes={};
  tk.forEach(function(t){if(t.cstr_type&&t.cstr_type!==''&&t.cstr_type!=='CS_MEO')constTypes[t.cstr_type]=(constTypes[t.cstr_type]||0)+1;if(t.cstr_type2&&t.cstr_type2!==''&&t.cstr_type2!=='CS_MEO')constTypes[t.cstr_type2]=(constTypes[t.cstr_type2]||0)+1;});
  var hardCstKeys=['CS_MSO','CS_MFO','CS_SNET','CS_SNLT','CS_FNET','CS_FNLT'];
  var hardCst=0;hardCstKeys.forEach(function(c){hardCst+=constTypes[c]||0;});
  var resSet={};tr.forEach(function(r){resSet[r.task_id]=true;});
  var noRes=openReg.filter(function(t){return !resSet[t.task_id];});
  var hiDurActs=openReg.filter(function(t){return((parseFloat(t.target_drtn_hr_cnt)||0)/8)>hd;});
  var hiFloatActs=open.filter(function(t){return((parseFloat(t.total_float_hr_cnt)||0)/8)>hf;});
  var dangling=openReg.filter(function(t){return(!predMap[t.task_id]||!predMap[t.task_id].length)&&(!succMap[t.task_id]||!succMap[t.task_id].length);});
  var today=new Date();
  var missed=tk.filter(function(t){if(t.status_code!=='TK_NotStart')return false;var es=t.early_start_date||'';if(!es)return false;try{return new Date(es)<today;}catch(e2){return false;}});
  var cpSorted=cpOpen.slice().sort(function(a,b){return(a.early_start_date||'')<(b.early_start_date||'')?-1:1;});
  var cpChain=cpSorted.map(function(t){return{id:t.task_code,name:(t.task_name||'').slice(0,80),es:(t.early_start_date||'').slice(0,10),ef:(t.early_end_date||'').slice(0,10),rem:Math.round((parseFloat(t.remain_drtn_hr_cnt)||0)/8),tf:Math.round((parseFloat(t.total_float_hr_cnt)||0)/8),st:t.status_code,type:t.task_type};});
  var ncActs=open.filter(function(t){var v=(parseFloat(t.total_float_hr_cnt)||0)/8;return v>0&&v<=nc;});
  var ncChain=ncActs.sort(function(a,b){return(parseFloat(a.total_float_hr_cnt)||0)-(parseFloat(b.total_float_hr_cnt)||0);}).map(function(t){return{id:t.task_code,name:(t.task_name||'').slice(0,75),ef:(t.early_end_date||'').slice(0,10),tf:Math.round((parseFloat(t.total_float_hr_cnt)||0)/8),st:t.status_code};});
  var allMiles=tk.filter(function(t){return t.task_type==='TT_FinMile'||t.task_type==='TT_Mile';});
  var keyMiles=allMiles.filter(function(t){var c=t.task_code||'';return c.indexOf('-KM-')!==-1||c.indexOf('-FM-')!==-1||c.indexOf('-PM-')!==-1;}).sort(function(a,b){return((a.early_end_date||a.early_start_date||'')<(b.early_end_date||b.early_start_date||'')?-1:1);}).map(function(t){var ef=(t.early_end_date||t.early_start_date||'').slice(0,10);var lf=(t.late_end_date||t.late_start_date||'').slice(0,10);var tf=Math.round((parseFloat(t.total_float_hr_cnt)||0)/8);var variance=0;if(ef&&lf){try{variance=Math.round((new Date(ef)-new Date(lf))/86400000);}catch(ee){}}return{id:t.task_code,name:(t.task_name||'').slice(0,80),st:t.status_code,ef:ef,lf:lf,tf:tf,variance:variance};});
  var cpWBS={};cpOpen.forEach(function(t){var n=(wm[t.wbs_id]&&wm[t.wbs_id].wbs_name)?wm[t.wbs_id].wbs_name.slice(0,42):'Unknown';cpWBS[n]=(cpWBS[n]||0)+1;});
  var cpWBSArr=Object.keys(cpWBS).map(function(k){return{n:k,v:cpWBS[k]};}).sort(function(a,b){return b.v-a.v;}).slice(0,10);
  var cpLast=cpSorted[cpSorted.length-1];
  var cpLastTF=cpLast?Math.round((parseFloat(cpLast.total_float_hr_cnt)||0)/8):0;
  var cpLen=0;if(cpSorted.length>1){try{cpLen=Math.round((new Date(cpSorted[cpSorted.length-1].early_end_date)-new Date(cpSorted[0].early_start_date))/86400000);}catch(ee){}}
  var cpli=cpLen>0?Math.round((cpLen+cpLastTF)/cpLen*1000)/1000:null;
  var shouldDone=tk.filter(function(t){if(!t.target_end_date)return false;try{return new Date(t.target_end_date)<today;}catch(ee){return false;}});
  var actDone=shouldDone.filter(function(t){return t.status_code==='TK_Complete';});
  var bei=shouldDone.length>0?Math.round(actDone.length/shouldDone.length*1000)/1000:null;
  var mat={};
  var lp=openReg.length>0?(1-(noPred.length+noSucc.length)/(openReg.length*2)):1;
  mat.logic=Math.round(Math.max(0,Math.min(20,lp*20)));
  mat.resources=Math.round(Math.max(0,Math.min(15,(openReg.length>0?1-noRes.length/openReg.length:1)*15)));
  mat.constraints=Math.round(Math.max(0,Math.min(10,(tk.length>0?1-hardCst/tk.length:1)*10)));
  mat.durations=Math.round(Math.max(0,Math.min(10,(openReg.length>0?1-hiDurActs.length/openReg.length:1)*10)));
  var floatBad=fd.neg;
  mat.float=Math.round(Math.max(0,Math.min(15,(open.length>0?1-floatBad/open.length:1)*15)));
  var sfP=pr.length>0?1-relT.PR_SF/pr.length:1;
  var lagP=pr.length>0?1-(negLags.length+longLags.length/2)/pr.length:1;
  mat.relationships=Math.round(Math.max(0,Math.min(15,(sfP+lagP)/2*15)));
  mat.oos=Math.round(Math.max(0,Math.min(10,(open.length>0?1-oosOpen/open.length:1)*10)));
  mat.baseline=bl.length>0?5:0;
  mat.total=mat.logic+mat.resources+mat.constraints+mat.durations+mat.float+mat.relationships+mat.oos+mat.baseline;
  var nPredCnt=noPred.length,nSuccCnt=noSucc.length;
  var inv=tk.filter(function(t){return t.status_code!=='TK_Complete'&&(!t.early_start_date||!t.early_end_date);}).length;
  var DCMA=[
    {id:1,nm:'Logic: Missing Predecessors',val:nPredCnt,pct:openReg.length>0?Math.round(nPredCnt/openReg.length*1000)/10:0,thresh:'0',pass:nPredCnt===0,warn:nPredCnt<=5},
    {id:2,nm:'Logic: Missing Successors',val:nSuccCnt,pct:openReg.length>0?Math.round(nSuccCnt/openReg.length*1000)/10:0,thresh:'0',pass:nSuccCnt===0,warn:nSuccCnt<=5},
    {id:3,nm:'Relationship Leads (Negative Lags)',val:negLags.length,pct:pr.length>0?Math.round(negLags.length/pr.length*1000)/10:0,thresh:'0',pass:negLags.length===0,warn:false},
    {id:4,nm:'SF Relationships',val:relT.PR_SF,pct:pr.length>0?Math.round(relT.PR_SF/pr.length*1000)/10:0,thresh:'0',pass:relT.PR_SF===0,warn:relT.PR_SF<=3},
    {id:5,nm:'Hard Constraints (>5% of schedule)',val:hardCst,pct:tk.length>0?Math.round(hardCst/tk.length*1000)/10:0,thresh:'<5%',pass:hardCst/Math.max(tk.length,1)<0.05,warn:hardCst/Math.max(tk.length,1)<0.1},
    {id:6,nm:'High Duration (>'+hd+'d)',val:hiDurActs.length,pct:openReg.length>0?Math.round(hiDurActs.length/openReg.length*1000)/10:0,thresh:'<5%',pass:hiDurActs.length/Math.max(openReg.length,1)<0.05,warn:hiDurActs.length/Math.max(openReg.length,1)<0.1},
    {id:7,nm:'Invalid / Missing Dates',val:inv,pct:0,thresh:'0',pass:inv===0,warn:false},
    {id:8,nm:'Activities Missing Resources',val:noRes.length,pct:openReg.length>0?Math.round(noRes.length/openReg.length*1000)/10:0,thresh:'<5%',pass:noRes.length/Math.max(openReg.length,1)<0.05,warn:noRes.length/Math.max(openReg.length,1)<0.15},
    {id:9,nm:'Missed Activities (past due, not started)',val:missed.length,pct:0,thresh:'0',pass:missed.length===0,warn:missed.length<=3},
    {id:10,nm:'Critical Path Length Index (CPLI)',val:cpli!==null?cpli.toFixed(3):'N/A',pct:null,thresh:'>=0.95',pass:cpli!==null&&cpli>=0.95,warn:cpli!==null&&cpli>=0.8},
    {id:11,nm:'Baseline Execution Index (BEI)',val:bei!==null?bei.toFixed(3):'N/A',pct:null,thresh:'>=0.95',pass:bei!==null&&bei>=0.95,warn:bei!==null&&bei>=0.8},
    {id:12,nm:'Negative Float Activities',val:fd.neg,pct:open.length>0?Math.round(fd.neg/open.length*1000)/10:0,thresh:'0',pass:fd.neg===0,warn:false},
    {id:13,nm:'Out-of-Sequence Activities (open)',val:oosOpen,pct:open.length>0?Math.round(oosOpen/open.length*1000)/10:0,thresh:'0',pass:oosOpen===0,warn:oosOpen<=5},
    {id:14,nm:'Total Float: Critical Path Float',val:cpLastTF+'d',pct:null,thresh:'0d',pass:cpLastTF<=0,warn:cpLastTF<=5}
  ];
  var dens=Math.round(pr.length/Math.max(tk.length,1)*100)/100;
  var GAO=[
    {id:'G1',nm:'All Activities Captured',val:tk.length+' activities',pass:tk.length>=50,warn:tk.length>=20,note:'Count credible for project scale'},
    {id:'G2',nm:'Activities Properly Sequenced',val:dens+' rels/act',pass:dens>=1.5,warn:dens>=0.8,note:'Target: >=1.5 rels/activity'},
    {id:'G3',nm:'Resources Assigned',val:noRes.length+' unresourced',pass:noRes.length/Math.max(openReg.length,1)<0.05,warn:noRes.length/Math.max(openReg.length,1)<0.2,note:Math.round((1-noRes.length/Math.max(openReg.length,1))*100)+'% resourced'},
    {id:'G4',nm:'Durations Reasonable',val:hiDurActs.length+' >'+ hd+'d',pass:hiDurActs.length===0,warn:hiDurActs.length<=5,note:'Threshold: '+hd+' working days'},
    {id:'G5',nm:'Critical Path Validated',val:cpOpen.length+' critical open',pass:cpOpen.length>0&&cpOpen.length<tk.length*0.4,warn:cpOpen.length>0,note:'Should be 5-40% of open activities'},
    {id:'G6',nm:'Reasonable Float Distribution',val:fd.neg+' neg, '+fd.zero+' zero',pass:fd.neg===0&&fd.zero/Math.max(open.length,1)<0.5,warn:fd.neg===0,note:'Zero float: '+Math.round(fd.zero/Math.max(open.length,1)*100)+'% of open'},
    {id:'G7',nm:'Schedule Risk Analysis (Baseline)',val:bl.length>0?'Baseline exists':'No baseline data',pass:bl.length>0,warn:false,note:'TASKPREV table'},
    {id:'G8',nm:'Schedule Regularly Updated',val:pj.last_recalc_date?pj.last_recalc_date.slice(0,10):'No data date',pass:true,warn:false,note:'Manual verification required'},
    {id:'G9',nm:'WBS Traceability',val:Object.keys(wm).length+' WBS nodes',pass:Object.keys(wm).length>0,warn:false,note:'Horizontal traceability via WBS'}
  ];
  var NASA=[
    {nm:'Schedule Density (rels/activity)',val:dens,pass:dens>=1.5,warn:dens>=0.8,note:'Target: 1.5-3.0'},
    {nm:'FS Relationship Dominance',val:Math.round(relT.PR_FS/Math.max(pr.length,1)*100)+'%',pass:relT.PR_FS/Math.max(pr.length,1)>=0.85,warn:relT.PR_FS/Math.max(pr.length,1)>=0.75,note:'Target: >85% FS'},
    {nm:'Near-Critical Activities (TF<=' +nc+'d)',val:ncActs.length+' ('+Math.round(ncActs.length/Math.max(open.length,1)*100)+'%)',pass:ncActs.length/Math.max(open.length,1)<0.15,warn:ncActs.length/Math.max(open.length,1)<0.25,note:'Target: <15% of open'},
    {nm:'Dangling Activities (fully isolated)',val:dangling.length,pass:dangling.length===0,warn:dangling.length<=2,note:'Activities with no pred and no succ'},
    {nm:'Long Lags (>5d)',val:longLags.length,pass:longLags.length===0,warn:longLags.length<=10,note:'Replace lags with activities'},
    {nm:'Retained Logic (Schedule Option)',val:sc2.sched_retained_logic==='Y'?'Enabled':'Disabled',pass:sc2.sched_retained_logic==='Y',warn:false,note:'Must be Retained Logic'},
    {nm:'Overall Maturity Score',val:mat.total+'/100',pass:mat.total>=75,warn:mat.total>=50,note:mat.total>=75?'Credible':'Improvement needed'}
  ];
  var schedOpts={rl:sc2.sched_retained_logic==='Y',up:sc2.sched_use_project_end_date_for_float==='Y',ml:sc2.enable_multiple_longest_path_calc==='Y',ft:sc2.sched_float_type||''};
  // ── Look-ahead & completion windows ──────────────────────────────
  var ddRaw=(pj.last_recalc_date||'').slice(0,10);
  var ddTS=ddRaw?new Date(ddRaw).getTime():Date.now();
  function daysFromDD(ds){if(!ds)return 99999;try{return Math.round((new Date(ds.slice(0,10)).getTime()-ddTS)/86400000);}catch(e){return 99999;}}
  function laItem(t,prio){var tf=Math.round((parseFloat(t.total_float_hr_cnt)||0)/8);return{id:t.task_code,name:(t.task_name||'').slice(0,70),es:(t.early_start_date||'').slice(0,10),ef:(t.early_end_date||'').slice(0,10),as2:(t.act_start_date||'').slice(0,10),ae:(t.act_end_date||'').slice(0,10),rem:Math.round((parseFloat(t.remain_drtn_hr_cnt)||0)/8),tf:tf,critical:t.driving_path_flag==='Y',milestone:(t.task_type||'').indexOf('Mile')>=0,status:t.status_code,prio:prio};}
  var compWeek=[],compMonth=[],laWeek=[],laMonth=[],la3Month=[],la6Month=[];
  s.TASK.r.forEach(function(t){
    var ef=(t.early_end_date||'').slice(0,10);
    var ae=(t.act_end_date||'').slice(0,10);
    var es=(t.early_start_date||'').slice(0,10);
    var isMile=(t.task_type||'').indexOf('Mile')>=0;
    var isCrit=t.driving_path_flag==='Y';
    var tf=Math.round((parseFloat(t.total_float_hr_cnt)||0)/8);
    var prio=(isCrit?8:0)+(isMile?4:0)+(tf<=3?4:0)+(tf<=10?2:0);
    // Completions
    if(t.status_code==='TK_Complete'){
      var dAe=daysFromDD(ae);
      if(dAe>=-7&&dAe<=0)compWeek.push(laItem(t,prio));
      if(dAe>=-30&&dAe<=0)compMonth.push(laItem(t,prio));
    }
    // Look-aheads (open activities)
    if(t.status_code!=='TK_Complete'){
      var dEs=daysFromDD(es),dEf=daysFromDD(ef);
      // Activity touches the window if start or end falls within it
      if(dEs<=7&&dEf>=0)laWeek.push(laItem(t,prio));
      if(dEs<=30&&dEf>=0)laMonth.push(laItem(t,prio));
      if(dEs<=90&&dEf>=0)la3Month.push(laItem(t,prio));
      if(dEs<=180&&dEf>=0)la6Month.push(laItem(t,prio));
    }
  });
  function sortLA(arr){return arr.sort(function(a,b){return b.prio-a.prio||( a.ef||'').localeCompare(b.ef||'');}).slice(0,60);}
  var lookahead={
    dataDate:ddRaw,
    compWeek:compWeek.sort(function(a,b){return(b.ae||'').localeCompare(a.ae||'');}).slice(0,30),
    compMonth:compMonth.sort(function(a,b){return(b.ae||'').localeCompare(a.ae||'');}).slice(0,40),
    laWeek:sortLA(laWeek),
    laMonth:sortLA(laMonth),
    la3Month:sortLA(la3Month),
    la6Month:sortLA(la6Month)
  };
  // ── Redundant relationship detection ─────────────────────────────
  // Helper: resolve internal task_id → activity ID (task_code)
  function _tc(id){return tm[id]?tm[id].task_code:id;}
  // Helper: resolve to activity name
  function _tn(id){return tm[id]?(tm[id].task_name||'').slice(0,60):'';}
  // Parallel: two rels between same pred→succ pair
  var _pM={};
  pr.forEach(function(p){var k=p.pred_task_id+'|'+p.task_id;if(!_pM[k])_pM[k]=[];_pM[k].push(p);});
  var _par=[];
  Object.keys(_pM).forEach(function(k){if(_pM[k].length>1)_pM[k].forEach(function(p){
    _par.push({pred:_tc(p.pred_task_id),predName:_tn(p.pred_task_id),succ:_tc(p.task_id),succName:_tn(p.task_id),type:p.pred_type,lag:((parseFloat(p.lag_hr_cnt)||0)/8).toFixed(1)});
  });});
  // Transitive: A→C redundant when A→B and B→C exist; capture first intermediate found
  var _ds2={};
  pr.forEach(function(p){if(!_ds2[p.pred_task_id])_ds2[p.pred_task_id]=new Set();_ds2[p.pred_task_id].add(p.task_id);});
  var _tr=[];
  pr.forEach(function(p){
    var pred=p.pred_task_id,succ=p.task_id;
    var mid=_ds2[pred]?Array.from(_ds2[pred]):[];
    var via=mid.find(function(m){return m!==succ&&_ds2[m]&&_ds2[m].has(succ);});
    if(via!==undefined)
      _tr.push({pred:_tc(pred),predName:_tn(pred),via:_tc(via),viaName:_tn(via),succ:_tc(succ),succName:_tn(succ),type:p.pred_type,lag:((parseFloat(p.lag_hr_cnt)||0)/8).toFixed(1)});
  });
  var redundantRels={parallel:_par.slice(0,300),transitive:_tr.slice(0,300),parallelCnt:_par.length,transitiveCnt:_tr.length};

  return {
    project:{name:pj.proj_short_name||pj.proj_id||'',dd:(pj.last_recalc_date||'').slice(0,10),ps:(pj.plan_start_date||'').slice(0,10),pe:(pj.scd_end_date||'').slice(0,10)},
    counts:{total:tk.length,reg:reg.length,fm:tk.filter(function(t){return t.task_type==='TT_FinMile';}).length,sm:tk.filter(function(t){return t.task_type==='TT_Mile';}).length,comp:tk.filter(function(t){return t.status_code==='TK_Complete';}).length,act:tk.filter(function(t){return t.status_code==='TK_Active';}).length,ns:tk.filter(function(t){return t.status_code==='TK_NotStart';}).length},
    prg:{s:Math.round(prgS*10)/10,w:Math.round(prgW*10)/10},
    cp:{tot:cpAll.length,open:cpOpen.length,chain:cpChain,cpli:cpli,cpLastTF:cpLastTF,bei:bei,wbs:cpWBSArr},
    fd:fd,nc:{cnt:ncActs.length,days:nc,chain:ncChain},
    rels:{tot:pr.length,PR_FS:relT.PR_FS,PR_FF:relT.PR_FF,PR_SS:relT.PR_SS,PR_SF:relT.PR_SF,negLagCnt:negLags.length,longLagCnt:longLags.length,density:dens,negLags:negLags,longLags:longLags},
    q:{noPred:noPred.length,noSucc:noSucc.length,noLogic:noLogic.slice(0,60),hardCst:hardCst,constTypes:constTypes,hiDur:hiDurActs.length,hiDurActs:hiDurActs.slice(0,20).map(function(t){return{id:t.task_code,name:(t.task_name||'').slice(0,60),d:Math.round((parseFloat(t.target_drtn_hr_cnt)||0)/8)};}),noRes:noRes.length,oosOpen:oosOpen,oosTot:Object.keys(oosSet).length,oosActs:oosActs,dangling:dangling.length,dangActs:dangling.slice(0,20).map(function(t){return{id:t.task_code,name:(t.task_name||'').slice(0,60)};}),missed:missed.length,negF:fd.neg,hiFloat:hiFloatActs.length,hiFloatActs:hiFloatActs.slice(0,20).map(function(t){return{id:t.task_code,name:(t.task_name||'').slice(0,60),tf:Math.round((parseFloat(t.total_float_hr_cnt)||0)/8)};})},
    dcma:DCMA,gao:GAO,nasa:NASA,mat:mat,
    open:open.length,openReg:openReg.length,
    keyMilestones:keyMiles,schedOpts:schedOpts,bl:bl.length>0,lookahead:lookahead,redundant:redundantRels
  };
}

// ── EVM ──────────────────────────────────────────────────────────────
// ── Shared helpers for S-curve computation (global) ─────────────────
function spreadMth(qty,s0,e0){var res={};if(!qty||!s0||!e0)return res;try{var sy=parseInt(s0.slice(0,4)),sm=parseInt(s0.slice(5,7));var ey=parseInt(e0.slice(0,4)),em=parseInt(e0.slice(5,7));var nm=Math.max(1,(ey-sy)*12+(em-sm)+1),pp=qty/nm;for(var i=0;i<nm;i++){var mm=sm+i,yy=sy;while(mm>12){mm-=12;yy++;}var k=yy+'-'+(mm<10?'0':'')+mm;res[k]=(res[k]||0)+pp;}}catch(ee){}return res;}
function buildCum(mthMap){var ks=Object.keys(mthMap).sort(),c=0;return ks.map(function(m){c+=mthMap[m];return{date:m,v:Math.round(c)};});}

function extractEVM(s){
  var pj=(s.PROJECT&&s.PROJECT.r&&s.PROJECT.r[0])?s.PROJECT.r[0]:{};
  var tk=(s.TASK&&s.TASK.r)?s.TASK.r:[];
  var tr=(s.TASKRSRC&&s.TASKRSRC.r)?s.TASKRSRC.r:[];
  var tf2=(s.TASKFIN&&s.TASKFIN.r)?s.TASKFIN.r:[];
  var fd=(s.FINDATES&&s.FINDATES.r)?s.FINDATES.r:[];
  var rsrc=(s.RSRC&&s.RSRC.r)?s.RSRC.r:[];
  var tm={};tk.forEach(function(t){tm[t.task_id]=t;});
  var rm={};rsrc.forEach(function(r){rm[r.rsrc_id]=r;});
  var BAC=0,EV=0,AC=0,RC=0;
  tr.forEach(function(r){var task=tm[r.task_id];var pct=task?(parseFloat(task.phys_complete_pct)||0)/100:0;var tc=parseFloat(r.target_cost)||0;BAC+=tc;EV+=tc*pct;AC+=(parseFloat(r.act_reg_cost)||0)+(parseFloat(r.act_ot_cost)||0);RC+=parseFloat(r.remain_cost)||0;});
  var pdMap={};fd.forEach(function(p){pdMap[p.fin_dates_id]=p;});
  var byPd={};
  tf2.forEach(function(row){var p=pdMap[row.fin_dates_id];if(!p)return;var k=(p.end_date||'').slice(0,10);if(!byPd[k])byPd[k]={d:k,ev:0,ac:0,pv:0};byPd[k].ev+=parseFloat(row.bcwp)||0;byPd[k].pv+=parseFloat(row.bcws)||0;byPd[k].ac+=(parseFloat(row.act_work_cost)||0)+(parseFloat(row.act_equip_cost)||0)+(parseFloat(row.act_mat_cost)||0);});
  var periods=Object.values(byPd).sort(function(a,b){return a.d<b.d?-1:1;});
  var cEV=0,cAC=0,cPV=0;
  var sCurve=periods.map(function(p){cEV+=p.ev;cAC+=p.ac;cPV+=p.pv;return{date:p.d,ev:Math.round(cEV),ac:Math.round(cAC),pv:Math.round(cPV)};});
  var lat=sCurve.length>0?sCurve[sCurve.length-1]:{ev:EV,ac:AC,pv:0};
  var lEV=lat.ev||EV,lAC=lat.ac||AC,lPV=lat.pv;
  // ── Quality flag: track whether period-based data was available ────
  var evmDataSource={
    ev:lat.ev>0?'TASKFIN':'TASKRSRC',
    ac:lat.ac>0?'TASKFIN':'TASKRSRC',
    pv:lat.pv>0?'TASKFIN':'computed'
  };
  // ── PV fallback: if TASKFIN had no PV, compute from time-phased curve ──
  // This will be set below after pvEarlyCurve is built
  // ── EVM derived metrics (PMI Standard for EVM, 2019) ───────────────
  var CPI=lAC>0?Math.round(lEV/lAC*1000)/1000:0;
  var SPI=lPV>0?Math.round(lEV/lPV*1000)/1000:0;
  // EAC = BAC / CPI (Method 1 — assumes future = past performance)
  var EAC=CPI>0?Math.round(BAC/CPI):Math.round(lAC+RC);
  // TCPI(BAC) = remaining work / remaining budget
  // Handle edge cases: if BAC<=AC (over-budget), TCPI is undefined → infinity
  var remBudget=BAC-lAC, remWork=BAC-lEV;
  var TCPI=remBudget>0?Math.round(remWork/remBudget*1000)/1000:(remWork>0?999:1);
  // ── Build all monthly S-curves ─────────────────────────────────────
  var dataDateStr=(pj.last_recalc_date||'').slice(0,10);
  var pvEMap={},pvLMap={},remEMap={},remLMap={},evMthMap={},acMthMap={};
  tr.forEach(function(r){
    var task2=tm[r.task_id];if(!task2)return;
    var tc=parseFloat(r.target_cost)||0;
    var rc=parseFloat(r.remain_cost)||0;
    var ac2=(parseFloat(r.act_reg_cost)||0)+(parseFloat(r.act_ot_cost)||0);
    var st=task2.status_code;
    // Dates based on task status
    var pvEs,pvEe,pvLs,pvLe;
    if(st==='TK_Complete'){
      // Use actual dates for completed tasks (early_start is set to data date in P6, not real start)
      pvEs=(task2.act_start_date||task2.early_start_date||'').slice(0,10);
      pvEe=(task2.act_end_date||task2.early_end_date||'').slice(0,10);
      pvLs=pvEs; pvLe=pvEe;  // same for late (task is already done)
    } else if(st==='TK_Active'){
      pvEs=(task2.act_start_date||task2.early_start_date||'').slice(0,10);
      pvEe=(task2.early_end_date||task2.target_end_date||'').slice(0,10);
      pvLs=pvEs;
      pvLe=(task2.late_end_date||pvEe).slice(0,10);
    } else {
      pvEs=(task2.early_start_date||task2.target_start_date||'').slice(0,10);
      pvEe=(task2.early_end_date||task2.target_end_date||'').slice(0,10);
      pvLs=(task2.late_start_date||pvEs).slice(0,10);
      pvLe=(task2.late_end_date||pvEe).slice(0,10);
    }
    // PV Early
    if(tc&&pvEs&&pvEe){var spe=spreadMth(tc,pvEs,pvEe);Object.keys(spe).forEach(function(k){pvEMap[k]=(pvEMap[k]||0)+spe[k];});}
    // PV Late
    if(tc&&pvLs&&pvLe){var spl=spreadMth(tc,pvLs,pvLe);Object.keys(spl).forEach(function(k){pvLMap[k]=(pvLMap[k]||0)+spl[k];});}
    // Remaining Early (not-started + active tasks)
    if(rc&&st!=='TK_Complete'){
      var res2=(task2.restart_date||task2.early_start_date||'').slice(0,10);
      var ree=(task2.reend_date||task2.early_end_date||'').slice(0,10);
      if(res2&&ree){var sre=spreadMth(rc,res2,ree);Object.keys(sre).forEach(function(k){remEMap[k]=(remEMap[k]||0)+sre[k];});}
    }
    // Remaining Late
    if(rc&&st!=='TK_Complete'){
      var rls=(task2.rem_late_start_date||task2.late_start_date||'').slice(0,10);
      var rle=(task2.rem_late_end_date||task2.late_end_date||'').slice(0,10);
      if(rls&&rle){var srl=spreadMth(rc,rls,rle);Object.keys(srl).forEach(function(k){remLMap[k]=(remLMap[k]||0)+srl[k];});}
    }
    // EV monthly: completed = full target_cost spread over actual dates; active = earned fraction
    if(tc){
      if(st==='TK_Complete'&&pvEs&&pvEe){var sev=spreadMth(tc,pvEs,pvEe);Object.keys(sev).forEach(function(k){evMthMap[k]=(evMthMap[k]||0)+sev[k];});}
      else if(st==='TK_Active'){
        var pct3=(parseFloat(task2.phys_complete_pct)||0)/100;var ev3=tc*pct3;
        if(ev3>0){var s0a=(task2.act_start_date||pvEs||dataDateStr).slice(0,10);var e0a=dataDateStr;
          if(s0a&&e0a&&s0a<=e0a){var seva=spreadMth(ev3,s0a,e0a);Object.keys(seva).forEach(function(k){evMthMap[k]=(evMthMap[k]||0)+seva[k];});}}
      }
    }
    // AC monthly: spread actual cost over act_start → act_end (or data date)
    if(ac2&&pvEs){
      var ace=(st==='TK_Complete'&&pvEe)?pvEe:dataDateStr;
      if(pvEs&&ace&&pvEs<=ace){var sac=spreadMth(ac2,pvEs,ace);Object.keys(sac).forEach(function(k){acMthMap[k]=(acMthMap[k]||0)+sac[k];});}
    }
  });
  var pvEarlyCurve=buildCum(pvEMap);
  var pvLateCurve=buildCum(pvLMap);
  var evMthCurve=buildCum(evMthMap);
  var acMthCurve=buildCum(acMthMap);
  // ── PV/AC fallback: use time-phased curves at data date if TASKFIN empty ──
  var _ddmFb=dataDateStr.slice(0,7);
  if(lPV<=0&&pvEarlyCurve.length&&_ddmFb){
    for(var fbi=pvEarlyCurve.length-1;fbi>=0;fbi--){
      if(pvEarlyCurve[fbi].date<=_ddmFb){lPV=pvEarlyCurve[fbi].v;evmDataSource.pv='time-phased PV-Early curve at DD';break;}
    }
    if(lPV<=0&&pvEarlyCurve.length)lPV=pvEarlyCurve[pvEarlyCurve.length-1].v;
    SPI=lPV>0?Math.round(lEV/lPV*1000)/1000:0;
  }
  if(lAC<=0&&acMthCurve.length&&_ddmFb){
    for(var fbi2=acMthCurve.length-1;fbi2>=0;fbi2--){
      if(acMthCurve[fbi2].date<=_ddmFb){lAC=acMthCurve[fbi2].v;evmDataSource.ac='time-phased AC curve at DD';break;}
    }
    CPI=lAC>0?Math.round(lEV/lAC*1000)/1000:0;
    EAC=CPI>0?Math.round(BAC/CPI):Math.round(lAC+RC);
    var rb2=BAC-lAC,rw2=BAC-lEV;TCPI=rb2>0?Math.round(rw2/rb2*1000)/1000:(rw2>0?999:1);
  }
  if(lEV<=0&&evMthCurve.length&&_ddmFb){
    for(var fbi3=evMthCurve.length-1;fbi3>=0;fbi3--){
      if(evMthCurve[fbi3].date<=_ddmFb){lEV=evMthCurve[fbi3].v;evmDataSource.ev='time-phased EV curve at DD';break;}
    }
  }
  // Rem Early/Late: start from EV endpoint at data date, then accumulate remaining
  function buildRemForecast(remMap,startDate,startVal){
    var keys=Object.keys(remMap).filter(function(k){return k>=startDate;}).sort();
    var pts=[{date:startDate,v:Math.round(startVal)}];
    var cum=startVal;
    keys.forEach(function(k){cum+=remMap[k];pts.push({date:k,v:Math.round(cum)});});
    return pts;
  }
  var _ddm=dataDateStr.slice(0,7);  // data date month for forecast start
  var remEarlyCurve=buildRemForecast(remEMap,_ddm,lEV);
  var remLateCurve=buildRemForecast(remLMap,_ddm,lEV);
  // Earned Schedule: date on PV-Early where cumulative PV = current EV
  var earnedScheduleDate='';
  if(pvEarlyCurve.length>0&&lEV>0){
    for(var ei=0;ei<pvEarlyCurve.length-1;ei++){
      if(pvEarlyCurve[ei].v<=lEV&&pvEarlyCurve[ei+1].v>=lEV){earnedScheduleDate=pvEarlyCurve[ei].date;break;}
    }
    if(!earnedScheduleDate){earnedScheduleDate=pvEarlyCurve[pvEarlyCurve.length-1].date;}
  }
  var dataDateMonth=(pj.last_recalc_date||'').slice(0,7);
  // Keep weekly sCurve for backward compat
  var pvCurve=pvEarlyCurve.map(function(p){return{date:p.date,pv:p.v};});
  // ── Resource totals ──────────────────────────────────────────────
  var trMap={};tr.forEach(function(r){trMap[r.taskrsrc_id]=r;});
  var rtotals={};
  tr.forEach(function(r){var res=rm[r.rsrc_id];if(!res)return;var id=res.rsrc_id;if(!rtotals[id])rtotals[id]={id:id,name:res.rsrc_name||res.rsrc_short_name||'?',short:res.rsrc_short_name||'',type:res.rsrc_type||'',qtType:res.cost_qty_type||'',bac:0,ac:0,bqty:0,aqty:0,rqty:0};rtotals[id].bac+=parseFloat(r.target_cost)||0;rtotals[id].ac+=(parseFloat(r.act_reg_cost)||0)+(parseFloat(r.act_ot_cost)||0);rtotals[id].bqty+=parseFloat(r.target_qty)||0;rtotals[id].aqty+=(parseFloat(r.act_reg_qty)||0)+(parseFloat(r.act_ot_qty)||0);rtotals[id].rqty+=parseFloat(r.remain_qty)||0;});
  rsrc.forEach(function(res){if(!rtotals[res.rsrc_id])rtotals[res.rsrc_id]={id:res.rsrc_id,name:res.rsrc_name||res.rsrc_short_name||'?',short:res.rsrc_short_name||'',type:res.rsrc_type||'',qtType:res.cost_qty_type||'',bac:0,ac:0,bqty:0,aqty:0,rqty:0};});
  var rg={labor:[],material:[],equipment:[]};
  Object.values(rtotals).forEach(function(r){var e={id:r.id,name:r.name,short:r.short,bac:Math.round(r.bac),ac:Math.round(r.ac),bqty:Math.round(r.bqty),aqty:Math.round(r.aqty),rqty:Math.round(r.rqty),qtType:r.qtType};if(r.type==='RT_Labor')rg.labor.push(e);else if(r.type==='RT_Mat')rg.material.push(e);else rg.equipment.push(e);});
  // ── Per-resource unit S-curves ────────────────────────────────────
  // Actual units from TRSRCFIN (already recorded per period)
  var trsrcfin=(s.TRSRCFIN&&s.TRSRCFIN.r)?s.TRSRCFIN.r:[];
  var actByRsrcPd={};
  trsrcfin.forEach(function(row){var taskrsrc=trMap[row.taskrsrc_id];if(!taskrsrc)return;var rsrcId=taskrsrc.rsrc_id;var pd=pdMap[row.fin_dates_id];if(!pd)return;var periodEnd=(pd.end_date||'').slice(0,10);if(!actByRsrcPd[rsrcId])actByRsrcPd[rsrcId]={};if(!actByRsrcPd[rsrcId][periodEnd])actByRsrcPd[rsrcId][periodEnd]=0;actByRsrcPd[rsrcId][periodEnd]+=parseFloat(row.act_qty)||0;});
  // Planned & remaining units: spread target_qty / remain_qty linearly across task months
  function spreadQtyByMonth(qty,startDateStr,endDateStr){var result={};if(!qty||!startDateStr||!endDateStr)return result;try{var sd=new Date(startDateStr),ed=new Date(endDateStr);if(ed<sd)ed=sd;var sy=sd.getFullYear(),sm=sd.getMonth()+1;var ey=ed.getFullYear(),em=ed.getMonth()+1;var nm=Math.max(1,(ey-sy)*12+(em-sm)+1);var pp=qty/nm;for(var i=0;i<nm;i++){var mm=sm+i,yy=sy;while(mm>12){mm-=12;yy++;}var key=yy+'-'+(mm<10?'0':'')+mm;result[key]=(result[key]||0)+pp;}return result;}catch(ee){return result;}}
  var planByRsrcMth={},remByRsrcMth={},remByRsrcMthLate={};
  tr.forEach(function(r){var res=rm[r.rsrc_id];if(!res)return;var id=res.rsrc_id;var task2=tm[r.task_id];if(!task2)return;var bqty=parseFloat(r.target_qty)||0;var rqty=parseFloat(r.remain_qty)||0;// Planned: spread target_qty over early_start → early_end
  if(bqty){var spread=spreadQtyByMonth(bqty,task2.early_start_date||task2.target_start_date,task2.early_end_date||task2.target_end_date);Object.keys(spread).forEach(function(mth){if(!planByRsrcMth[id])planByRsrcMth[id]={};planByRsrcMth[id][mth]=(planByRsrcMth[id][mth]||0)+spread[mth];});}// Remaining: spread remain_qty over remain_start → early_end (future only)
  if(rqty&&task2.status_code!=='TK_Complete'){
    var remStart=task2.reend_date||task2.early_start_date||'';var remEnd=task2.early_end_date||task2.target_end_date||'';
    var spread2=spreadQtyByMonth(rqty,remStart,remEnd);Object.keys(spread2).forEach(function(mth){if(!remByRsrcMth[id])remByRsrcMth[id]={};remByRsrcMth[id][mth]=(remByRsrcMth[id][mth]||0)+spread2[mth];});
    var latEnd=task2.late_end_date||task2.target_end_date||remEnd;
    var spread2L=spreadQtyByMonth(rqty,remStart,latEnd);Object.keys(spread2L).forEach(function(mth){if(!remByRsrcMthLate[id])remByRsrcMthLate[id]={};remByRsrcMthLate[id][mth]=(remByRsrcMthLate[id][mth]||0)+spread2L[mth];});
  }});
  // Build cumulative S-curves per resource
  var resourceCurves={};
  var allRsrcIds=Object.keys(rtotals).filter(function(id){return rtotals[id].bqty>0||rtotals[id].aqty>0;});
  allRsrcIds.forEach(function(id){var planMths=planByRsrcMth[id]||{};var remMths=remByRsrcMth[id]||{};var actPds=actByRsrcPd[id]||{};// Collect all time keys
  var allKeys={};Object.keys(planMths).forEach(function(k){allKeys[k]=1;});Object.keys(actPds).forEach(function(k){allKeys[k.slice(0,7)]=1;});Object.keys(remMths).forEach(function(k){allKeys[k]=1;});var sortedKeys=Object.keys(allKeys).sort();// ── Build per-resource curves with correct DD clipping ────────────
  var remLateMths=remByRsrcMthLate[id]||{};
  // Include late-rem months in label set
  Object.keys(remLateMths).forEach(function(k){allKeys[k]=1;});
  sortedKeys=Object.keys(allKeys).sort();

  var cumPlan=0,cumAct=0,cumRemE=0,cumRemL=0;
  var actAtDD=0;
  var plannedCurve=[],actualCurve=[],remainingCurve=[],remLateCurve=[];

  sortedKeys.forEach(function(k){
    // Planned: always cumulative
    cumPlan+=(planMths[k]||0);
    plannedCurve.push({date:k,qty:Math.round(cumPlan)});

    // Actual: only up to and including data date month; null after
    var actInMth=0;
    Object.keys(actPds).forEach(function(pd){if(pd.slice(0,7)===k)actInMth+=actPds[pd];});
    if(!dataDateMonth||k<=dataDateMonth){
      cumAct+=actInMth;
      actualCurve.push({date:k,qty:Math.round(cumAct)});
      actAtDD=cumAct; // track value at last actual point
    }
    // Remaining: only from data date month onward, anchored to actAtDD
    if(dataDateMonth&&k>=dataDateMonth){
      if(k>dataDateMonth){cumRemE+=(remMths[k]||0);cumRemL+=(remLateMths[k]||0);}
      remainingCurve.push({date:k,qty:Math.round(actAtDD+cumRemE)});
      remLateCurve.push({date:k,qty:Math.round(actAtDD+cumRemL)});
    } else if(!dataDateMonth){
      // No dataDate known: show remaining from start
      cumRemE+=(remMths[k]||0);cumRemL+=(remLateMths[k]||0);
      remainingCurve.push({date:k,qty:Math.round(cumAct+cumRemE)});
      remLateCurve.push({date:k,qty:Math.round(cumAct+cumRemL)});
    }
  });
  resourceCurves[id]={planned:plannedCurve,actual:actualCurve,remaining:remainingCurve,remainingLate:remLateCurve,actAtDD:Math.round(actAtDD)};});
  rg.labor.sort(function(a,b){return b.bac-a.bac;});rg.material.sort(function(a,b){return b.bac-a.bac;});rg.equipment.sort(function(a,b){return b.bac-a.bac;});
  var allResources=Object.values(rtotals).filter(function(r){return r.bqty>0||r.aqty>0;}).sort(function(a,b){return b.bqty-a.bqty;});
  return{BAC:Math.round(BAC),EV:Math.round(lEV),AC:Math.round(lAC),PV:Math.round(lPV),RC:Math.round(RC),CPI:CPI,SPI:SPI,CV:Math.round(lEV-lAC),SV:Math.round(lEV-lPV),EAC:EAC,ETC:Math.round(EAC-lAC),VAC:Math.round(BAC-EAC),TCPI:TCPI,pctDone:BAC>0?Math.round(lEV/BAC*100*10)/10:0,sCurve:sCurve,pvCurve:pvCurve,pvEarlyCurve:pvEarlyCurve,pvLateCurve:pvLateCurve,evMthCurve:evMthCurve,acMthCurve:acMthCurve,remEarlyCurve:remEarlyCurve,remLateCurve:remLateCurve,earnedScheduleDate:earnedScheduleDate,dataDateMonth:dataDateMonth,evmDataSource:evmDataSource,resources:rg,allResources:allResources,resourceCurves:resourceCurves,periodCount:periods.length,latestPeriod:sCurve.length>0?sCurve[sCurve.length-1].date:''};
}

// ── BASELINE EVM EXTRACTOR ────────────────────────────────────────
function extractBaselineEVM(s){
  var tk=(s.TASK&&s.TASK.r)?s.TASK.r:[];var tr=(s.TASKRSRC&&s.TASKRSRC.r)?s.TASKRSRC.r:[];
  var rm2=(s.RSRC&&s.RSRC.r)?s.RSRC.r:[];var pj2=(s.PROJECT&&s.PROJECT.r&&s.PROJECT.r[0])?s.PROJECT.r[0]:{};
  var tm={};tk.forEach(function(t){tm[t.task_id]=t;});
  var pvEMap={},pvLMap={},BAC=0,rsrcQtyE={},rsrcQtyL={},rsrcBqty={};
  tr.forEach(function(r){
    var task=tm[r.task_id];if(!task)return;
    var tc=parseFloat(r.target_cost)||0,bq=parseFloat(r.target_qty)||0,rid=r.rsrc_id;
    var es=(task.early_start_date||task.target_start_date||'').slice(0,10);
    var ee=(task.early_end_date||task.target_end_date||'').slice(0,10);
    var ls=(task.late_start_date||es).slice(0,10);var le=(task.late_end_date||ee).slice(0,10);
    if(tc){BAC+=tc;
      if(es&&ee){var se=spreadMth(tc,es,ee);Object.keys(se).forEach(function(k){pvEMap[k]=(pvEMap[k]||0)+se[k];});}
      if(ls&&le){var sl=spreadMth(tc,ls,le);Object.keys(sl).forEach(function(k){pvLMap[k]=(pvLMap[k]||0)+sl[k];});}
    }
    if(rid&&bq){rsrcBqty[rid]=(rsrcBqty[rid]||0)+bq;
      if(es&&ee){var sqe=spreadMth(bq,es,ee);if(!rsrcQtyE[rid])rsrcQtyE[rid]={};Object.keys(sqe).forEach(function(k){rsrcQtyE[rid][k]=(rsrcQtyE[rid][k]||0)+sqe[k];});}
      if(ls&&le){var sql=spreadMth(bq,ls,le);if(!rsrcQtyL[rid])rsrcQtyL[rid]={};Object.keys(sql).forEach(function(k){rsrcQtyL[rid][k]=(rsrcQtyL[rid][k]||0)+sql[k];});}
    }
  });
  var rsrcBlCurves={};Object.keys(rsrcBqty).forEach(function(id){rsrcBlCurves[id]={early:buildCum(rsrcQtyE[id]||{}),late:buildCum(rsrcQtyL[id]||{}),bqty:Math.round(rsrcBqty[id])};});
  return{BAC:Math.round(BAC),pvEarlyCurve:buildCum(pvEMap),pvLateCurve:buildCum(pvLMap),rsrcBlCurves:rsrcBlCurves,
    project:{name:pj2.proj_short_name||pj2.proj_id||'',dd:(pj2.last_recalc_date||'').slice(0,10),ps:(pj2.plan_start_date||'').slice(0,10),pe:(pj2.scd_end_date||'').slice(0,10)}};
}


// ── BASELINE LOADER ───────────────────────────────────────────────
async function loadBaseline(file){
  if(!file)return;
  if(!file.name.toLowerCase().endsWith('.xer')){alert('Please upload a .xer baseline file');return;}
  var bstat=document.getElementById('baselineStatus');
  if(bstat)bstat.textContent='Parsing '+file.name+'...';
  try{
    var text=await new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(e){res(e.target.result);};fr.onerror=function(){rej(new Error('Read error'));};fr.readAsText(file,'windows-1252');});
    BRAW=parseXER(text);
    BM=extractAll(BRAW);
    BEVM=extractBaselineEVM(BRAW);
    BFNAME=file.name;
    if(bstat){bstat.innerHTML='<span style="color:var(--em)">&#x2713; '+file.name+' loaded</span> &middot; BAC: '+fmtM(BEVM.BAC)+' &middot; End: '+BEVM.project.pe+' &middot; <button onclick="clearBaseline()" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:10px;text-decoration:underline">Clear</button>';}
    // Refresh EVM tab if active
    if(document.getElementById('tab-evm')&&!document.getElementById('tab-evm').classList.contains('hidden')){renderEVMTab();}
    // Refresh compliance for variance columns
    if(M){renderCompliance();renderMilestones();}
    // Update exec summary
    renderExecSummary();
  }catch(e){
    console.error('Baseline load error:',e);
    if(bstat)bstat.innerHTML='<span style="color:var(--rd)">Error: '+e.message+'</span>';
  }
}
function clearBaseline(){
  BRAW=null;BM=null;BEVM=null;BFNAME='';
  var bstat=document.getElementById('baselineStatus');
  if(bstat)bstat.textContent='Compare PV Early/Late against baseline schedule';
  var bfi=document.getElementById('bfi');if(bfi)bfi.value='';
  if(M){renderEVMTab();renderCompliance();renderMilestones();renderExecSummary();}
}


// ── FORENSIC COMPARE ─────────────────────────────────────────────────
function forensic(s1,s2){
  var tk1=(s1.TASK&&s1.TASK.r)?s1.TASK.r:[];
  var tk2=(s2.TASK&&s2.TASK.r)?s2.TASK.r:[];
  var pr1=(s1.TASKPRED&&s1.TASKPRED.r)?s1.TASKPRED.r:[];
  var pr2=(s2.TASKPRED&&s2.TASKPRED.r)?s2.TASKPRED.r:[];
  var m1={},m2={};
  tk1.forEach(function(t){m1[t.task_code]=t;});tk2.forEach(function(t){m2[t.task_code]=t;});
  var added=[],removed=[],modified=[];
  Object.keys(m2).forEach(function(c){if(!m1[c])added.push({id:c,name:(m2[c].task_name||'').slice(0,70),st:m2[c].status_code});});
  Object.keys(m1).forEach(function(c){if(!m2[c])removed.push({id:c,name:(m1[c].task_name||'').slice(0,70)});});
  Object.keys(m1).forEach(function(c){
    var t1=m1[c],t2=m2[c];if(!t2)return;var ch=[];
    if(t1.status_code!==t2.status_code)ch.push({f:'Status',from:t1.status_code,to:t2.status_code});
    var ef1=(t1.early_end_date||'').slice(0,10),ef2=(t2.early_end_date||'').slice(0,10);
    if(ef1&&ef2&&ef1!==ef2){try{ch.push({f:'EF',from:ef1,to:ef2,diff:Math.round((new Date(ef2)-new Date(ef1))/86400000)});}catch(ee){}}
    var es1=(t1.early_start_date||'').slice(0,10),es2=(t2.early_start_date||'').slice(0,10);
    if(es1&&es2&&es1!==es2){try{ch.push({f:'ES',from:es1,to:es2,diff:Math.round((new Date(es2)-new Date(es1))/86400000)});}catch(ee){}}
    var d1=Math.round((parseFloat(t1.target_drtn_hr_cnt)||0)/8),d2=Math.round((parseFloat(t2.target_drtn_hr_cnt)||0)/8);
    if(d1!==d2)ch.push({f:'Duration',from:d1+'d',to:d2+'d',diff:d2-d1});
    var f1=Math.round((parseFloat(t1.total_float_hr_cnt)||0)/8),f2=Math.round((parseFloat(t2.total_float_hr_cnt)||0)/8);
    if(f1!==f2)ch.push({f:'Float',from:f1+'d',to:f2+'d',diff:f2-f1});
    if(t1.driving_path_flag!==t2.driving_path_flag)ch.push({f:'Critical',from:t1.driving_path_flag==='Y'?'Yes':'No',to:t2.driving_path_flag==='Y'?'Yes':'No'});
    if(ch.length>0)modified.push({id:c,name:(t1.task_name||'').slice(0,65),changes:ch});
  });
  var rk=function(r){return r.pred_task_id+'>'+r.task_id+'>'+r.pred_type;};
  var rs1={},rs2={};pr1.forEach(function(r){rs1[rk(r)]=true;});pr2.forEach(function(r){rs2[rk(r)]=true;});
  var getEF=function(m){var c=m.changes.find(function(c2){return c2.f==='EF';});return c?c.diff:0;};
  modified.sort(function(a,b){return Math.abs(getEF(b))-Math.abs(getEF(a));});
  return{added:added,removed:removed,modified:modified.slice(0,80),addedCnt:added.length,removedCnt:removed.length,modifiedCnt:modified.length,rA:pr2.filter(function(r){return !rs1[rk(r)];}).length,rR:pr1.filter(function(r){return !rs2[rk(r)];}).length,slippage:modified.filter(function(m){return getEF(m)>5;}).slice(0,25),gained:modified.filter(function(m){return getEF(m)<-5;}).slice(0,25),newCritical:modified.filter(function(m){return m.changes.some(function(c){return c.f==='Critical'&&c.to==='Yes';});}),notCritical:modified.filter(function(m){return m.changes.some(function(c){return c.f==='Critical'&&c.to==='No';});})};
}

// ── FILE LOADING ─────────────────────────────────────────────────────
function dropFile(e,tgt){e.preventDefault();var dz=document.getElementById(tgt==='single'?'dz1':tgt==='c1'?'cdz1':'cdz2');if(dz)dz.classList.remove('drag');var f=e.dataTransfer.files[0];if(f)loadFile(f,tgt);}
async function loadFile(file,tgt){
  if(!file)return;
  var eid=tgt==='single'?'err1':'errc';
  if(!file.name.toLowerCase().endsWith('.xer')){showErr(eid,'Please upload a .xer file');return;}
  if(file.size>80*1024*1024){showErr(eid,'File too large (max 80MB)');return;}
  // Charge 1 credit for single-XER analysis (compare mode charges on goCmp)
  if(tgt==='single'&&!useCredit('Single XER: '+file.name))return;
  try{
    if(tgt==='single'){document.getElementById('dzOrb1').innerHTML='<div class="spin"></div>';document.getElementById('dzT1').textContent='Parsing '+file.name+'...';}
    else if(tgt==='c1'){document.getElementById('cico1').textContent='\u23F3';document.getElementById('ctit1').textContent='Parsing...';}
    else{document.getElementById('cico2').textContent='\u23F3';document.getElementById('ctit2').textContent='Parsing...';}
    var text=await new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(e){res(e.target.result);};fr.onerror=function(){rej(new Error('Read error'));};fr.readAsText(file,'windows-1252');});
    var raw=parseXER(text);var m=extractAll(raw);
    if(m.counts.total===0)throw new Error('No activities found. Verify this is a valid P6 XER file.');
    hideErr(eid);
    if(tgt==='single'){
      RAW=raw;M=m;EVM=extractEVM(raw);
      renderAll();var pi=document.getElementById('cfgPrj');if(pi&&m.project.name)pi.value=m.project.name;
      setChips();goStep(1);
    } else if(tgt==='c1'){
      RAW1=raw;M1=m;F1=file.name;
      var _z1=document.getElementById('cdz1');if(_z1)_z1.classList.add('loaded');var _i1=document.getElementById('cico1');if(_i1)_i1.textContent='\u2705';var _n1=document.getElementById('ctit1');if(_n1)_n1.textContent=file.name;var _b1=document.getElementById('csub1');if(_b1)_b1.textContent=m.counts.total+' activities';
      checkCmpReady();
    } else {
      RAW2=raw;M2=m;F2=file.name;
      var _z2=document.getElementById('cdz2');if(_z2)_z2.classList.add('loaded');var _i2=document.getElementById('cico2');if(_i2)_i2.textContent='\u2705';var _n2=document.getElementById('ctit2');if(_n2)_n2.textContent=file.name;var _b2=document.getElementById('csub2');if(_b2)_b2.textContent=m.counts.total+' activities';
      checkCmpReady();
    }
  }catch(e){
    console.error('Load error:',e);showErr(eid,'Error: '+(e.message||String(e)));
    if(tgt==='single'){document.getElementById('dzOrb1').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,1)" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>';document.getElementById('dzT1').textContent='Drop your XER file here';}
  }
}
function checkCmpReady(){
  var ready=!!(M1&&M2);
  var btn=document.getElementById('cmpBtn');
  if(btn){btn.style.opacity=ready?'1':'0.35';btn.style.fontWeight=ready?'800':'400';}
  if(ready){
    if(typeof setChips==='function')try{setChips('cmp');}catch(e){}
    var fp=document.getElementById('cmpFPreview');
    if(fp)fp.innerHTML='<div style="background:rgba(79,70,229,.07);border:1px solid rgba(79,70,229,.25);border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;color:var(--ind)"><span>✅</span><span>'+(F1||'XER 1')+' ⇄ '+(F2||'XER 2')+' ready — click <strong>Run Forensic Comparison</strong>.</span></div>';
  }
}
function goCmp(){
  if(!M1||!M2){alert('Upload both XER files first.');return;}
  if(!RAW1||!RAW2){alert('XER data missing — reload both files.');return;}
  // Charge 1 credit for forensic comparison (one credit, both XERs)
  if(!useCredit('Forensic: '+(F1||'XER1')+' vs '+(F2||'XER2')))return;
  var lbl=document.getElementById('cmpFileLabel');
  if(lbl)lbl.textContent=(F1||'XER 1')+' vs '+(F2||'XER 2');
  showPage('pgCmpCfg');setStep(1);
  var prev=document.getElementById('cmpPrev');
  if(prev)prev.innerHTML='<div style="padding:32px;text-align:center"><div style="font-size:40px;margin-bottom:10px">⏳</div><div style="color:var(--tx3);font-size:13px">Comparing '+M1.counts.total+' vs '+M2.counts.total+' activities…</div></div>';
  setTimeout(function(){
    try{
      renderCmpDashboard();
      var tabs=document.querySelectorAll('#pgCmpCfg .atab');
      showCmpTab('summary',tabs&&tabs[0]?tabs[0]:null);
    }catch(err){
      console.error('[goCmp]',err);
      var ep=document.getElementById('cmpPrev');
      if(ep)ep.innerHTML='<div style="padding:16px;border:1px solid rgba(239,68,68,.3);border-radius:10px;background:rgba(239,68,68,.06)"><strong style="color:var(--rd)">⚠ Analysis error:</strong> <code style="font-size:11px">'+err.message+'</code></div>';
    }
  },40);
}
function showPage(id){
  // Auth pages always allowed; if not logged in, redirect to login
  var pub=['pgLogin','pgRegister','pgSubscribe'];
  if(pub.indexOf(id)<0&&!CURR_USER&&id!=='pgAdmin')id='pgLogin';
  ['pgLogin','pgRegister','pgSubscribe','pgUpload','pgAnalysis','pgCmpCfg','pgReport','pgAdmin'].forEach(function(p){
    var el=document.getElementById(p);if(el)el.classList.toggle('hidden',p!==id);
  });
  document.body.setAttribute('data-page',id);
  // Compare nav state
  var nu=document.getElementById('cmpNavUpload'),nd=document.getElementById('cmpNavDash');
  if(nu&&nd){nu.classList.toggle('on',id==='pgUpload');nd.classList.toggle('on',id==='pgCmpCfg');}
  // viewDashBtn (visible on pgUpload when XER is loaded)
  var vdb=document.getElementById('viewDashBtn');
  if(vdb){
    var show=(id==='pgUpload')&&!!(M||(M1&&M2));
    vdb.style.display=show?'block':'none';
    if(show&&M){
      var _t=document.getElementById('dashBtnTitle'),_s=document.getElementById('dashBtnSub');
      if(_t)_t.textContent=(M.project.name||'XER')+' — Analysis Ready';
      if(_s)_s.textContent=M.counts.total+' activities · DD: '+(M.project.dd||'–');
    }
  }

  if(id==='pgSubscribe')try{renderPlanGrid();}catch(e){}
  if(id==='pgAdmin')try{renderAdmin();}catch(e){}
}
function goStep(n){STEP=n;renderStepbar();if(n===0)showPage('pgUpload');else if(n===1){if(MODE==='compare')showPage('pgCmpCfg');else showPage('pgAnalysis');}else showPage('pgReport');}
function setStep(n){STEP=n;renderStepbar();}
function switchMode(m){setMode(m);}
function setMode(m){
  MODE=m;
  var s=document.getElementById('uploadSingle'),c=document.getElementById('uploadCompare');
  if(s)s.classList.toggle('hidden',m!=='single');
  if(c)c.classList.toggle('hidden',m!=='compare');
  var ms=document.getElementById('mSingle'),mc=document.getElementById('mCompare');
  if(ms)ms.classList.toggle('on',m==='single');
  if(mc)mc.classList.toggle('on',m==='compare');
  STEP=0;renderStepbar();
  // Don't auto-redirect - let the user navigate explicitly
}
function showTab(tab,btn){['exec','overview','compliance','logic','path','evm','milestones','export'].forEach(function(t){var el=document.getElementById('tab-'+t);if(el)el.classList.toggle('hidden',t!==tab);});document.querySelectorAll('.atab').forEach(function(b){b.classList.remove('on');});btn.classList.add('on');if(tab==='evm'&&EVM)renderEVMTab();if(tab==='milestones'&&M)renderMilestones();// Auto-tick the active tab's checkbox
  var cks=document.querySelectorAll('.pdf-ck');cks.forEach(function(ck){if(ck.value===tab)ck.checked=true;});}
function toggleP(bid,aid){var el=document.getElementById(bid),ar=document.getElementById(aid);if(!el)return;var h=el.style.display==='none';el.style.display=h?'':'none';if(ar)ar.className='parr'+(h?' open':'');}
function renderStepbar(){
  var sb=document.getElementById('stepbar');var steps=['Upload','Dashboard'];if(!sb)return;sb.innerHTML='';
  steps.forEach(function(s,i){
    if(i>0){var c=document.createElement('div');c.className='sconn';sb.appendChild(c);}
    var div=document.createElement('div');var cls='step';
    if(i===STEP)cls+=' active';else if(i<STEP)cls+=' done';
    if(i<STEP||(i===1&&(M||(M1&&M2))))cls+=' click';
    div.className=cls;div.innerHTML='<span class="snum">'+(i<STEP?'\u2713':(i+1))+'</span><span class="slbl">'+s+'</span>';
    var idx=i;if(idx<STEP||(idx===1&&(M||(M1&&M2)))){div.onclick=function(){if(idx===0)goStep(0);else if(idx===1)goStep(1);};}
    sb.appendChild(div);
  });
}
function cfgTab(id,btn){['cg1','cg2','cg3'].forEach(function(t){var el=document.getElementById(t);if(el)el.style.display=t===id?'block':'none';});document.querySelectorAll('.cfg-tab').forEach(function(b){b.classList.remove('on');});btn.classList.add('on');}
function showErr(id,msg){var el=document.getElementById(id);if(el){el.textContent=msg;el.classList.remove('hidden');}}
function hideErr(id){var el=document.getElementById(id);if(el)el.classList.add('hidden');}
function setChips(m2){var ch=document.getElementById('navChips');if(!ch)return;if(m2==='cmp'){ch.innerHTML='<span class="chip c-a">\u21C4 Forensic</span><span class="chip c-c">'+F1+'</span><span class="chip c-i">'+F2+'</span>';return;}if(!M)return;ch.innerHTML='<span class="chip c-i">'+(M.project.name||'XER')+'</span><span class="chip c-c">DD: '+M.project.dd+'</span><span class="chip c-e">\u25B8 '+M.project.pe+'</span>';}
var CURR_SYM='$';var CURR_CODE='USD';
function fmtM(v){if(v===null||v===undefined||isNaN(v))return '\u2014';var sg=v<0?'-':'';var a=Math.abs(v);if(a>=1e6)return sg+CURR_SYM+(a/1e6).toFixed(2)+'M';if(a>=1e3)return sg+CURR_SYM+(a/1e3).toFixed(1)+'K';return sg+CURR_SYM+Math.round(a).toString();}
function fmtQ(v){if(!v||isNaN(v))return '0';var a=Math.abs(v);if(a>=1e6)return (v/1e6).toFixed(2)+'M';if(a>=1e3)return (v/1e3).toFixed(0)+'K';return Math.round(v).toString();}
function fmtDate(d){
  if(!d||d==='—'||d==='0000-00-00')return '—';
  try{
    var s=String(d).trim().slice(0,10);
    if(s.length<10||s==='undefined'||s==='null')return '—';
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var y=parseInt(s.slice(0,4)),mo=parseInt(s.slice(5,7))-1,dd2=parseInt(s.slice(8,10));
    if(isNaN(y)||isNaN(mo)||isNaN(dd2)||mo<0||mo>11)return '—';
    return (dd2<10?'0':'')+dd2+'-'+months[mo]+'-'+y;
  }catch(ee){return '—';}
}
function kpi(v,l,c,s){return '<div class="kpi '+c+'"><div class="kpi-l">'+l+'</div><div class="kpi-v">'+v+'</div>'+(s?'<div class="kpi-s">'+s+'</div>':'')+'</div>';}
function badge(st){if(st==='PASS')return '<span class="badge b-pass">PASS</span>';if(st==='WARN')return '<span class="badge b-warn">WARN</span>';if(st==='FAIL')return '<span class="badge b-fail">FAIL</span>';if(st==='INFO')return '<span class="badge b-info">INFO</span>';return '<span class="badge b-na">N/A</span>';}
function sBadge(st,late){if(st==='TK_Complete')return '<span class="badge b-pass">Done</span>';if(late)return '<span class="badge b-fail">Late</span>';if(st==='TK_Active')return '<span class="badge b-warn">Active</span>';return '<span class="badge b-info">Pending</span>';}

// ── RENDER ALL ────────────────────────────────────────────────────────
function renderExecSummary(){
  var el=document.getElementById('execSummaryContent');
  if(!el)return;
  if(!M){el.innerHTML='<div class="loading" style="padding:16px"><span style="color:var(--tx3)">Load a XER file to view the executive summary</span></div>';return;}
  var m=M,evm=EVM,bm=BM,bevm=BEVM;
  // ── Header ──
  var cPE=m.project.pe||'—',bPE=bevm?bevm.project.pe:'—';
  var cPS=m.project.ps||m.project.dd||'—',bPS=bevm?bevm.project.ps:'—';
  var slipDays='—';
  if(bevm&&cPE&&bPE){try{var d=Math.round((new Date(cPE)-new Date(bPE))/86400000);slipDays=(d>0?'+':'')+d+'d';}catch(ee){}}
  var costGrowth='—';
  if(bevm&&evm){var cg=Math.round((evm.BAC-bevm.BAC)/1e3);costGrowth=(cg>=0?'+':'')+fmtM(cg*1e3);}
  
  // ── KPI grid function ──
  function row2(l,cur,bas,unit,higher_is_better){
    var bas2=bas||'—';var variance='—';var vColor='var(--tx3)';
    if(bas&&cur&&bas!=='—'&&cur!=='—'){
      try{
        var cv=parseFloat(cur.replace(/[^0-9.-]/g,'')||'0'),bv=parseFloat(bas.replace(/[^0-9.-]/g,'')||'0');
        var diff=cv-bv;
        if(!isNaN(diff)&&diff!==0){
          var pct=bv!==0?Math.round(diff/Math.abs(bv)*1000)/10:null;
          variance=(diff>0?'+':'')+fmtM(diff*( unit==='%'||unit===''?1:1))+(unit?unit:'')+(pct!==null?' ('+( pct>0?'+':'')+pct+'%)':'');
          vColor=(higher_is_better?(diff>0?'var(--em)':'var(--rd)'):(diff<0?'var(--em)':'var(--rd)'));
        }
      }catch(ee){}
    }
    return '<tr class="exec-row"><td class="exec-lbl">'+l+'</td>'+'<td class="exec-val">'+cur+'</td>'+(bevm?'<td class="exec-bas">'+bas2+'</td>'+'<td class="exec-var" style="color:'+vColor+'">'+variance+'</td>':'')+'</tr>';}
  function tblHdr(){return '<table class="tbl"><thead><tr><th>Metric</th><th>Current</th>'+(bevm?'<th>Baseline</th><th>Variance</th>':'')+'</tr></thead><tbody>';}
  var hdrHtml='<div class="g4" style="margin-bottom:12px">'+
    kpi(m.project.name||'XER','Project','ind','')+
    kpi(fmtDate(m.project.dd),'Data Date','cy','')+
    kpi(fmtDate(cPE),'Planned Finish','am',bevm?'vs baseline: '+fmtDate(bPE):'')+
    (slipDays!=='—'?kpi(slipDays,'Schedule Slip',slipDays.startsWith('-')?'em':'rd','vs baseline finish'):'');
  if(evm)hdrHtml+='</div><div class="g4" style="margin-bottom:12px">'+kpi(evm.CPI.toFixed(3),'CPI',evm.CPI>=1?'em':'rd','Cost Perf. Index')+kpi(getSPI().toFixed(3),'SPI',evm.SPI>=0.9?'em':'rd','Sched. Perf. Index')+kpi(fmtM(evm.EAC),'EAC',evm.EAC<=evm.BAC?'em':'rd','Est. at Completion')+kpi(evm.pctDone+'%','% Complete',evm.pctDone>40?'em':'am','EV / BAC');
  hdrHtml+='</div>';
  var schedHtml=tblHdr()+
    row2('Project Name',m.project.name,bevm?bevm.project.name:'—','',true)+
    row2('Data Date',fmtDate(m.project.dd),'—','',false)+
    row2('Planned Start',fmtDate(cPS),fmtDate(bPS),'',false)+
    row2('Planned Finish',fmtDate(cPE),fmtDate(bPE),'',false)+
    row2('Total Activities',String(m.counts.total),bevm?String(bm.counts.total):'—','',true)+
    row2('Complete',String(m.counts.comp)+' ('+Math.round(m.counts.comp/m.counts.total*100)+'%)','—','',true)+
    row2('Critical Open',String(m.cp.open),bevm?String(bm.cp.open):'—','',false)+
    row2('Near-Critical',String(m.nc.cnt),bevm?String(bm.nc.cnt):'—','',false)+
    row2('OOS Activities',String(m.q.oosOpen),bevm?String(bm.q.oosOpen):'—','',false)+
    row2('Negative Float',String(m.q.negF),bevm?String(bm.q.negF):'—','',false)+
    '</tbody></table>';
  var qualHtml=tblHdr()+
    row2('Maturity Score',String(m.mat.total)+'/100',bevm?String(bm.mat.total)+'/100':'—','',true)+
    row2('DCMA Passes',String(m.dcma.filter(function(c){return c.pass;}).length)+'/14',bevm?String(bm.dcma.filter(function(c){return c.pass;}).length)+'/14':'—','',true)+
    row2('Logic Density',String(m.rels.density)+' rels/act',bevm?String(bm.rels.density)+' rels/act':'—','',true)+
    row2('SF Relationships',String(m.rels.PR_SF),bevm?String(bm.rels.PR_SF):'—','',false)+
    row2('Unresourced (%)',m.dcma[7].pct+'%',bevm?bm.dcma[7].pct+'%':'—','',false)+
    '</tbody></table>';
  var evmHtml='';
  if(evm){evmHtml=tblHdr()+
    row2('BAC',fmtM(evm.BAC),bevm?fmtM(bevm.BAC):'—','',false)+
    row2('Earned Value (EV)',fmtM(evm.EV),'—','',true)+
    row2('Actual Cost (AC)',fmtM(evm.AC),'—','',false)+
    row2('Cost Variance (CV)',fmtM(evm.CV),'—','',true)+
    row2('Schedule Variance (SV)',fmtM(evm.SV),'—','',true)+
    row2('EAC',fmtM(evm.EAC),bevm?fmtM(bevm.BAC):'—','',false)+
    row2('TCPI',evm.TCPI.toFixed(3),'—','',false)+
    row2('Earned Schedule',fmtDate(evm.earnedScheduleDate||'—'),'—','',false)+
    '</tbody></table>';}
  var msHtml='';
  if(m.keyMilestones.length>0&&bevm&&bm&&bm.keyMilestones){
    var bmsMap={};bm.keyMilestones.forEach(function(k){bmsMap[k.id]=k;});
    var rows2=m.keyMilestones.slice(0,20).map(function(k){
      var bk=bmsMap[k.id];var bEF=bk?fmtDate(bk.ef):'—';
      var slip='—';var sc2='var(--tx3)';
      if(bk&&k.ef&&bk.ef){try{var dd=Math.round((new Date(k.ef)-new Date(bk.ef))/86400000);slip=(dd>0?'+':'')+dd+'d';sc2=dd>0?'var(--rd)':'var(--em)';}catch(ee){}}
      var stBdg=k.st==='TK_Complete'?'<span class="badge b-pass">Done</span>':k.st==='TK_Active'?'<span class="badge b-warn">Active</span>':'<span class="badge b-info">Pending</span>';
      return '<tr><td>'+stBdg+'</td><td class="mono">'+k.id+'</td><td class="nm">'+k.name+'</td><td class="mono">'+fmtDate(k.ef)+'</td><td class="mono">'+bEF+'</td><td style="font-family:monospace;font-size:11px;color:'+sc2+';font-weight:600">'+slip+'</td></tr>';
    }).join('');
    if(rows2)msHtml='<div class="tbl-wrap" style="max-height:220px;overflow-y:auto"><table class="tbl"><thead><tr><th>Status</th><th>ID</th><th>Milestone</th><th>Current EF</th><th>Baseline EF</th><th>Slip</th></tr></thead><tbody>'+rows2+'</tbody></table></div>';
  }
  el.innerHTML=hdrHtml+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div>'+
        '<div class="section-hd"><div class="hd-dot" style="background:var(--ind)"></div>Schedule Summary</div>'+schedHtml+
        (bevm&&msHtml?'<div class="section-hd" style="margin-top:12px"><div class="hd-dot" style="background:var(--am)"></div>Milestone Variance vs Baseline</div>'+msHtml:'')
      +'</div>'+
      '<div>'+
        '<div class="section-hd"><div class="hd-dot" style="background:var(--cy)"></div>Schedule Quality</div>'+qualHtml+
        (evm?'<div class="section-hd" style="margin-top:12px"><div class="hd-dot" style="background:var(--em)"></div>Earned Value</div>'+evmHtml:'')
      +'</div>'+
    '</div>';
}
function updateExportInfo(){
  var ei=document.getElementById('exportProjInfo');
  if(ei&&M){ei.style.display='block';var cfg=getCfg();var setE=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};setE('ei-proj',cfg.prj||M.project.name||'—');setE('ei-pmc',cfg.pmc||'PMC');setE('ei-ctr',cfg.ctr||'Contractor');setE('ei-dd',fmtDate(M.project.dd));setE('ei-pe',fmtDate(M.project.pe));setE('ei-curr',CURR_CODE+' ('+CURR_SYM+')');}
}
function renderAll(){
  if(!M)return;
  renderExecSummary();renderOverview();renderCompliance();renderLogic();renderCP();renderMilestones();renderSecs();renderToneEl();renderSchedOpts();updateExportInfo();
  // Analysis banner update
  var axn=document.getElementById('analysisXerName');if(axn&&M)axn.textContent=M.project.name||'XER File';
  var axi=document.getElementById('analysisXerInfo');if(axi&&M)axi.textContent=M.counts.total+' activities | DD: '+(M.project.dd||'-');
  setTimeout(initTableFilters,150);
  var hft=document.getElementById('hfThresh');if(hft)hft.textContent=(document.getElementById('cfgHf')||{value:'45'}).value;
  var tabIds=['exec','overview','compliance','logic','path','evm','milestones','export'];
  tabIds.forEach(function(t){var el=document.getElementById('tab-'+t);if(el)el.classList.toggle('hidden',t!=='exec');});
  document.querySelectorAll('.atab').forEach(function(b,i){b.classList.toggle('on',i===0);});
}
function renderOverview(){
  var m=M;
  document.getElementById('projTitle').textContent='Schedule Overview \u2014 '+(m.project.name||'Project');
  document.getElementById('kR1').innerHTML=kpi(m.counts.total.toLocaleString(),'Total Activities','ind','')+kpi(m.counts.comp.toLocaleString(),'Complete','em',Math.round(m.counts.comp/m.counts.total*100)+'%')+kpi(m.prg.w.toFixed(1)+'%','Progress (Weighted)','cy','KPI')+kpi(m.prg.s.toFixed(1)+'%','Progress (Simple)','am','');
  document.getElementById('kR2').innerHTML=kpi(m.cp.open,'Critical Open','rd','of '+m.cp.tot)+kpi(m.nc.cnt,'Near-Critical','am','TF\u2264'+m.nc.days+'d')+kpi(m.q.oosOpen,'OOS Open','or',m.q.oosTot+' total')+kpi(m.q.negF,'Neg Float',m.q.negF===0?'em':'rd','DCMA #12');
  var pct=m.prg.w;document.getElementById('progRow').innerHTML='<div style="margin-top:2px"><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx2);margin-bottom:3px"><span>Progress</span><span>'+pct.toFixed(1)+'%</span></div><div style="height:7px;background:var(--s1);border-radius:4px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,var(--ind),var(--cy));border-radius:4px;transition:width .8s"></div></div></div>';
  var mt=m.mat,score=mt.total;
  var grade=score>=80?{g:'A',c:'var(--em)',l:'Credible'}:score>=65?{g:'B',c:'var(--am)',l:'Acceptable'}:score>=50?{g:'C',c:'var(--or)',l:'Marginal'}:{g:'D',c:'var(--rd)',l:'Poor'};
  var bd=[['Logic completeness',mt.logic,20,'var(--ind2)'],['Resource loading',mt.resources,15,'var(--cy)'],['Float health',mt.float,15,'var(--am)'],['Relationships',mt.relationships,15,'var(--or)'],['Constraint hygiene',mt.constraints,10,'var(--em)'],['Duration reasonableness',mt.durations,10,'var(--pk)'],['OOS activities',mt.oos,10,'var(--rd)'],['Baseline present',mt.baseline,5,'var(--pu)']];
  document.getElementById('matContent').innerHTML='<div class="score-wrap"><div class="score-ring" style="border-color:'+grade.c+'"><span class="sv" style="color:'+grade.c+'">'+score+'</span><span class="sl">/100</span></div><div class="score-detail"><div class="st" style="color:'+grade.c+'">Grade '+grade.g+' \u2014 '+grade.l+'</div><div class="ss">'+score+'/100 across 8 quality dimensions</div></div></div>'+bd.map(function(b){return '<div class="bar-row"><span class="bar-lbl">'+b[0].slice(0,16)+'</span><div class="bar-t"><div class="bar-f" style="width:'+Math.round(b[1]/b[2]*100)+'%;background:'+b[3]+'"></div></div><span class="bar-v">'+b[1]+'/'+b[2]+'</span></div>';}).join('');
  var max=Math.max(m.fd.neg,m.fd.zero,m.fd.nc,m.fd.f6,m.fd.f16,m.fd.hi)||1;
  var bands=[['Negative','var(--rd)',m.fd.neg],['Zero (CP)','var(--rd)',m.fd.zero],['1\u2013'+m.nc.days+'d Near-Crit','var(--am)',m.fd.nc],['6\u201315 days','var(--cy)',m.fd.f6],['16\u201330 days','var(--ind2)',m.fd.f16],['>30 days','var(--em)',m.fd.hi]];
  document.getElementById('floatBars').innerHTML=bands.map(function(b){return '<div class="bar-row"><span class="bar-lbl">'+b[0]+'</span><div class="bar-t"><div class="bar-f" style="width:'+Math.round(b[2]/m.open*100)+'%;background:'+b[1]+'"></div></div><span class="bar-v">'+b[2]+'</span></div>';}).join('');
  var bH='';m.cp.wbs.forEach(function(w){bH+='<div class="bar-row"><span class="bar-lbl">'+w.n.slice(0,14)+'</span><div class="bar-t"><div class="bar-f" style="width:'+Math.round(w.v/m.cp.open*100)+'%;background:var(--rd)"></div></div><span class="bar-v">'+w.v+'</span></div>';});
  document.getElementById('wbsBars').innerHTML=bH||'<div style="font-size:11px;color:var(--tx3);padding:5px 0">No WBS data</div>';
}
function renderCompliance(){
  var m=M;var bm2=BM;
  function dcmaRow(c,bc){var st=c.pass?'PASS':c.warn?'WARN':'FAIL';var dispV=c.pct!==null?c.val+' ('+c.pct+'%)':String(c.val);var varHtml='';if(bc){var bSt=bc.pass?'PASS':bc.warn?'WARN':'FAIL';var bDisp=bc.pct!==null?bc.val+' ('+bc.pct+'%)':String(bc.val);var improved=(c.pass&&!bc.pass)||(c.warn&&!bc.pass&&!bc.warn);var worsened=(!c.pass&&bc.pass)||(!c.warn&&!c.pass&&bc.warn);var vCol=improved?'var(--em)':worsened?'var(--rd)':'var(--tx3)';varHtml='<span style="font-family:monospace;font-size:10px;color:var(--tx3);margin-left:4px">B:'+bDisp+'</span>'+badge(bSt)+'<span style="font-size:9px;color:'+vCol+';margin-left:4px">'+(improved?'\u2191Improved':worsened?'\u2193Worsened':'=')+'</span>';}return '<div class="cmp-row">'+badge(st)+'<span class="cmp-nm">'+c.id+'. '+c.nm+'</span><span class="cmp-val">'+dispV+'</span>'+varHtml+'<span style="font-size:9px;color:var(--tx3);min-width:40px;text-align:right">Thr:'+c.thresh+'</span></div>';}
  function gaoRow(c,bc){var st=c.pass?'PASS':c.warn?'WARN':'FAIL';var varHtml='';if(bc){var bSt=bc.pass?'PASS':bc.warn?'WARN':'FAIL';var imp=(c.pass&&!bc.pass)||(c.warn&&!bc.pass&&!bc.warn);var wor=(!c.pass&&bc.pass);var vCol=imp?'var(--em)':wor?'var(--rd)':'var(--tx3)';varHtml='<span style="font-family:monospace;font-size:10px;color:var(--tx3);margin-left:4px">B:'+bc.val+'</span>'+badge(bSt)+'<span style="font-size:9px;color:'+vCol+';margin-left:3px">'+(imp?'\u2191':wor?'\u2193':'=')+'</span>';}return '<div class="cmp-row">'+badge(st)+'<span class="cmp-nm">'+c.id+'. '+c.nm+'</span><span class="cmp-val" style="min-width:80px;font-size:10px">'+c.val+'</span>'+varHtml+'<span style="font-size:9px;color:var(--tx3)">'+c.note+'</span></div>';}
  function nasaRow(c,bc){var st=c.pass?'PASS':c.warn?'WARN':'FAIL';var varHtml='';if(bc){var bSt=bc.pass?'PASS':bc.warn?'WARN':'FAIL';var imp=(c.pass&&!bc.pass);var wor=(!c.pass&&bc.pass);var vCol=imp?'var(--em)':wor?'var(--rd)':'var(--tx3)';varHtml='<span style="font-family:monospace;font-size:10px;color:var(--tx3);margin-left:4px">B:'+bc.val+'</span>'+badge(bSt)+'<span style="font-size:9px;color:'+vCol+';margin-left:3px">'+(imp?'\u2191':wor?'\u2193':'=')+'</span>';}return '<div class="cmp-row">'+badge(st)+'<span class="cmp-nm">'+c.nm+'</span><span class="cmp-val">'+c.val+'</span>'+varHtml+'<span style="font-size:9px;color:var(--tx3)">'+c.note+'</span></div>';}
  if(bm2){var bDcmaMap={};bm2.dcma.forEach(function(c){bDcmaMap[c.id]=c;});var bGaoMap={};bm2.gao.forEach(function(c){bGaoMap[c.id]=c;});document.getElementById('dcmaList').innerHTML=m.dcma.map(function(c){return dcmaRow(c,bDcmaMap[c.id]);}).join('');document.getElementById('gaoList').innerHTML=m.gao.map(function(c){return gaoRow(c,bGaoMap[c.id]);}).join('');document.getElementById('nasaList').innerHTML=m.nasa.map(function(c,i){return nasaRow(c,bm2.nasa[i]);}).join('');}
  else{document.getElementById('dcmaList').innerHTML=m.dcma.map(function(c){return dcmaRow(c,null);}).join('');document.getElementById('gaoList').innerHTML=m.gao.map(function(c){return gaoRow(c,null);}).join('');document.getElementById('nasaList').innerHTML=m.nasa.map(function(c){return nasaRow(c,null);}).join('');}
  var cd='';if(!Object.keys(m.q.constTypes).length)cd='<div style="font-size:11px;color:var(--em);padding:4px 0">\u2713 No constraints detected</div>';else cd=Object.keys(m.q.constTypes).map(function(k){return '<div class="logic-row"><span class="logic-nm">'+k+'</span><span style="font-family:monospace;font-size:11px;font-weight:600;color:var(--am)">'+m.q.constTypes[k]+'</span></div>';}).join('');
  document.getElementById('cstDetail').innerHTML=cd;
}
function renderLogic(){
  var m=M;var tot=m.rels.tot||1;
  document.getElementById('logicRels').innerHTML=[['FS (Finish-Start)',m.rels.PR_FS,Math.round(m.rels.PR_FS/tot*100)+'%','var(--em)'],['FF (Finish-Finish)',m.rels.PR_FF,Math.round(m.rels.PR_FF/tot*100)+'%','var(--cy)'],['SS (Start-Start)',m.rels.PR_SS,Math.round(m.rels.PR_SS/tot*100)+'%','var(--ind2)'],['SF (Start-Finish)',m.rels.PR_SF,Math.round(m.rels.PR_SF/tot*100)+'%',m.rels.PR_SF>0?'var(--rd)':'var(--em)'],['Total Relationships',m.rels.tot,m.rels.density+' rels/act','var(--tx2)'],['Negative Lags (Leads)',m.rels.negLagCnt,m.rels.negLagCnt===0?'OK':'DCMA FAIL',m.rels.negLagCnt===0?'var(--em)':'var(--rd)'],['Long Lags (>5d)',m.rels.longLagCnt,m.rels.longLagCnt===0?'OK':'Review',m.rels.longLagCnt===0?'var(--em)':'var(--am)']].map(function(r){return '<div class="logic-row"><span class="logic-nm">'+r[0]+'</span><span style="font-family:monospace;font-size:11px;font-weight:600;color:'+r[3]+'">'+r[1]+'</span><span style="font-size:10px;color:var(--tx3)">'+r[2]+'</span></div>';}).join('');
  document.getElementById('oosCnt').textContent=m.q.oosOpen;
  if(m.q.oosOpen===0)document.getElementById('oosList').innerHTML='<div style="font-size:11px;color:var(--em);padding:4px 0">\u2713 No open OOS activities detected</div>';
  else{var _oosEl=document.getElementById('oosList');if(_oosEl){var _oosTbl='<div style="font-size:11px;color:var(--tx2);margin-bottom:6px">'+m.q.oosTot+' total OOS, '+m.q.oosOpen+' open</div>';if(m.q.oosActs&&m.q.oosActs.length)_oosTbl+='<div class="tbl-wrap" style="max-height:180px;overflow-y:auto"><table class="tbl"><thead><tr><th>Activity ID</th><th>Name</th></tr></thead><tbody>'+m.q.oosActs.slice(0,50).map(function(a){return'<tr><td class="mono">'+a.id+'</td><td class="nm">'+a.name+'</td></tr>';}).join('')+'</tbody></table></div>';_oosEl.innerHTML=_oosTbl;}}
  document.getElementById('missCnt').textContent=m.q.noLogic.length;
  if(!m.q.noLogic.length)document.getElementById('missList').innerHTML='<div style="font-size:11px;color:var(--em);padding:4px 0">\u2713 All open regular activities have logic</div>';
  else document.getElementById('missList').innerHTML='<div class="tbl-wrap" style="max-height:200px;overflow-y:auto"><table class="tbl"><thead><tr><th>Activity ID</th><th>Name</th><th>Missing</th></tr></thead><tbody>'+m.q.noLogic.slice(0,50).map(function(r){return '<tr><td class="mono">'+r.t.task_code+'</td><td class="nm">'+((r.t.task_name||'').slice(0,55))+'</td><td style="color:var(--rd);font-weight:700;font-size:10px">'+(r.np&&r.ns?'Both':r.np?'Predecessor':'Successor')+'</td></tr>';}).join('')+'</tbody></table></div>';
  var lagItems=m.rels.negLags.concat(m.rels.longLags);var _ltm={};if(RAW&&RAW.TASK&&RAW.TASK.r)RAW.TASK.r.forEach(function(t){_ltm[t.task_id]=t.task_code||t.task_id;});
  document.getElementById('lagCnt').textContent=lagItems.length;
  if(!lagItems.length)document.getElementById('lagList').innerHTML='<div style="font-size:11px;color:var(--em);padding:4px 0">\u2713 No negative or long lags</div>';
  else document.getElementById('lagList').innerHTML='<div class="tbl-wrap" style="max-height:190px;overflow-y:auto"><table class="tbl"><thead><tr><th>Pred ID</th><th>Succ ID</th><th>Type</th><th>Lag(d)</th></tr></thead><tbody>'+lagItems.slice(0,40).map(function(r){var pC=_ltm[r.pred]||r.pred,sC=_ltm[r.succ]||r.succ;return'<tr><td class="mono">'+pC+'</td><td class="mono">'+sC+'</td><td>'+r.type+'</td><td class="num" style="color:'+(parseFloat(r.lag)<0?'var(--rd)':'var(--am)')+'">'+r.lag+'d</td></tr>';}).join('')+'</tbody></table></div>';
  var dH='';
  if(m.q.dangling===0&&m.q.hiFloat===0)dH='<div style="font-size:11px;color:var(--em);padding:4px 0">\u2713 No dangling activities. No suspiciously high float.</div>';
  else{if(m.q.dangling>0)dH+='<div style="font-size:11px;color:var(--am);margin-bottom:6px">'+m.q.dangling+' activities: no predecessors AND no successors</div>';if(m.q.hiFloat>0)dH+='<div style="font-size:11px;color:var(--pu);margin-bottom:6px">'+m.q.hiFloat+' activities with high float</div>';if(m.q.dangActs.length>0)dH+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Activity ID</th><th>Name</th></tr></thead><tbody>'+m.q.dangActs.map(function(a){return '<tr><td class="mono">'+a.id+'</td><td class="nm">'+a.name+'</td></tr>';}).join('')+'</tbody></table></div>';}
  document.getElementById('dangDetail').innerHTML=dH;
  // Redundant relationships
  var red=M.redundant||{parallel:[],transitive:[],parallelCnt:0,transitiveCnt:0};
  var parCntEl=document.getElementById('parCnt');if(parCntEl)parCntEl.textContent=red.parallelCnt?'('+red.parallelCnt+')':'';
  var trCntEl=document.getElementById('trCnt');if(trCntEl)trCntEl.textContent=red.transitiveCnt?'('+red.transitiveCnt+')':'';
  var parTbody=document.getElementById('parTbody');
  if(parTbody){if(!red.parallel.length)parTbody.innerHTML='<tr><td colspan="4" style="color:var(--em);font-size:11px">&#x2713; No parallel relationships detected</td></tr>';
    else parTbody.innerHTML=red.parallel.map(function(r){return'<tr><td><div class="mono" style="font-weight:600">'+r.pred+'</div><div style="font-size:9px;color:var(--tx3)">'+r.predName+'</div></td><td><div class="mono" style="font-weight:600">'+r.succ+'</div><div style="font-size:9px;color:var(--tx3)">'+r.succName+'</div></td><td>'+r.type+'</td><td class="num">'+r.lag+'</td></tr>';}).join('');}
  var trTbody=document.getElementById('trTbody');
  if(trTbody){if(!red.transitive.length)trTbody.innerHTML='<tr><td colspan="5" style="color:var(--em);font-size:11px">&#x2713; No transitive relationships detected</td></tr>';
    else trTbody.innerHTML=red.transitive.slice(0,200).map(function(r){return'<tr><td><div class="mono" style="font-weight:600">'+r.pred+'</div><div style="font-size:9px;color:var(--tx3)">'+r.predName+'</div></td><td style="color:var(--am);text-align:center;font-size:11px">&#8594;</td><td><div class="mono" style="font-weight:600;color:var(--am)">'+r.via+'</div><div style="font-size:9px;color:var(--tx3)">'+r.viaName+'</div></td><td style="color:var(--am);text-align:center;font-size:11px">&#8594;</td><td><div class="mono" style="font-weight:600">'+r.succ+'</div><div style="font-size:9px;color:var(--tx3)">'+r.succName+'</div></td><td>'+r.type+'</td><td class="num">'+r.lag+'</td></tr>';}).join('');}
}
function renderCP(){
  var m=M;
  document.getElementById('cpCnt').textContent=m.cp.open;
  document.getElementById('cpTbody').innerHTML=m.cp.chain.map(function(a,i){var tfC=a.tf===0?'tf0':a.tf<=3?'tf1':'tf2';var stL=a.st==='TK_Active'?'style="color:var(--am)"':a.st==='TK_Complete'?'style="color:var(--em)"':'';var icon=a.type==='TT_FinMile'?'\u25C8 ':'';return '<tr><td class="mono">'+(i+1)+'</td><td class="mono">'+a.id+'</td><td class="nm">'+icon+a.name+'</td><td class="mono" style="font-size:9px">'+a.type.replace('TT_','')+'</td><td '+stL+'>'+a.st.replace('TK_','')+'</td><td class="mono">'+fmtDate(a.es)+'</td><td class="mono">'+fmtDate(a.ef)+'</td><td class="num">'+a.rem+'d</td><td class="num '+tfC+'">'+a.tf+'d</td></tr>';}).join('');
  document.getElementById('ncCnt').textContent=m.nc.cnt;
  document.getElementById('ncTbody').innerHTML=m.nc.chain.map(function(a,i){return '<tr><td class="mono">'+(i+1)+'</td><td class="mono">'+a.id+'</td><td class="nm">'+a.name+'</td><td class="mono">'+fmtDate(a.ef)+'</td><td class="num tf1">'+a.tf+'d</td></tr>';}).join('');
  if(!m.q.hiFloat)document.getElementById('hfDetail').innerHTML='<div style="font-size:11px;color:var(--em);padding:4px 0">\u2713 No activities with suspiciously high float</div>';
  else document.getElementById('hfDetail').innerHTML='<div class="tbl-wrap" style="max-height:190px;overflow-y:auto"><table class="tbl"><thead><tr><th>Activity ID</th><th>Name</th><th>TF(d)</th></tr></thead><tbody>'+m.q.hiFloatActs.map(function(a){return '<tr><td class="mono">'+a.id+'</td><td class="nm">'+a.name+'</td><td class="num" style="color:var(--pu)">'+a.tf+'d</td></tr>';}).join('')+'</tbody></table></div>';
}
function renderMilestones(){
  var km=M.keyMilestones;
  var _ms=document.getElementById('msCnt');if(_ms)_ms.textContent=km.length;
  var blMap={};
  if(BM&&BM.keyMilestones){BM.keyMilestones.forEach(function(b){if(b.id&&b.ef)blMap[b.id]=b.ef;});}
  var done=0,act=0,ns=0,late=0;
  km.forEach(function(a){
    if(a.st==='TK_Complete')done++;else if(a.st==='TK_Active')act++;else ns++;
    if(a.st!=='TK_Complete'){var bEF=blMap[a.id];if(bEF&&a.ef){try{if(Math.round((new Date(a.ef)-new Date(bEF))/86400000)>0)late++;}catch(e){}}}
  });
  var _st=document.getElementById('msStats');
  if(_st)_st.innerHTML='<span class="badge b-pass">\u2713 '+done+'</span>'+(act?'<span class="badge b-warn">\u25B6 '+act+'</span>':'')+'<span class="badge b-info">\u25E6 '+ns+'</span>'+(late?'<span class="badge b-fail">\u26A0 '+late+' Late</span>':'');
  var _tb=document.getElementById('msTbody');if(!_tb)return;
  _tb.innerHTML=km.map(function(a){
    var bEF=blMap[a.id]||null;var bVar=null;
    if(bEF&&a.ef){try{bVar=Math.round((new Date(a.ef)-new Date(bEF))/86400000);}catch(e){}}
    var isLate=a.st!=='TK_Complete'&&bVar!==null&&bVar>0;
    var vC=bVar===null?'var(--tx3)':bVar>0?'var(--rd)':bVar<0?'var(--em)':'var(--tx3)';
    var vT=bVar===null?'\u2014':bVar===0?'0d':(bVar>0?'+':'')+bVar+'d';
    return'<tr>'
      +'<td>'+sBadge(a.st,isLate)+'</td>'
      +'<td class="mono">'+a.id+'</td>'
      +'<td class="nm">'+a.name+'</td>'
      +'<td class="mono" style="white-space:nowrap">'+fmtDate(a.ef)+'</td>'
      +'<td class="mono" style="white-space:nowrap;color:'+(bEF?'var(--tx2)':'var(--tx3)')+'">'+fmtDate(bEF||'')+'</td>'
      +'<td class="num" style="color:'+vC+';font-weight:'+(bVar!==null&&bVar!==0?'700':'400')+'">'+vT+'</td>'
      +'<td class="num" style="color:var(--ind2)">'+a.tf+'d</td>'
      +'</tr>';
  }).join('');
}
function _registerVlines(){
  if(_vlinesRegistered)return;_vlinesRegistered=true;
  Chart.register({id:'vlines',afterDraw:function(chart){
    var vls=chart.options.plugins&&chart.options.plugins.vlines;
    if(!vls||!vls.length)return;
    var ctx2=chart.ctx,xS=chart.scales.x,labels=chart.data.labels;
    vls.forEach(function(vl){
      if(!vl.date)return;
      var best=Infinity,idx2=-1;
      labels.forEach(function(l,i){try{var d=Math.abs(new Date(l+'-01')-new Date(vl.date+'-01'));if(d<best){best=d;idx2=i;}}catch(ee){} });
      if(idx2<0)return;
      var x=xS.getPixelForValue(idx2);
      ctx2.save();
      ctx2.beginPath();ctx2.moveTo(x,chart.chartArea.top);ctx2.lineTo(x,chart.chartArea.bottom);
      ctx2.lineWidth=1.5;ctx2.strokeStyle=vl.color||'#F59E0B';ctx2.setLineDash(vl.dash||[4,3]);ctx2.stroke();
      if(vl.label){
        ctx2.font='bold 9px "Segoe UI",system-ui,sans-serif';
        ctx2.setLineDash([]);
        var tw=ctx2.measureText(vl.label).width;
        var rw=tw+10,rh=15;
        // Position pill: right of line unless near right edge, then left
        var rx=(x+rw+4<chart.chartArea.right)?(x+2):(x-rw-2);
        var ry=chart.chartArea.top+2;
        ctx2.fillStyle=vl.color||'#F59E0B';
        ctx2.globalAlpha=0.92;
        ctx2.fillRect(rx,ry,rw,rh);
        ctx2.globalAlpha=1;
        ctx2.fillStyle='#FFFFFF';
        ctx2.textAlign='left';
        ctx2.fillText(vl.label,rx+5,ry+11);
      }
      ctx2.restore();
    });
  }});
}
function renderEVMTab(){
  if(!EVM)return;_registerVlines();if(SC){SC.destroy();SC=null;}
  var evm=EVM;
  var r1=[{l:'CPI',v:evm.CPI.toFixed(3),c:evm.CPI>=1?'em':'rd',s:'Cost PI'},{l:'SPI',v:getSPI().toFixed(3),c:evm.SPI>=0.9?'em':'rd',s:'Sched PI'},{l:'CV',v:fmtM(evm.CV),c:evm.CV>=0?'em':'rd',s:'Cost Var'},{l:'SV',v:fmtM(evm.SV),c:evm.SV>=0?'em':'am',s:'Sched Var'}];
  // EVM metrics (PMI Standard formulas) — full-width 13-column horizontal grid
  // Order: cost-perf | schedule-perf | variances | budget | forecast | progress
  var r2=[
    {l:'BAC',v:fmtM(evm.BAC),c:'ind',s:'Budget at Compl'},
    {l:'EAC',v:fmtM(evm.EAC),c:evm.EAC<=evm.BAC?'em':'rd',s:'Est at Compl'},
    {l:'ETC',v:fmtM(evm.ETC),c:'cy',s:'Est to Compl'},
    {l:'VAC',v:fmtM(evm.VAC),c:evm.VAC>=0?'em':'rd',s:'Var at Compl'},
    {l:'TCPI',v:(evm.TCPI>=900?'∞':evm.TCPI.toFixed(3)),c:evm.TCPI<=1?'em':evm.TCPI<=1.1?'am':'rd',s:'To-Compl PI'},
    {l:'EV',v:fmtM(evm.EV),c:'ind',s:'Earned Val'},
    {l:'AC',v:fmtM(evm.AC),c:'ind',s:'Actual Cost'},
    {l:'PV',v:fmtM(evm.PV),c:'ind',s:'Planned Val'},
    {l:'% Done',v:evm.pctDone+'%',c:evm.pctDone>40?'em':'am',s:'EV/BAC'}
  ];
  var allK=r1.concat(r2);  // 13 KPIs (4 r1 + 9 r2)
  var er1=document.getElementById('evmR1');
  if(er1){
    // Override .evm-row class with full-width 13-column grid
    er1.removeAttribute('class');
    er1.style.cssText='display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:7px;margin-bottom:14px;width:100%';
    er1.innerHTML=allK.map(function(d){return kpi(d.v,d.l,d.c,d.s);}).join('');
  }
  var er2=document.getElementById('evmR2');if(er2){er2.style.display='none';er2.innerHTML='';}
  // ── Add data-source quality indicator below the KPI grid ─────────
  var dq=document.getElementById('evmDataQuality');
  if(!dq&&er1&&er1.parentNode){
    dq=document.createElement('div');dq.id='evmDataQuality';
    dq.style.cssText='display:flex;align-items:center;gap:14px;padding:6px 10px;margin-bottom:10px;background:var(--s2);border:1px solid var(--b1);border-radius:6px;font-size:10px;color:var(--tx3);flex-wrap:wrap';
    er1.parentNode.insertBefore(dq,er1.nextSibling);
  }
  if(dq&&evm.evmDataSource){
    var ds=evm.evmDataSource;
    var allOK=ds.ev==='TASKFIN'&&ds.ac==='TASKFIN'&&ds.pv==='TASKFIN';
    var icon=allOK?'✓':'⚠';var col=allOK?'var(--em)':'var(--am)';
    dq.innerHTML='<span style="color:'+col+';font-weight:700;font-size:11px">'+icon+' EVM Data Source</span>'
      +'<span><strong>EV:</strong> '+ds.ev+'</span>'
      +'<span><strong>AC:</strong> '+ds.ac+'</span>'
      +'<span><strong>PV:</strong> '+ds.pv+'</span>'
      +'<span style="margin-left:auto;color:var(--tx3)">DD: '+(evm.dataDateMonth||'–')+(evm.earnedScheduleDate?' · ES: '+evm.earnedScheduleDate:'')+'</span>'
      +(allOK?'':'<span style="color:var(--am);font-size:10px">P6 period performance not stored — PV/AC computed from spread</span>');
  }
  var lSet={};
  var allCurvesForLabels=[evm.evMthCurve,evm.acMthCurve,evm.remEarlyCurve,evm.remLateCurve];
  if(BEVM){allCurvesForLabels.push(BEVM.pvEarlyCurve);allCurvesForLabels.push(BEVM.pvLateCurve);}
  else{allCurvesForLabels.push(evm.pvEarlyCurve);allCurvesForLabels.push(evm.pvLateCurve);}
  allCurvesForLabels.forEach(function(cv){(cv||[]).forEach(function(p){lSet[p.date]=1;});});
  var labels=Object.keys(lSet).sort();
  function toArr(cv){var m2={};(cv||[]).forEach(function(p){m2[p.date]=p.v!=null?p.v:(p.pv!=null?p.pv:null);});return labels.map(function(l){return m2[l]!=null?m2[l]:null;});}
  var pvEData=BEVM?toArr(BEVM.pvEarlyCurve):labels.map(function(){return null;});
  var pvLData=BEVM?toArr(BEVM.pvLateCurve):labels.map(function(){return null;});
  var DSconfig=[
    {label:'PV Early (Baseline)',  color:'#6366F1',dash:null,  fill:false,bga:null,                  data:pvEData,               pw:1.8,pr:0,hidden:!BEVM},
    {label:'PV Late (Baseline)',   color:'#A78BFA',dash:[4,3], fill:false,bga:null,                  data:pvLData,               pw:1.8,pr:0,hidden:!BEVM},
    {label:'EV',                   color:'#22C55E',dash:null,  fill:true, bga:'rgba(34,197,94,.06)', data:toArr(evm.evMthCurve), pw:2.5,pr:3,hidden:false},
    {label:'AC',                   color:'#EF4444',dash:null,  fill:false,bga:null,                  data:toArr(evm.acMthCurve), pw:2.0,pr:3,hidden:false},
    {label:'Rem Early (Forecast)', color:'#6366F1',dash:[5,4], fill:true, bga:'rgba(99,102,241,.05)',data:toArr(evm.remEarlyCurve),pw:1.8,pr:0,hidden:false},
    {label:'Rem Late (Forecast)',  color:'#A78BFA',dash:[3,2], fill:false,bga:null,                  data:toArr(evm.remLateCurve), pw:1.8,pr:0,hidden:false}
  ];
  var datasets=DSconfig.map(function(d){var ds={label:d.label,data:d.data,borderColor:d.color,backgroundColor:d.bga||'transparent',borderWidth:d.pw,pointRadius:d.pr,pointBackgroundColor:d.color,tension:.3,fill:d.fill,spanGaps:true,hidden:d.hidden||false};if(d.dash)ds.borderDash=d.dash;return ds;});
  var esDate=evm.earnedScheduleDate||'';var AT=evm.dataDateMonth||'';var svtMonths=0;
  if(esDate&&AT){try{var d1=new Date(esDate+'-01'),d2=new Date(AT+'-01');svtMonths=Math.round((d2-d1)/86400000/30.5);}catch(ee){}}
  var vlines2=[];
  if(AT)vlines2.push({date:AT,color:'#F59E0B',dash:[4,3],label:'DD'});
  if(esDate&&esDate!==AT)vlines2.push({date:esDate,color:'#C084FC',dash:[3,3],label:'ES'+(svtMonths!==0?' ('+(svtMonths>0?'+':'')+svtMonths+'mo)':'')});
  var ctx=document.getElementById('scChart');if(!ctx)return;
  SC=new Chart(ctx,{type:'line',data:{labels:labels,datasets:datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},animation:{duration:400},plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(10,16,32,.95)',titleColor:'#EEF2FF',bodyColor:'#94A3B8',borderColor:'rgba(99,102,241,.35)',borderWidth:1,padding:8,callbacks:{label:function(c){return ' '+c.dataset.label+': '+fmtM(c.raw);}}},vlines:vlines2},scales:{x:{grid:{color:'rgba(99,102,241,.08)'},ticks:{color:'#94A3B8',font:{size:9,family:'Segoe UI,system-ui,sans-serif'},maxTicksLimit:14}},y:{grid:{color:'rgba(99,102,241,.08)'},ticks:{color:'#94A3B8',font:{size:9,family:'Segoe UI,system-ui,sans-serif'},callback:function(v){return fmtM(v);}}}}}});
  var legEl=document.getElementById('scLeg');legEl.innerHTML='';
  var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:5px;flex-wrap:wrap;width:100%;align-items:center';
  DSconfig.forEach(function(d,i){
    var btn=document.createElement('button');
    btn.style.cssText='display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;transition:opacity .13s;border:1.5px solid '+d.color+';background:rgba(0,0,0,.2);color:'+d.color+';font-family:inherit;opacity:'+(d.hidden?'0.35':'1');
    var dsh=document.createElement('span');dsh.style.cssText='width:14px;height:2px;background:'+d.color+(d.dash?';opacity:.6':'');
    btn.appendChild(dsh);btn.appendChild(document.createTextNode(' '+d.label));
    btn.onclick=function(){var ds=SC.data.datasets[i];ds.hidden=!ds.hidden;btn.style.opacity=ds.hidden?'0.35':'1';SC.update('none');};
    btnRow.appendChild(btn);
  });
  // DD and ES as legend pills (right side of legend row)
  var sepSpan=document.createElement('span');sepSpan.style.cssText='margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap';
  if(AT){var ddBtn=document.createElement('span');ddBtn.className='vline-leg';ddBtn.style.color='#F59E0B';ddBtn.style.borderColor='#F59E0B';ddBtn.style.background='rgba(245,158,11,.08)';ddBtn.innerHTML='| DD: '+fmtDate(AT);sepSpan.appendChild(ddBtn);}
  if(esDate){var esBtn=document.createElement('span');esBtn.className='vline-leg';esBtn.style.color='#C084FC';esBtn.style.borderColor='#C084FC';esBtn.style.background='rgba(192,132,252,.08)';esBtn.innerHTML='| ES: '+fmtDate(esDate)+(svtMonths!==0?' <em style="font-style:normal;opacity:.8">'+(svtMonths>0?'+':'')+svtMonths+'mo</em>':'');esBtn.title='Earned Schedule — date on PV-Early curve equal to current EV';sepSpan.appendChild(esBtn);}
  var spiSpan=document.createElement('span');spiSpan.style.cssText='font-size:10px;color:var(--tx3);white-space:nowrap';spiSpan.textContent='SPI='+getSPI().toFixed(3);sepSpan.appendChild(spiSpan);
  btnRow.appendChild(sepSpan);legEl.appendChild(btnRow);
  var tC={labor:'var(--ind2)',material:'var(--cy)',equipment:'var(--am)'};var tL={labor:'Labour',material:'Material',equipment:'Equipment/Cost'};
  var rH='';['labor','material','equipment'].forEach(function(type){var list=evm.resources[type];if(!list||!list.length)return;var maxB=list.reduce(function(mx,r){return Math.max(mx,r.bac);},0)||1;var totB=list.reduce(function(s,r){return s+r.bac;},0);var totQ=list.reduce(function(s,r){return s+r.bqty;},0);var isHr=list.some(function(r){return r.qtType==='QT_Hour'||r.type==='RT_Labor';});var qUnit=isHr?'h':'units';rH+='<div class="res-hdr"><div class="fd" style="background:'+tC[type]+'"></div>'+tL[type]+' ('+list.length+')'+(totB?'  BAC: '+fmtM(totB):'')+(totQ?' / '+fmtQ(totQ)+qUnit:'')+'</div>';rH+='<div style="display:grid;grid-template-columns:130px 1fr 90px 90px;gap:0;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--tx3);padding:2px 0 3px;border-bottom:1px solid var(--b1);margin-bottom:3px"><span>Resource</span><span></span><span style="text-align:right">Budg Units</span><span style="text-align:right">Budg Cost</span></div>';list.forEach(function(r){var pct=maxB>0?Math.round(r.bac/maxB*100):0;rH+='<div style="display:grid;grid-template-columns:130px 1fr 90px 90px;gap:0;align-items:center;margin:2px 0"><span class="res-nm" title="'+r.name+'">'+(r.short?r.short+' ':'')+r.name.slice(0,22)+'</span><div class="res-t"><div class="res-f" style="width:'+pct+'%;background:'+tC[type]+'"></div></div><span style="font-size:10px;font-family:monospace;color:var(--pu);text-align:right;padding-right:4px">'+(r.bqty>0?fmtQ(r.bqty)+qUnit:'\u2014')+'</span><span class="res-v">'+(r.bac>0?fmtM(r.bac):'$0')+(r.ac>0?' /'+fmtM(r.ac):'')+'</span></div>';});});
  // Resource Cost Register card removed; cost data shown in Units Register table
  var picker=document.getElementById('rsrcPicker');
  if(picker&&evm.allResources&&picker.options){while(picker.options.length>1)picker.remove(1);var typeOrder2=['RT_Equip','RT_Labor','RT_Mat'];var typeLabel2={'RT_Equip':'Equipment/Cost','RT_Labor':'Labour','RT_Mat':'Material'};typeOrder2.forEach(function(type){var list2=evm.allResources.filter(function(r){return r.type===type;});if(!list2.length)return;var og=document.createElement('optgroup');og.label=typeLabel2[type]||type;list2.forEach(function(r){var opt=document.createElement('option');opt.value=r.id;opt.textContent=(r.short?r.short+' \u2014 ':'')+r.name+(r.bqty?' ('+fmtQ(r.bqty)+')':'');og.appendChild(opt);});picker.appendChild(og);});}
  var tbody=document.getElementById('rsrcUnitTbody');
  if(tbody&&evm.allResources){var typeColors2={'RT_Equip':'var(--am)','RT_Labor':'var(--ind2)','RT_Mat':'var(--cy)'};var typeShort2={'RT_Equip':'Equip','RT_Labor':'Labour','RT_Mat':'Material'};tbody.innerHTML='';evm.allResources.forEach(function(r){var pct2=r.bqty>0?Math.round(r.aqty/r.bqty*100):0;var ut=r.qtType==='QT_Hour'?'Hours':r.qtType||'Units';var tC2=typeColors2[r.type]||'var(--tx3)';var tr2=document.createElement('tr');tr2.style.cursor='pointer';tr2.title='Click to view S-curve';tr2.setAttribute('data-rid',r.id);tr2.onclick=function(){pickResource(this);};var pctColor=pct2>=90?'var(--em)':pct2>=60?'var(--am)':'var(--tx2)';var dot='<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:'+tC2+'"></span> ';var nm=(r.short?'<span style="font-family:monospace;font-size:10px;color:var(--tx3)">'+r.short+'</span> ':'')+r.name;// Baseline Planned % at data date (replaces Budgeted Cost column)
    var _blPctVal='\u2014';var _blPctStyle='color:var(--tx3)';
    if(BEVM&&BEVM.rsrcBlCurves&&BEVM.rsrcBlCurves[r.id]&&evm.dataDateMonth){
      var _bc=BEVM.rsrcBlCurves[r.id];
      var _bE=(_bc.early||[]).filter(function(p){return p.date<=evm.dataDateMonth;});
      if(_bE.length>0&&_bc.bqty>0){
        var _bPct=Math.round(_bE[_bE.length-1].v/_bc.bqty*100);
        _blPctVal=_bPct+'%';
        _blPctStyle='color:'+(_bPct>pct2?'var(--rd)':_bPct<pct2?'var(--em)':'var(--tx3)')+';font-weight:600';
      }
    }
    var blPctTd='<td class="num" style="'+_blPctStyle+'">'+_blPctVal+'</td>';
    tr2.innerHTML='<td>'+dot+nm+'</td><td style="font-size:10px;color:var(--tx3)">'+typeShort2[r.type]+'</td><td style="font-size:10px;color:var(--tx3)">'+ut+'</td><td class="num" style="color:var(--am);font-weight:600">'+fmtM(r.bac||0)+'</td><td class="num" style="color:var(--pu)">'+fmtQ(r.bqty)+'</td><td class="num" style="color:var(--em)">'+fmtQ(r.aqty)+'</td><td class="num" style="color:var(--cy)">'+fmtQ(r.rqty)+'</td><td class="num" style="color:'+pctColor+'">'+pct2+'%</td>'+blPctTd;tbody.appendChild(tr2);});}
  if(evm.allResources&&evm.allResources.length>0){var first=evm.allResources[0];if(picker)picker.value=first.id;setTimeout(function(){renderResourceScurve(first.id);},80);}
}
var RSC=null;
function pickResource(row){var id=row.getAttribute('data-rid');if(!id)return;var pk=document.getElementById('rsrcPicker');if(pk)pk.value=id;renderResourceScurve(id);}
function renderResourceScurve(rsrcId){
  if(!EVM||!rsrcId)return;
  if(RSC){try{RSC.destroy();}catch(e){}RSC=null;}
  var wrap=document.getElementById('rsrcScurveWrap');if(!wrap)return;
  var curves=EVM.resourceCurves&&EVM.resourceCurves[rsrcId];
  var resInfo=EVM.allResources&&EVM.allResources.find(function(r){return r.id===rsrcId;});
  if(!curves||!resInfo){wrap.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:var(--tx3)">No data</div>';return;}
  wrap.innerHTML='<canvas id="rsrcScChart"></canvas>';
  var cvEl=document.getElementById('rsrcScChart');if(!cvEl)return;
  var isHr=resInfo.qtType==='QT_Hour'||resInfo.type==='RT_Labor';var ut=isHr?'h':'';var ddM=EVM.dataDateMonth||'';
  var blE=[],blL=[],hasBL=!!(BEVM&&BEVM.rsrcBlCurves&&BEVM.rsrcBlCurves[rsrcId]);
  if(hasBL){blE=BEVM.rsrcBlCurves[rsrcId].early||[];blL=BEVM.rsrcBlCurves[rsrcId].late||[];}
  var lSet={};
  function addD(arr){(arr||[]).forEach(function(p){if(p.date)lSet[p.date]=1;});}
  addD(curves.planned);addD(curves.actual);addD(curves.remaining);addD(curves.remainingLate);addD(blE);addD(blL);
  var labels=Object.keys(lSet).sort();
  function toMap(arr,vk){var m={};(arr||[]).forEach(function(p){m[p.date]=p[vk]!=null?p[vk]:p.v;});return m;}
  var planM=toMap(curves.planned,'qty'),actM=toMap(curves.actual,'qty');
  var remEM=toMap(curves.remaining,'qty'),remLM=toMap(curves.remainingLate,'qty');
  var blEM=toMap(blE,'v'),blLM=toMap(blL,'v');
  var planA=[],actA=[],remEA=[],remLA=[],blEA=[],blLA=[];
  labels.forEach(function(l){planA.push(planM[l]!=null?planM[l]:null);actA.push(actM[l]!=null?actM[l]:null);remEA.push(remEM[l]!=null?remEM[l]:null);remLA.push(remLM[l]!=null?remLM[l]:null);blEA.push(blEM[l]!=null?blEM[l]:null);blLA.push(blLM[l]!=null?blLM[l]:null);});
  var rVlines=ddM?[{date:ddM,color:'#F59E0B',dash:[4,3],label:'DD'}]:[];_registerVlines();
  var datasets=[
    {label:'Planned (Budget)',  data:planA,borderColor:'#818CF8',backgroundColor:'rgba(129,140,248,.07)',borderWidth:1.8,pointRadius:0,tension:.35,fill:true,spanGaps:true},
    {label:'Actual',            data:actA, borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,.08)', borderWidth:2.5,pointRadius:3,tension:.35,fill:false,spanGaps:true},
    {label:'Remaining (Early)', data:remEA,borderColor:'#06B6D4',backgroundColor:'rgba(6,182,212,.06)',borderWidth:1.8,borderDash:[5,4],pointRadius:0,tension:.35,fill:false,spanGaps:true},
    {label:'Remaining (Late)',  data:remLA,borderColor:'#F472B6',backgroundColor:'rgba(244,114,182,.04)',borderWidth:1.8,borderDash:[3,5],pointRadius:0,tension:.35,fill:false,spanGaps:true}
  ];
  if(hasBL){datasets.push({label:'BL Early',data:blEA,borderColor:'#A78BFA',borderWidth:1.5,borderDash:[4,3],pointRadius:0,tension:.35,fill:false,spanGaps:true,backgroundColor:'transparent'});datasets.push({label:'BL Late',data:blLA,borderColor:'#FB923C',borderWidth:1.5,borderDash:[2,4],pointRadius:0,tension:.35,fill:false,spanGaps:true,backgroundColor:'transparent'});}
  RSC=new Chart(cvEl,{type:'line',data:{labels:labels,datasets:datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},animation:{duration:300},plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(10,16,32,.95)',titleColor:'#EEF2FF',bodyColor:'#94A3B8',borderColor:'rgba(99,102,241,.35)',borderWidth:1,padding:8,callbacks:{label:function(c){if(c.raw==null)return null;return ' '+c.dataset.label+': '+fmtQ(c.raw)+ut;},title:function(items){return items[0].label+' (Cumulative)';}}},vlines:rVlines},scales:{x:{grid:{color:'rgba(99,102,241,.08)'},ticks:{color:'#94A3B8',font:{size:9,family:'Segoe UI,system-ui,sans-serif'},maxTicksLimit:14}},y:{grid:{color:'rgba(99,102,241,.08)'},ticks:{color:'#94A3B8',font:{size:9,family:'Segoe UI,system-ui,sans-serif'},callback:function(v){return fmtQ(v)+ut;}}}}}});
  var legEl=document.getElementById('rsrcScurveLeg');
  if(legEl){var lds=[{l:'Planned (Budget)',c:'#818CF8',s:true,i:0},{l:'Actual',c:'#22C55E',s:true,i:1},{l:'Remaining (Early)',c:'#06B6D4',s:false,i:2},{l:'Remaining (Late)',c:'#F472B6',s:false,i:3}];if(hasBL){lds.push({l:'BL Early',c:'#A78BFA',s:false,i:4});lds.push({l:'BL Late',c:'#FB923C',s:false,i:5});}
  legEl.innerHTML=lds.map(function(ld){var ls=ld.s?'background:'+ld.c:'background:repeating-linear-gradient(90deg,'+ld.c+' 0,'+ld.c+' 5px,transparent 5px,transparent 9px)';return '<button onclick="(function(b,i){var ds=RSC&&RSC.data.datasets[i];if(!ds)return;ds.hidden=!ds.hidden;RSC.update();b.style.opacity=ds.hidden?\'0.3\':\'1\';})(this,'+ld.i+')" style="display:inline-flex;align-items:center;gap:5px;background:none;border:1px solid rgba(99,102,241,.25);border-radius:4px;padding:2px 8px;cursor:pointer;color:var(--tx2);font-size:10px"><span style="display:inline-block;width:20px;height:2.5px;'+ls+'"></span>'+ld.l+'</button>';}).join('')+'<span style="margin-left:auto;font-size:10px;color:var(--tx3)">'+(resInfo.short?resInfo.short+' \u2014 ':'')+resInfo.name+'</span>';}
  var statsEl=document.getElementById('rsrcScurveStats');
  if(statsEl){var pctV=resInfo.bqty>0?Math.round(resInfo.aqty/resInfo.bqty*100):0;var blPH='';if(hasBL&&ddM){var _bc=BEVM.rsrcBlCurves[rsrcId];var _bPts=blE.filter(function(p){return p.date<=ddM;});if(_bPts.length>0&&_bc.bqty>0){var _bPct=Math.round(_bPts[_bPts.length-1].v/_bc.bqty*100);blPH=kpi(_bPct+'%','BL Plan% at DD','pu','Baseline planned % at data date');}}statsEl.innerHTML='<div style="display:flex;gap:7px;flex-wrap:wrap">'+kpi(fmtQ(resInfo.bqty)+(isHr?'h':''),'Budgeted','pu','')+kpi(fmtQ(resInfo.aqty)+(isHr?'h':''),'Actual','em','')+kpi(fmtQ(resInfo.rqty)+(isHr?'h':''),'Remaining','cy','')+kpi(pctV+'%','% Complete',pctV>=90?'em':pctV>=60?'am':'rd','')+blPH+'</div>';}
}

function renderCmpPrev(){
  var el=document.getElementById('cmpPrev');if(!el||!M1||!M2)return;
  var diff=forensic(RAW1,RAW2);
  el.innerHTML='<div class="card-hd"><div class="hd-dot"></div>Forensic Comparison Preview</div><div class="g4" style="margin-bottom:7px">'+kpi('+'+diff.addedCnt,'Added','am','')+kpi('-'+diff.removedCnt,'Removed','rd','')+kpi(diff.modifiedCnt,'Modified','ind','')+kpi('+'+diff.rA+'/-'+diff.rR,'Rel Changes','cy','')+'</div><div class="g4">'+kpi(M1.prg.w.toFixed(1)+'%','Progress XER1','em','weighted')+kpi(M2.prg.w.toFixed(1)+'%','Progress XER2','em','weighted')+kpi(diff.slippage.length,'Slippage >5d',diff.slippage.length>0?'rd':'em','')+kpi(diff.newCritical.length,'New Critical',diff.newCritical.length>0?'or':'em','')+'</div>';
}
function renderCTone(){var el=document.getElementById('cToneG');if(!el)return;el.innerHTML=[['formal','Formal'],['concise','Concise'],['detailed','Detailed']].map(function(t){return '<button class="tone-b'+(CTONE===t[0]?' on':'')+'" onclick="CTONE=\''+t[0]+'\';document.querySelectorAll(\'#cToneG .tone-b\').forEach(function(b){b.classList.remove(\'on\')});this.classList.add(\'on\')">'+t[1]+'</button>';}).join('');}
function renderSecs(){
  var el=document.getElementById('secsList');if(!el)return;
  var html='';
  SEC_LIST.forEach(function(sec,i){
    var isFirst=i===0,isLast=i===SEC_LIST.length-1;
    html+='<div class="sec-row" id="secrow-'+sec.k+'">'
      +'<div style="display:flex;flex-direction:column;gap:1px;margin-right:3px">'
      +'<button class="ord-btn" onclick="moveSec('+i+',-1)" '+(isFirst?'disabled style="opacity:.2"':'')+'>\u25B4</button>'
      +'<button class="ord-btn" onclick="moveSec('+i+',1)" '+(isLast?'disabled style="opacity:.2"':'')+'>\u25BE</button>'
      +'</div>'
      +'<button class="tog '+(sec.on?'on':'off')+'" onclick="toggleSec(\''+sec.k+'\')"></button>'
      +'<span class="sec-lbl'+(sec.on?'':' off')+'">'+sec.l+'</span>'
      +(sec.custom?'<button onclick="removeCustomSec(\''+sec.k+'\')" style="margin-left:auto;background:none;border:none;color:var(--tx3);cursor:pointer;font-size:12px;padding:0 4px" title="Remove">\u2715</button>':'')
      +'</div>';
    if(sec.custom){
      html+='<div class="cs-ctx-row" id="csctx-'+sec.k+'">'
        +'<textarea class="inp" rows="2" placeholder="Describe what this section should cover (the AI will use this)..." '
        +'oninput="updateCustomSecCtx(\''+sec.k+'\',this.value)" '
        +'style="font-size:10px;resize:vertical;min-height:38px">'+( sec.ctx||'')+'</textarea>'
        +'</div>';
    }
  });
  html+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--b1)">'
    +'<button class="btn btn-g" style="width:100%;font-size:11px" onclick="addCustomSec()">+ Add custom section</button>'
    +'</div>';
  el.innerHTML=html;
}
function moveSec(idx,dir){
  var newIdx=idx+dir;
  if(newIdx<0||newIdx>=SEC_LIST.length)return;
  var tmp=SEC_LIST[idx];SEC_LIST[idx]=SEC_LIST[newIdx];SEC_LIST[newIdx]=tmp;
  // Rebuild SECS shim
  var o={};SEC_LIST.forEach(function(s){o[s.k]=s;});
  Object.keys(o).forEach(function(k){SECS[k]=o[k];});
  renderSecs();
}
function toggleSec(k){
  var sec=SEC_LIST.find(function(s){return s.k===k;});if(!sec)return;
  sec.on=!sec.on;SECS[k]=sec;renderSecs();
}
function addCustomSec(){
  _csIdx++;
  var id='cs_'+_csIdx;
  SEC_LIST.push({k:id,l:'Custom Section '+_csIdx,on:true,custom:true,ctx:''});
  SECS[id]={k:id,l:'Custom Section '+_csIdx,on:true,custom:true,ctx:''};
  renderSecs();
  // Focus the label of the new section for inline rename
  setTimeout(function(){
    var row=document.getElementById('secrow-'+id);
    if(row){var lbl=row.querySelector('.sec-lbl');
      if(lbl){lbl.contentEditable='true';lbl.focus();
        lbl.onblur=function(){lbl.contentEditable='false';
          var sec=SEC_LIST.find(function(s){return s.k===id;});
          if(sec){sec.l=lbl.textContent.trim()||sec.l;SECS[id]=sec;}};
      }
    }
  },60);
}
function removeCustomSec(id){
  var i=SEC_LIST.findIndex(function(s){return s.k===id;});
  if(i>=0)SEC_LIST.splice(i,1);
  delete SECS[id];
  renderSecs();
}
function updateCustomSecCtx(id,val){
  var sec=SEC_LIST.find(function(s){return s.k===id;});
  if(sec){sec.ctx=val;SECS[id]=sec;}
}
function renderToneEl(){var el=document.getElementById('toneG');if(!el)return;el.innerHTML=[['formal','Formal'],['concise','Concise'],['detailed','Detailed']].map(function(t){return '<button class="tone-b'+(TONE===t[0]?' on':'')+'" onclick="TONE=\''+t[0]+'\';document.querySelectorAll(\'#toneG .tone-b\').forEach(function(b){b.classList.remove(\'on\')});this.classList.add(\'on\')">'+t[1]+'</button>';}).join('');}
function renderSchedOpts(){var _so=document.getElementById('schedOpts');if(!M||!_so)return;var so=M.schedOpts;_so.innerHTML=[['Retained Logic',so.rl?'Enabled':'Disabled',so.rl],['Project End Float',so.up?'Enabled':'Disabled',so.up],['Multiple Longest Path',so.ml?'Enabled':'Disabled',so.ml],['Float Type',so.ft||'\u2014',true]].map(function(r){return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--b1);font-size:11px"><span style="color:var(--tx2)">'+r[0]+'</span><span style="color:'+(r[2]?'var(--em)':'var(--am)')+';font-family:monospace;font-weight:500">'+r[1]+'</span></div>';}).join('');}
function getCfg(){return{pmc:(document.getElementById('cfgPmc')||{value:'PMC'}).value,ctr:(document.getElementById('cfgCtr')||{value:'Contractor'}).value,prj:(document.getElementById('cfgPrj')||{value:'Project'}).value,by:(document.getElementById('cfgBy')||{value:''}).value,ctx:'',foc:''};}
function getCmpCfg(){return{pmc:(document.getElementById('cPmc')||{value:'PMC'}).value,ctr:(document.getElementById('cCtr')||{value:'Contractor'}).value,prj:(document.getElementById('cPrj')||{value:'Project'}).value,ctx:(document.getElementById('cCtx')||{value:''}).value};}function buildCmpPrompt(){
  var cfg=getCmpCfg();var diff=forensic(RAW1,RAW2);var tones={formal:'formal, professional',concise:'concise executive brief',detailed:'detailed technical'};
  return 'You are a senior PMC forensic schedule analyst. Generate a forensic schedule comparison report.\n'+'Tone: '+(tones[CTONE]||'formal')+' | PMC: '+cfg.pmc+' | Contractor: '+cfg.ctr+' | Project: '+cfg.prj+'\n'+(cfg.ctx?'Context: '+cfg.ctx+'\n':'')+
    'XER 1: '+F1+' (DD: '+M1.project.dd+')\nXER 2: '+F2+' (DD: '+M2.project.dd+')\n\n'+'SECTIONS:\n## 1. Executive Summary\n## 2. Activity Lifecycle\n## 3. Critical Path Changes\n## 4. Schedule Performance Delta\n## 5. Date & Duration Variances\n## 6. Relationship Changes\n## 7. DCMA Quality Comparison\n## 8. Schedule Maturity Comparison\n## 9. Overall Assessment & Recommendations\n\n'+
    'XER1:\n'+JSON.stringify(M1,null,1)+'\nXER2:\n'+JSON.stringify(M2,null,1)+'\nDIFF:\n'+JSON.stringify(diff,null,1)+'\nStart directly:';
}function startGen(){document.getElementById('backBtn').onclick=function(){goStep(1);};renderExpCards(false,false);goStep(2);setStep(2);generate(buildPrompt(),false);}function renderMD(md){
  var lines=md.split('\n'),parts=[],tb=[],it=false;
  function fmt(t){return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code>$1</code>');}
  function flush(){if(tb.length>=2){var hd=tb[0].split('|').map(function(c){return c.trim();}).filter(Boolean),rows=tb.slice(2).map(function(r){return r.split('|').map(function(c){return c.trim();}).filter(Boolean);});parts.push('<div style="overflow-x:auto;margin:7px 0"><table><thead><tr>'+hd.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>');}tb=[];it=false;}
  for(var i=0;i<lines.length;i++){var l=lines[i];if(l.startsWith('|')){it=true;tb.push(l);continue;}if(it)flush();
    if(l.startsWith('# '))parts.push('<h1>'+fmt(l.slice(2))+'</h1>');else if(l.startsWith('## '))parts.push('<h2>'+fmt(l.slice(3))+'</h2>');else if(l.startsWith('### '))parts.push('<h3>'+fmt(l.slice(4))+'</h3>');
    else if(l.match(/^[-*] /))parts.push('<div class="li-b"><span style="color:var(--ind2)">&#x203A;</span><p>'+fmt(l.slice(2))+'</p></div>');
    else if(l.match(/^\d+\. /)){var mm=l.match(/^(\d+)\. /);parts.push('<div class="li-n"><span style="font-family:monospace;font-size:11px;color:var(--ind2);min-width:18px">'+mm[1]+'.</span><p>'+fmt(l.replace(/^\d+\. /,''))+'</p></div>');}
    else if(l.trim()===''||l==='---')parts.push('<div style="height:5px"></div>');else if(l.trim())parts.push('<p>'+fmt(l)+'</p>');
  }
  if(it)flush();return parts.join('');
}
// ── EXPORT CARDS ─────────────────────────────────────────────────────function dlFmt(fmt,isCmp){try{if(fmt==='docx')exportDOCX(isCmp);else if(fmt==='xlsx')exportXLSX(isCmp);else if(fmt==='pptx')exportPPTX(isCmp).catch(function(e){alert('PPTX error: '+(e.message||e));});}catch(e){console.error(e);alert('Export error: '+(e.message||e));}}

// ── DOCX ─────────────────────────────────────────────────────────────
function exportDOCX(isCmp){
  var m=isCmp?M2:M,cfg=isCmp?getCmpCfg():getCfg();
  function md2h(md){var h='',tb=[],it=false,fmt2=function(t){return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');};var lines=md.split('\n');for(var i=0;i<lines.length;i++){var l=lines[i];if(l.startsWith('|')){it=true;tb.push(l);continue;}if(it){if(tb.length>=2){var hd=tb[0].split('|').map(function(x){return x.trim();}).filter(Boolean),rows=tb.slice(2).map(function(r){return r.split('|').map(function(x){return x.trim();}).filter(Boolean);});h+='<table><thead><tr>'+hd.map(function(x){return '<th>'+x+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';}tb=[];it=false;}if(l.startsWith('# '))h+='<h1>'+fmt2(l.slice(2))+'</h1>';else if(l.startsWith('## '))h+='<h2>'+fmt2(l.slice(3))+'</h2>';else if(l.startsWith('### '))h+='<h3>'+fmt2(l.slice(4))+'</h3>';else if(l.match(/^[-*] /))h+='<li>'+fmt2(l.slice(2))+'</li>';else if(l.match(/^\d+\. /))h+='<li>'+fmt2(l.replace(/^\d+\. /,''))+'</li>';else if(l.trim())h+='<p>'+fmt2(l)+'</p>';}return h;}
  var title=isCmp?'XER Forensic Comparison Report':'PMC Schedule Analysis Report';
  var cov=isCmp?('<strong>XER 1:</strong> '+F1+' (DD: '+M1.project.dd+')<br><strong>XER 2:</strong> '+F2+' (DD: '+M2.project.dd+')<br>'):('<strong>Data Date:</strong> '+m.project.dd+'<br><strong>Planned Completion:</strong> '+m.project.pe+'<br>');
  var dc='<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>@page{margin:2.5cm 2cm}body{font-family:Calibri,Arial;font-size:11pt;color:#1E293B;line-height:1.55}h1{font-size:20pt;color:#4338CA;margin:18pt 0 5pt;border-bottom:2pt solid #6366F1;padding-bottom:4pt}h2{font-size:14pt;color:#4338CA;margin:13pt 0 3pt;border-bottom:1pt solid #C7D2FE;padding-bottom:2pt}h3{font-size:11pt;font-weight:bold;color:#1E293B;margin:8pt 0 2pt}p{margin:3pt 0 4pt}li{margin:2pt 0;margin-left:16pt}table{border-collapse:collapse;width:100%;margin:7pt 0}th{background:#4338CA;color:#fff;padding:5pt 7pt;font-size:9.5pt;text-align:left;border:.5pt solid #4338CA}td{padding:4pt 7pt;font-size:9.5pt;border:.5pt solid #CBD5E1}tr:nth-child(even) td{background:#EEF2FF}.cv{text-align:center;padding:40pt 0 50pt}.ct{font-size:26pt;font-weight:bold;color:#4338CA;margin-bottom:5pt}.cs{font-size:13pt;color:#6366F1;margin-bottom:26pt}.cm{font-size:10pt;color:#64748B;border:1pt solid #CBD5E1;padding:10pt 16pt;display:inline-block;text-align:left;line-height:1.8}\u003c/style>\u003c/head>\u003cbody><div class="cv"><div class="ct">Project Assure</div><div class="cs">'+title+'</div><div class="cm"><strong>Project:</strong> '+(m.project.name||cfg.prj)+'<br>'+cov+'<strong>PMC:</strong> '+cfg.pmc+'<br><strong>Contractor:</strong> '+cfg.ctr+'<br><strong>Report Date:</strong> '+new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})+'</div></div>'+md2h(RTEXT)+'<div style="margin-top:24pt;padding-top:12pt;border-top:1pt solid #CBD5E1;text-align:center;font-size:9pt;color:#64748B;line-height:1.6">&copy; 2026 <strong>Project Assure Private Limited</strong>. All rights reserved.<br>Generated by Project Assure &mdash; Schedule Intelligence Platform.</div></body></html>';
  var blob=new Blob(['\ufeff'+dc],{type:'application/msword;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ProjectAssure_'+((m.project.name||'Schedule').replace(/[^a-z0-9]/gi,'_'))+(isCmp?'_Forensic':'_Report')+'.doc';document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(a.href);},600);
}

// ── XLSX ─────────────────────────────────────────────────────────────
function exportXLSX(isCmp){
  var wb=XLSX.utils.book_new();
  function cols(ws,w){ws['!cols']=w.map(function(x){return{wch:x};});return ws;}
  function addSheets(m,evm,sfx){var cfg2=isCmp?getCmpCfg():getCfg();
    var sm=[['PROJECT ASSURE'+sfx],[''],['Project',m.project.name||cfg2.prj],['PMC',cfg2.pmc],['Contractor',cfg2.ctr],['Data Date',m.project.dd],['Completion',m.project.pe],['Report',new Date().toLocaleDateString('en-GB')],['Copyright',String.fromCharCode(169)+' 2026 Project Assure Private Limited'],[''],
      ['--- SCHEDULE HEALTH ---'],['Metric','Value','Note'],['Total Activities',m.counts.total,''],['Complete',m.counts.comp,Math.round(m.counts.comp/m.counts.total*100)+'%'],['Progress (W)',m.prg.w+'%','KPI'],['Critical Open',m.cp.open,'of '+m.cp.tot],['Near-Critical',m.nc.cnt,'TF<='+m.nc.days+'d'],['OOS Open',m.q.oosOpen,''],['Neg Float',m.q.negF,''],['Maturity Score',m.mat.total+'/100',''],[''],
      ['--- DCMA 14-POINT ---'],['Check','Value','Status']].concat(m.dcma.map(function(c){return[c.id+'. '+c.nm,String(c.val),c.pass?'PASS':c.warn?'WARN':'FAIL'];}));
    XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(sm),[30,16,20]),'Summary'+sfx);
    if(m.cp.chain&&m.cp.chain.length>0){var fcH=['#','Activity ID','Name','Type','Status','ES','EF','Rem(d)','TF(d)'];var fcR=m.cp.chain.map(function(a,i){return[i+1,a.id,a.name,a.type.replace('TT_',''),a.st.replace('TK_',''),a.es,a.ef,a.rem,a.tf];});XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet([fcH].concat(fcR)),[4,22,55,10,10,13,13,8,8]),'CriticalPath'+sfx);}
    if(m.keyMilestones&&m.keyMilestones.length>0){var _bMM={};if(BM&&BM.keyMilestones)BM.keyMilestones.forEach(function(b){if(b.id&&b.ef)_bMM[b.id]=b.ef;});var msH=['Activity ID','Name','Status','Current EF','Baseline Finish','Variance(d)','TF(d)'];var msR=m.keyMilestones.map(function(k){var bEF=_bMM[k.id]||'';var bV='';if(bEF&&k.ef){try{bV=Math.round((new Date(k.ef)-new Date(bEF))/86400000);}catch(e){}}return[k.id,k.name,k.st.replace('TK_',''),k.ef,bEF,bV,k.tf];});XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet([msH].concat(msR)),[22,60,10,13,13,8,8]),'Milestones'+sfx);}
    var dcH=[['DCMA 14-POINT'+sfx],[''],['#','Check','Value','Threshold','Status']].concat(m.dcma.map(function(c){return[c.id,c.nm,String(c.val),String(c.thresh),c.pass?'PASS':c.warn?'WARN':'FAIL'];}));XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(dcH),[4,36,12,10,8]),'DCMA'+sfx);
    var gaoH=[['GAO ASSESSMENT'+sfx],[''],['#','Check','Value','Status','Note']].concat(m.gao.map(function(c){return[c.id,c.nm,String(c.val),c.pass?'PASS':c.warn?'WARN':'FAIL',c.note];}));XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(gaoH),[4,36,20,8,28]),'GAO'+sfx);
    var nasH=[['NASA CHECKS'+sfx],[''],['Check','Value','Status','Note']].concat(m.nasa.map(function(c){return[c.nm,String(c.val),c.pass?'PASS':c.warn?'WARN':'FAIL',c.note];}));XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(nasH),[36,12,8,28]),'NASA'+sfx);
    var fdD=[['FLOAT DISTRIBUTION'+sfx],[''],['Band','Count','% Open'],['Negative',m.fd.neg,(m.fd.neg/m.open*100).toFixed(1)+'%'],['Zero (CP)',m.fd.zero,(m.fd.zero/m.open*100).toFixed(1)+'%'],['1-'+m.nc.days+'d',m.fd.nc,(m.fd.nc/m.open*100).toFixed(1)+'%'],['6-15d',m.fd.f6,(m.fd.f6/m.open*100).toFixed(1)+'%'],['16-30d',m.fd.f16,(m.fd.f16/m.open*100).toFixed(1)+'%'],['>30d',m.fd.hi,(m.fd.hi/m.open*100).toFixed(1)+'%']];XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(fdD),[20,10,10]),'Float'+sfx);
    var matH=[['MATURITY BREAKDOWN'+sfx],[''],['Dimension','Score','Max'],['Logic completeness',m.mat.logic,20],['Resource loading',m.mat.resources,15],['Float health',m.mat.float,15],['Relationships',m.mat.relationships,15],['Constraint hygiene',m.mat.constraints,10],['Duration reasonableness',m.mat.durations,10],['OOS activities',m.mat.oos,10],['Baseline present',m.mat.baseline,5],[''],['TOTAL',m.mat.total,100]];XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(matH),[26,8,8]),'Maturity'+sfx);
    if(evm){var evD=[['EARNED VALUE'+sfx],[''],['Metric','Value'],['BAC',evm.BAC],['EV',evm.EV],['AC',evm.AC],['PV',evm.PV],['CPI',evm.CPI],['SPI',evm.SPI],['CV',evm.CV],['SV',evm.SV],['EAC',evm.EAC],['ETC',evm.ETC],['VAC',evm.VAC],['TCPI',evm.TCPI],['% Done',evm.pctDone+'%'],[''],['S-CURVE'],['Date','EV','AC','PV']].concat(evm.sCurve.map(function(p){return[p.date,p.ev,p.ac,p.pv];}));XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(evD),[26,16,16]),'EVM'+sfx);var resR=[['RESOURCE REGISTER'+sfx],[''],['Type','Code','Name','Budgeted Units','Unit Type','BL Planned %','Actual Units','Actual Cost','Remaining Units']];['labor','material','equipment'].forEach(function(t){(evm.resources[t]||[]).forEach(function(r){var ut=r.qtType==='QT_Hour'?'Hours':r.qtType||'Units';resR.push([t==='labor'?'Labour':t==='material'?'Material':'Equipment',r.short,r.name,r.bqty,ut,r.bac,r.aqty,r.ac,r.rqty]);});});XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(resR),[12,12,35,14,10,14,12,14,14]),'Resources'+sfx);}
  }
  if(isCmp){addSheets(M1,null,'_XER1');addSheets(M2,null,'_XER2');var diff=forensic(RAW1,RAW2);var cmpD=[['FORENSIC COMPARISON'],[''],['Metric','XER1','XER2','Change'],['Activities',M1.counts.total,M2.counts.total,M2.counts.total-M1.counts.total],['Complete',M1.counts.comp,M2.counts.comp,M2.counts.comp-M1.counts.comp],['Progress (W)',M1.prg.w+'%',M2.prg.w+'%',(M2.prg.w-M1.prg.w).toFixed(1)+'%'],['Critical Open',M1.cp.open,M2.cp.open,M2.cp.open-M1.cp.open],['Near-Crit',M1.nc.cnt,M2.nc.cnt,M2.nc.cnt-M1.nc.cnt],['Neg Float',M1.q.negF,M2.q.negF,M2.q.negF-M1.q.negF],['OOS',M1.q.oosTot,M2.q.oosTot,M2.q.oosTot-M1.q.oosTot],['Maturity',M1.mat.total+'/100',M2.mat.total+'/100',M2.mat.total-M1.mat.total],[''],['Added',diff.addedCnt,'',''],['Removed',diff.removedCnt,'',''],['Modified',diff.modifiedCnt,'',''],['Rels Added',diff.rA,'',''],['Rels Removed',diff.rR,'','']];XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet(cmpD),[26,12,12,12]),'Comparison');var modH=['Activity ID','Name','Field','XER1','XER2','Diff'];var modR=[];diff.modified.forEach(function(m){m.changes.forEach(function(c){modR.push([m.id,m.name,c.f,c.from,c.to,c.diff!==undefined?c.diff:'']);});});XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet([modH].concat(modR)),[22,55,14,13,13,8]),'Changes');}
  else{addSheets(M,EVM,'');
    // Parallel redundant rels
    if(M.redundant&&M.redundant.parallelCnt>0){var parH=['Predecessor ID','Predecessor Name','Successor ID','Successor Name','Type','Lag(d)'];var parR=M.redundant.parallel.map(function(r){return[r.pred,r.predName,r.succ,r.succName,r.type,parseFloat(r.lag)];});XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet([parH].concat(parR)),[20,45,20,45,12,8]),'Parallel Redundant Rels');}
    // Transitive redundant rels
    if(M.redundant&&M.redundant.transitiveCnt>0){var trH=['Predecessor ID','Predecessor Name','Via (Intermediate) ID','Via Name','Successor ID','Successor Name','Type','Lag(d)'];var trR=M.redundant.transitive.map(function(r){return[r.pred,r.predName,r.via,r.viaName,r.succ,r.succName,r.type,parseFloat(r.lag)];});XLSX.utils.book_append_sheet(wb,cols(XLSX.utils.aoa_to_sheet([trH].concat(trR)),[20,45,20,45,20,45,12,8]),'Transitive Redundant Rels');}
  }
  XLSX.writeFile(wb,'ProjectAssure_'+((M?M.project.name:'Schedule').replace(/[^a-z0-9]/gi,'_'))+(isCmp?'_Forensic':'_Analysis')+'.xlsx');
}

// ── PPTX ─────────────────────────────────────────────────────────────
async function exportPPTX(isCmp){
  var m=isCmp?M2:M,cfg=isCmp?getCmpCfg():getCfg(),evm=isCmp?null:EVM;
  var pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
  var IN='4338CA',I2='6366F1',WH='FFFFFF',DK='1E293B',GR='64748B',BG='F8FAFF';
  function S(v){return String(v===null||v===undefined?'':v)||'\u2014';}
  function HC(t){return{text:S(t),options:{bold:true,color:WH,fill:{color:IN},fontSize:9,fontFace:'Calibri',valign:'middle'}};}
  function base(tl,sb){var sl=pptx.addSlide();sl.background={color:BG};sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:.54,fill:{color:IN}});sl.addText('PROJECT ASSURE',{x:.2,y:.07,w:6,h:.22,fontSize:9,bold:true,color:WH,fontFace:'Calibri'});sl.addText(cfg.pmc+' \u00B7 '+(m.project.name||cfg.prj),{x:.2,y:.29,w:12,h:.18,fontSize:8,color:'A5B4FC',fontFace:'Calibri'});sl.addShape(pptx.ShapeType.rect,{x:0,y:.54,w:.06,h:6.96,fill:{color:I2}});if(tl)sl.addText(tl,{x:.24,y:.70,w:12.6,h:.42,fontSize:16,bold:true,color:DK,fontFace:'Calibri'});if(sb)sl.addText(sb,{x:.24,y:1.18,w:12.6,h:.22,fontSize:10,color:GR,fontFace:'Calibri'});return sl;}
  var s1=pptx.addSlide();s1.background={color:IN};s1.addShape(pptx.ShapeType.rect,{x:0,y:5.1,w:13.33,h:2.4,fill:{color:'3730A3'}});s1.addText('PROJECT ASSURE',{x:.5,y:.72,w:12,h:.42,fontSize:12,bold:true,color:'C7D2FE',fontFace:'Calibri',align:'center'});s1.addText(isCmp?'Forensic Schedule Comparison':'PMC Schedule Analysis Report',{x:.5,y:1.3,w:12,h:1.46,fontSize:28,bold:true,color:WH,fontFace:'Calibri',align:'center',lineSpacingMultiple:1.08});s1.addText(m.project.name||cfg.prj,{x:.5,y:2.96,w:12,h:.4,fontSize:13,color:'A5B4FC',fontFace:'Calibri',align:'center'});s1.addText(isCmp?(F1+' vs '+F2):('DD: '+m.project.dd+'  \u00B7  Completion: '+m.project.pe),{x:.5,y:5.28,w:12,h:.26,fontSize:10,color:'CBD5E1',fontFace:'Calibri',align:'center'});s1.addText(cfg.pmc,{x:.5,y:5.66,w:12,h:.24,fontSize:11,bold:true,color:WH,fontFace:'Calibri',align:'center'});
  var s2=base('Schedule Status Dashboard','Data Date: '+m.project.dd);
  var st=[['Total Activities',m.counts.total.toLocaleString(),'EEF2FF',DK],['Complete',m.counts.comp+' ('+Math.round(m.counts.comp/m.counts.total*100)+'%)','F0FDF4','166534'],['Progress (W)',m.prg.w+'%','FEFCE8','92400E'],['Critical Open',String(m.cp.open),'FEF2F2','991B1B'],['Near-Critical',String(m.nc.cnt),'FFF7ED','9A3412'],['Maturity',m.mat.total+'/100','EEF2FF','4338CA']];
  st.forEach(function(s,i){var x=.2+(i%3)*4.38,y=i<3?1.72:3.34;s2.addShape(pptx.ShapeType.rect,{x:x,y:y,w:4.1,h:1.36,fill:{color:s[2]},line:{color:'E2E8F0',width:.7}});s2.addText(s[0],{x:x+.12,y:y+.1,w:3.8,h:.22,fontSize:9,color:GR,fontFace:'Calibri',bold:true});s2.addText(s[1],{x:x+.12,y:y+.3,w:3.8,h:.56,fontSize:19,color:s[3],fontFace:'Calibri',bold:true});});
  s2.addText('DCMA Passes: '+m.dcma.filter(function(c){return c.pass;}).length+'/14  \u00B7  GAO Passes: '+m.gao.filter(function(c){return c.pass;}).length+'/9  \u00B7  OOS: '+m.q.oosOpen+'  \u00B7  Neg Float: '+m.q.negF,{x:.2,y:4.88,w:12.5,h:.26,fontSize:10,color:GR,fontFace:'Calibri'});
  var s3=base('DCMA 14-Point & GAO Schedule Quality','');
  var dcRows=[[HC('#'),HC('DCMA Check'),HC('Value'),HC('Status')]];m.dcma.slice(0,14).forEach(function(c,i){var bg=i%2===0?null:'F8FAFF',ro=bg?{fill:{color:bg}}:{};var sc2=c.pass?'16A34A':c.warn?'D97706':'DC2626';dcRows.push([{text:S(c.id),options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:DK})},{text:c.nm.slice(0,52),options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:DK})},{text:S(c.val),options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:DK,align:'center'})},{text:c.pass?'PASS':c.warn?'WARN':'FAIL',options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:sc2,bold:true,align:'center'})}]);});
  s3.addTable(dcRows,{x:.2,y:1.65,w:12.9,colW:[.38,7.8,1.8,1.4],border:{type:'solid',pt:.5,color:'E2E8F0'},rowH:.32});
  var s4=base('Critical Path Register','Activities driving completion to '+m.project.pe);
  var cpRows=[[HC('#'),HC('Activity ID'),HC('Name'),HC('EF'),HC('Rem'),HC('TF')]];m.cp.chain.slice(0,10).forEach(function(a,i){var tf2=a.tf,tc=tf2===0?'DC2626':tf2<=3?'D97706':DK,bg=i%2===0?null:'F8FAFF',ro=bg?{fill:{color:bg}}:{};cpRows.push([{text:S(i+1),options:Object.assign({},ro,{fontSize:8,fontFace:'Calibri',color:DK})},{text:S(a.id),options:Object.assign({},ro,{fontSize:8,fontFace:'Courier New',color:DK})},{text:S(a.name),options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:DK})},{text:S(a.ef),options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:DK})},{text:String(a.rem)+'d',options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:DK,align:'right'})},{text:String(tf2)+'d',options:Object.assign({},ro,{fontSize:9,fontFace:'Calibri',color:tc,bold:tf2===0,align:'right'})}]);});
  s4.addTable(cpRows,{x:.2,y:1.65,w:12.9,colW:[.4,2.0,6.2,1.5,.8,.9],border:{type:'solid',pt:.5,color:'E2E8F0'},rowH:.4});
  var s5=base('Schedule Logic & Quality Summary','');
  var litems=[['FS Relationships',m.rels.PR_FS+' ('+Math.round(m.rels.PR_FS/Math.max(m.rels.tot,1)*100)+'%)'],['SF Relationships (DCMA)',m.rels.PR_SF+' '+(m.rels.PR_SF===0?'PASS':'FAIL')],['Missing Predecessors',m.q.noPred+' ('+m.dcma[0].pct+'%)'],['Missing Successors',m.q.noSucc+' ('+m.dcma[1].pct+'%)'],['Negative Lags',m.rels.negLagCnt+' '+(m.rels.negLagCnt===0?'PASS':'FAIL')],['Hard Constraints',m.q.hardCst+' (DCMA thr: <5%)'],['OOS Activities (open)',m.q.oosOpen],['Unresourced Tasks',m.q.noRes+' ('+m.dcma[7].pct+'%)']];
  litems.forEach(function(r,i){var x=.2+(i%2)*6.5,y=1.70+Math.floor(i/2)*.84;s5.addShape(pptx.ShapeType.rect,{x:x,y:y,w:6.2,h:.72,fill:{color:'F8FAFF'},line:{color:'E2E8F0',width:.7}});s5.addText(r[0],{x:x+.12,y:y+.08,w:5.8,h:.22,fontSize:9,color:GR,fontFace:'Calibri',bold:true});s5.addText(String(r[1]),{x:x+.12,y:y+.3,w:5.8,h:.26,fontSize:13,color:DK,fontFace:'Calibri',bold:true});});
  s5.addText('Maturity: '+m.mat.total+'/100  Logic:'+m.mat.logic+'/20  Resources:'+m.mat.resources+'/15  Float:'+m.mat.float+'/15  Rels:'+m.mat.relationships+'/15',{x:.2,y:5.18,w:12.5,h:.26,fontSize:10,color:GR,fontFace:'Calibri'});
  if(evm){var s6=base('Earned Value Performance','CPI: '+evm.CPI.toFixed(3)+' | SPI: '+getSPI().toFixed(3)+' | Maturity: '+m.mat.total+'/100');var ek=[['BAC',fmtM(evm.BAC),'EEF2FF',DK],['EV',fmtM(evm.EV),'F0FDF4','166534'],['AC',fmtM(evm.AC),'FEF2F2',evm.CPI>=1?DK:'991B1B'],['EAC',fmtM(evm.EAC),evm.EAC<=evm.BAC?'F0FDF4':'FEF2F2',evm.EAC<=evm.BAC?'166534':'991B1B']];ek.forEach(function(e2,i){var x=.2+(i%4)*3.32,y=1.72;s6.addShape(pptx.ShapeType.rect,{x:x,y:y,w:3.1,h:1.26,fill:{color:e2[2]},line:{color:'E2E8F0',width:.7}});s6.addText(e2[0],{x:x+.12,y:y+.1,w:2.8,h:.22,fontSize:9,color:GR,fontFace:'Calibri',bold:true});s6.addText(e2[1],{x:x+.12,y:y+.3,w:2.8,h:.54,fontSize:19,color:e2[3],fontFace:'Calibri',bold:true});});var ik=[['CPI',evm.CPI.toFixed(3),evm.CPI>=1?'16A34A':'DC2626'],['SPI',getSPI().toFixed(3),evm.SPI>=0.9?'16A34A':'D97706'],['TCPI',evm.TCPI.toFixed(3),evm.TCPI<=1?'16A34A':'D97706'],['%Done',evm.pctDone+'%','2563EB']];ik.forEach(function(k2,i){var x=.2+(i%4)*3.32,y=3.14;s6.addShape(pptx.ShapeType.rect,{x:x,y:y,w:3.1,h:1.0,fill:{color:'F8FAFF'},line:{color:'E2E8F0',width:.7}});s6.addText(k2[0],{x:x+.12,y:y+.09,w:2.8,h:.22,fontSize:9,color:GR,fontFace:'Calibri',bold:true});s6.addText(k2[1],{x:x+.12,y:y+.28,w:2.8,h:.44,fontSize:17,color:k2[2],fontFace:'Calibri',bold:true});});s6.addText('CV: '+fmtM(evm.CV)+'  SV: '+fmtM(evm.SV)+'  VAC: '+fmtM(evm.VAC)+'  Periods: '+evm.periodCount,{x:.2,y:4.3,w:12.5,h:.24,fontSize:10,color:GR,fontFace:'Calibri'});}
  var s7=pptx.addSlide();s7.background={color:BG};s7.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:.54,fill:{color:IN}});s7.addText('PROJECT ASSURE',{x:.2,y:.07,w:6,h:.22,fontSize:9,bold:true,color:WH,fontFace:'Calibri'});s7.addText('Analysis Complete',{x:.5,y:1.78,w:12,h:.62,fontSize:25,bold:true,color:DK,fontFace:'Calibri',align:'center'});s7.addText(cfg.pmc,{x:.5,y:2.52,w:12,h:.36,fontSize:12,color:IN,fontFace:'Calibri',align:'center'});s7.addText('DD: '+m.project.dd+'  \u00B7  Report: '+new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}),{x:.5,y:3.04,w:12,h:.26,fontSize:10,color:GR,fontFace:'Calibri',align:'center'});s7.addText('Generated by Project Assure \u2014 Schedule Intelligence Platform',{x:.5,y:5.62,w:12,h:.2,fontSize:9,color:'94A3B8',fontFace:'Calibri',align:'center'});
  await pptx.writeFile({fileName:'ProjectAssure_'+((m.project.name||'Schedule').replace(/[^a-z0-9]/gi,'_'))+(isCmp?'_Forensic':'')+'_Deck.pptx'});
}

// ── PRINT / PDF ─────────────────────────────────────────────────────
var _activeTabForPrint='exec';
function selectAllPdfTabs(checked){
  var cks=document.querySelectorAll('.pdf-ck');
  cks.forEach(function(ck){ck.checked=checked;});
}function printSelectedTab(tabId){
  var cks=document.querySelectorAll('.pdf-ck');
  cks.forEach(function(ck){ck.checked=(ck.value===tabId);});
  printCheckedTabs();
}
function printCurrentTab(){
  var tabIds=['exec','overview','compliance','logic','path','evm','milestones'];
  var active='exec';
  tabIds.forEach(function(t){var el=document.getElementById('tab-'+t);if(el&&!el.classList.contains('hidden'))active=t;});
  var cks=document.querySelectorAll('.pdf-ck');
  cks.forEach(function(ck){ck.checked=(ck.value===active);});
  printCheckedTabs();
}

// ── INIT ─────────────────────────────────────────────────────────────
renderStepbar();initAuth();

function startGen(){alert('AI generation not available.');}
function startCmpGen(){alert('AI generation not available.');}

function getSPI(){if(!EVM)return 0;if(BEVM&&BEVM.pvEarlyCurve&&BEVM.pvEarlyCurve.length&&EVM.dataDateMonth){var pts=BEVM.pvEarlyCurve.filter(function(p){return p.date<=EVM.dataDateMonth;});if(pts.length){var blPV=pts[pts.length-1].v;if(blPV>0)return Math.round(EVM.EV/blPV*1000)/1000;}}return EVM.SPI;}

function printCheckedTabs(){
  var tabs=[].slice.call(document.querySelectorAll('.pdf-ck')).filter(function(c){return c.checked;}).map(function(c){return c.value;});
  if(!tabs.length){alert('Select at least one tab.');return;}
  if(!M){alert('Load a XER file first.');return;}
  if(typeof html2canvas==='undefined'||typeof window.jspdf==='undefined'){alert('PDF library not loaded. Refresh the page.');return;}
  var jsPDF=window.jspdf.jsPDF;
  var tN={exec:'Executive Summary',overview:'Schedule Overview',compliance:'Compliance Assessment',logic:'Logic Analysis',path:'Critical Path',evm:'EVM & S-Curve',milestones:'Milestone Tracker'};
  var cfg=getCfg(),proj=(cfg.prj||M.project.name||'Project').trim(),pmc=(cfg.pmc||'PMC').trim(),prep=(cfg.by||pmc).trim();
  var dd=fmtDate(M.project.dd),today=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var pi=document.getElementById('cfgPrj');if(pi&&!pi.value.trim()&&M.project.name)pi.value=M.project.name;
  var btn=document.getElementById('pdfDlBtn');if(btn){btn.innerHTML='\u23F3 Building\u2026';btn.disabled=true;}

  // A4 Portrait: 210 x 297mm
  var doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  var PW=doc.internal.pageSize.getWidth();  // 210mm
  var PH=doc.internal.pageSize.getHeight(); // 297mm
  var MG=10, HDR=12, FTR=8;
  var CY=MG+HDR+2, CH=PH-CY-MG-FTR;       // ~255mm usable per page

  function hf(pg,tot,sec){
    doc.setPage(pg);
    doc.setFillColor(67,56,202);doc.rect(0,0,PW,MG+HDR,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(9.5);doc.setFont('helvetica','bold');
    doc.text(proj.slice(0,40),MG+3,MG+8.5);
    doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(200,205,255);
    doc.text(sec,MG+3,MG+HDR-0.5);
    doc.text('DD: '+dd+' | '+CURR_CODE,PW-MG-3,MG+8.5,{align:'right'});
    var fy=PH-MG-FTR;
    doc.setDrawColor(200,200,200);doc.setLineWidth(0.3);doc.line(MG,fy,PW-MG,fy);
    doc.setTextColor(140,140,140);doc.setFontSize(7);doc.setFont('helvetica','normal');
    doc.text('ProjectAssure | (c) 2026 Project Assure Pvt Ltd | '+pmc,MG+3,fy+4.5);
    doc.text('Prepared by '+prep+' | '+today,PW/2,fy+4.5,{align:'center'});
    doc.text('Page '+pg+'/'+tot,PW-MG-3,fy+4.5,{align:'right'});
  }

  // Save current tab visibility
  var aIds=['exec','overview','compliance','logic','path','evm','milestones'];
  var saved={};
  aIds.forEach(function(t){var e=document.getElementById('tab-'+t);if(e)saved[t]=e.classList.contains('hidden');});

  // Pre-render EVM charts
  if(tabs.indexOf('evm')>=0&&EVM&&typeof renderEVMTab==='function'){
    if(SC){try{SC.destroy();}catch(ex){}SC=null;}renderEVMTab();
  }

  var Q=tabs.slice(),pgCount=0;
  if(!doc._sLabels)doc._sLabels={};

  function nxt(){
    if(!Q.length){
      aIds.forEach(function(t){var e=document.getElementById('tab-'+t);if(!e)return;e.classList[saved[t]?'add':'remove']('hidden');});
      var tot=doc.internal.getNumberOfPages();
      for(var p=1;p<=tot;p++)hf(p,tot,doc._sLabels[p]||'');
      doc.save('ProjectAssure_'+(M.project.name||'Schedule').replace(/[^a-z0-9]/gi,'_')+'_Report.pdf');
      if(btn){btn.innerHTML='\u2193\u2002Download PDF';btn.disabled=false;}
      return;
    }
    var t=Q.shift();
    var el=document.getElementById('tab-'+t);
    if(!el){nxt();return;}
    var sec=tN[t]||t;

    // Show only this tab
    aIds.forEach(function(id){var e=document.getElementById('tab-'+id);if(!e)return;e.classList[id===t?'remove':'add']('hidden');});
    if(t==='evm'&&EVM&&typeof renderEVMTab==='function'){
      if(SC){try{SC.destroy();}catch(ex){}SC=null;}
      if(RSC){try{RSC.destroy();}catch(ex){}RSC=null;}
      renderEVMTab();
      setTimeout(function(){
        if(SC){try{SC.update('none');SC.resize();}catch(e){}}
        if(RSC){try{RSC.update('none');RSC.resize();}catch(e){}}
      },300);
    }

    setTimeout(function(){
      // Light-mode + layout override for clean portrait capture
      // Key: force everything to single column, tables to wrap within width
      var st=document.createElement('style');st.id='_pst';
      st.textContent=
        '#tab-'+t+'{background:#fff!important;padding:8px!important;box-sizing:border-box!important}'
        // Cards: full width, stacked vertically
        +'.card{background:#fff!important;border:1px solid #e2e8f0!important;box-shadow:none!important;margin-bottom:10px!important;box-sizing:border-box!important;width:100%!important}'
        +'.card-hd{color:#1e293b!important;border-bottom:1px solid #e2e8f0!important;font-size:11px!important;font-weight:700!important;padding-bottom:5px!important;margin-bottom:7px!important}'
        +'.hd-dot{display:none!important}'
        // KPIs
        +'.kpi{background:#f8faff!important;border:1px solid #e2e8f0!important;min-width:0!important;padding:6px 7px!important}'
        // EVM full-width grid in PDF
        +'#evmR1{display:grid!important;grid-template-columns:repeat(13,minmax(0,1fr))!important;gap:4px!important;width:100%!important}'
        +'#evmR1 .kpi{padding:5px 4px!important}'
        +'#evmR1 .kpi-l{font-size:7.5px!important;line-height:1.1!important}'
        +'#evmR1 .kpi-v{font-size:11px!important;line-height:1.1!important;font-weight:700!important;letter-spacing:-.3px!important}'
        +'#evmR1 .kpi-s{font-size:7px!important;line-height:1.1!important;margin-top:2px!important}'
        +'.kpi-v{color:#1e293b!important;font-size:13px!important;font-weight:700!important}'
        +'.kpi-l{color:#64748b!important;font-size:9px!important}'
        +'.g4{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:5px!important}'
        // Grid layouts: force single column for portrait
        +'div[style*="grid-template-columns:1fr 1fr"]{display:block!important}'
        +'div[style*="grid-template-columns:1fr 330px"]{display:block!important}'
        // Tables: fit within width, wrap text, smaller font
        +'.tbl{width:100%!important;table-layout:fixed!important;word-break:break-word!important;font-size:9px!important}'
        +'.tbl thead th{background:#4338CA!important;color:#fff!important;font-size:9px!important;padding:4px 5px!important;white-space:normal!important;word-break:break-word!important}'
        +'.tbl tbody td{background:#fff!important;color:#1e293b!important;border-color:#e2e8f0!important;font-size:9px!important;padding:3px 5px!important;white-space:normal!important;word-break:break-word!important}'
        +'.tbl tbody tr:nth-child(even) td{background:#f8faff!important}'
        // Unwrap table scroll containers
        +'.tbl-wrap{max-height:none!important;overflow:visible!important;width:100%!important}'
        // Badges
        +'.badge.b-pass{background:#d1fae5!important;color:#065f46!important;font-size:8px!important}'
        +'.badge.b-fail{background:#fee2e2!important;color:#991b1b!important;font-size:8px!important}'
        +'.badge.b-warn{background:#fef3c7!important;color:#92400e!important;font-size:8px!important}'
        +'.badge.b-info{background:#dbeafe!important;color:#1e40af!important;font-size:8px!important}'
        // Text colours
        +'.nm{color:#1e293b!important;white-space:normal!important;word-break:break-word!important}'
        +'.mono{color:#334155!important;font-size:9px!important}'
        +'.num{color:#1e293b!important}'
        +'.bar-t{background:#e2e8f0!important}'
        // Charts
        +'.scurve-wrap{background:#fff!important;height:200px!important}'
        +'canvas{max-width:100%!important;width:100%!important}'
        // Compliance rows
        +'.cmp-row{flex-wrap:wrap!important;font-size:9px!important}'
        +'.cmp-nm{font-size:9px!important;white-space:normal!important;max-width:none!important}'
        +'.cmp-val{font-size:9px!important}'
        // Logic rows
        +'.logic-row{font-size:9px!important}'
        // Bar rows
        +'.bar-row{font-size:9px!important}'
        +'p,div,span,td,th,label{color:#334155}';
      document.head.appendChild(st);

      // Resize charts to fill width
      if(SC&&SC.canvas){SC.canvas.style.width='100%';SC.canvas.style.maxWidth='100%';try{SC.resize();}catch(e){}}
      if(RSC&&RSC.canvas){RSC.canvas.style.width='100%';RSC.canvas.style.maxWidth='100%';try{RSC.resize();}catch(e){}}
      el.querySelectorAll('canvas').forEach(function(c){c.style.maxWidth='100%';c.style.width='100%';});

      // Capture width = A4 portrait content width (190mm at 96dpi × 2 for scale:2)
      // 190mm * 3.7795px/mm = 718px logical → 1436px at scale:2
      var cW=718;
      var prevW=el.style.width;
      el.style.width=cW+'px';
      void el.offsetHeight;

      html2canvas(el,{
        scale:2,
        useCORS:true,allowTaint:true,
        backgroundColor:'#ffffff',
        logging:false,
        scrollX:0,scrollY:0,
        width:cW,
        height:el.scrollHeight,
        windowWidth:cW,
        windowHeight:el.scrollHeight
      }).then(function(canvas){
        el.style.width=prevW;
        var s2=document.getElementById('_pst');if(s2)s2.remove();

        // Image in mm: canvas is 718*2=1436px wide → at 190mm content width, scale=1
        var aw=PW-2*MG;       // 190mm
        var ah=CH;             // ~255mm per page
        var imgWmm=cW/3.7795; // 718/3.7795 ≈ 190mm
        var imgHmm=(canvas.height/2)/3.7795;
        var sc=aw/imgWmm;     // ≈ 1.0 — fills width exactly
        var fW=aw;
        var fH=imgHmm*sc;

        var pages=Math.max(1,Math.ceil(fH/ah));
        var sliceH=Math.floor(canvas.height/pages);

        for(var pi=0;pi<pages;pi++){
          if(pgCount>0)doc.addPage('a4','portrait');
          pgCount++;
          doc._sLabels[pgCount]=sec+(pages>1?' ('+(pi+1)+'/'+pages+')':'');
          var rs=pi*sliceH;
          var re=(pi===pages-1)?canvas.height:(pi+1)*sliceH;
          var sh=re-rs;
          var tmp=document.createElement('canvas');
          tmp.width=canvas.width;tmp.height=sh;
          tmp.getContext('2d').drawImage(canvas,0,rs,canvas.width,sh,0,0,canvas.width,sh);
          var sliceHmm=(sh/2)/3.7795*sc;
          doc.addImage(tmp.toDataURL('image/png'),'PNG',MG,CY,fW,sliceHmm,undefined,'FAST');
        }
        nxt();
      }).catch(function(e){
        el.style.width=prevW;
        var s2=document.getElementById('_pst');if(s2)s2.remove();
        console.warn('PDF capture error',e);nxt();
      });
    },t==='evm'?900:380);
  }
  setTimeout(nxt,60);
}

function getCheckedTabs(){return[].slice.call(document.querySelectorAll('.pdf-ck')).filter(function(c){return c.checked;}).map(function(c){return c.value;});}

















function initTableFilters(){
  if(typeof addTblFilter!=='function')return;
  addTblFilter('cpWrap','cpTbody',[{idx:1,label:'Activity ID',type:'text'},{idx:2,label:'Name',type:'text'},{idx:3,label:'Type',type:'select'},{idx:4,label:'Status',type:'select'}]);
  addTblFilter('ncWrap','ncTbody',[{idx:1,label:'Activity ID',type:'text'},{idx:2,label:'Name',type:'text'}]);
  addTblFilter('msWrap','msTbody',[{idx:1,label:'Activity ID',type:'text'},{idx:2,label:'Name',type:'text'},{idx:0,label:'Status',type:'select'}]);
  addTblFilter('rsrcWrap','rsrcUnitTbody',[{idx:0,label:'Resource',type:'text'},{idx:1,label:'Type',type:'select'}]);
}
function initCmpFilters(){
  if(typeof addTblFilter!=='function')return;
  addTblFilter('cmpModWrap','cmpModBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'},{idx:2,label:'Field',type:'select'}]);
  addTblFilter('cmpAddWrap','cmpAddBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'}]);
  addTblFilter('cmpRemWrap','cmpRemBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'}]);
  addTblFilter('cmpSlipWrap','cmpSlipBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'}]);
  addTblFilter('cmpNewCritWrap','cmpNewCritBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'}]);
  addTblFilter('cmpRemCritWrap','cmpRemCritBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'}]);
  addTblFilter('cmpMsWrap','cmpMsBody',[{idx:0,label:'ID',type:'text'},{idx:1,label:'Name',type:'text'},{idx:5,label:'Status',type:'select'}]);
}


// ── FORENSIC DASHBOARD (Compare/Forensic mode) ─────────────────────
function showCmpTab(tab,btn){
  ['summary','activity','critical','schedule','compliance','milestones','export'].forEach(function(t){
    var el=document.getElementById('cmpTab-'+t);if(el)el.classList.toggle('hidden',t!==tab);
  });
  document.querySelectorAll('#pgCmpCfg .atab').forEach(function(b){b.classList.remove('on');});
  if(btn)btn.classList.add('on');
  try{
    if(tab==='activity')renderCmpActivity();
    else if(tab==='critical')renderCmpCritical();
    else if(tab==='schedule')renderCmpSchedule();
    else if(tab==='compliance')renderCmpCompliance();
    else if(tab==='milestones')renderCmpMilestones();
    setTimeout(initCmpFilters,120);
  }catch(e){console.error('showCmpTab:',e);}
}

function renderCmpDashboard(){
  if(!M1||!M2||!RAW1||!RAW2)return;
  var diff;
  try{diff=forensic(RAW1,RAW2);}
  catch(fe){console.error('forensic:',fe);diff={addedCnt:0,removedCnt:0,modifiedCnt:0,rA:0,rR:0,slippage:[],newCritical:[],notCritical:[],modified:[],added:[],removed:[]};}
  var sl=diff.slippage||[],nc=diff.newCritical||[];
  var h='<div class="card-hd"><div class="hd-dot" style="background:var(--ind)"></div>Forensic Overview</div>';
  h+='<div class="g4" style="margin-bottom:10px">'+kpi('+'+diff.addedCnt,'Added','em','activities')+kpi('-'+diff.removedCnt,'Removed','rd','activities')+kpi(diff.modifiedCnt,'Modified','ind','activities')+kpi((diff.rA||0)+'/'+(diff.rR||0),'Rel +/-','cy','added/removed')+'</div>';
  h+='<div class="g4">'+kpi(((M1.prg&&M1.prg.w)||0).toFixed(1)+'%','Progress XER1','am','weighted')+kpi(((M2.prg&&M2.prg.w)||0).toFixed(1)+'%','Progress XER2','em','weighted')+kpi(sl.length,'Slippage >5d',sl.length?'rd':'em','activities')+kpi(nc.length,'New Critical',nc.length?'or':'em','activities')+'</div>';
  var prev=document.getElementById('cmpPrev');if(prev)prev.innerHTML=h;
  function dr(lb,v1,v2,lB){var d=(typeof v1==='number'&&typeof v2==='number')?(v2-v1):null;var ds=d!==null?(d>0?'+':'')+d:'--';var dc=d===null?'var(--tx3)':d===0?'var(--tx3)':(lB?d<0?'var(--em)':'var(--rd)':d>0?'var(--em)':'var(--rd)');return'<tr><td class="nm">'+lb+'</td><td class="num">'+(v1==null?'--':v1)+'</td><td class="num">'+(v2==null?'--':v2)+'</td><td class="num" style="color:'+dc+';font-weight:600">'+ds+'</td></tr>';}
  var sb=document.getElementById('cmpSchedBody');
  if(sb)sb.innerHTML=[
    ['Total Activities',(M1.counts&&M1.counts.total)||0,(M2.counts&&M2.counts.total)||0,false],
    ['Complete',(M1.counts&&M1.counts.comp)||0,(M2.counts&&M2.counts.comp)||0,false],
    ['Progress (W%)',((M1.prg&&M1.prg.w)||0).toFixed(1),((M2.prg&&M2.prg.w)||0).toFixed(1),false],
    ['Critical Open',(M1.cp&&M1.cp.open)||0,(M2.cp&&M2.cp.open)||0,true],
    ['Near-Critical',(M1.nc&&M1.nc.cnt)||0,(M2.nc&&M2.nc.cnt)||0,true],
    ['Negative Float',(M1.q&&M1.q.negF)||0,(M2.q&&M2.q.negF)||0,true],
    ['OOS Open',(M1.q&&M1.q.oosOpen)||0,(M2.q&&M2.q.oosOpen)||0,true],
    ['Planned Finish',fmtDate((M1.project||{}).pe),fmtDate((M2.project||{}).pe),null]
  ].map(function(r){return dr(r[0],r[1],r[2],r[3]);}).join('');
  var qb=document.getElementById('cmpQualBody');
  if(qb)qb.innerHTML=[
    ['Maturity (/100)',(M1.mat&&M1.mat.total)||0,(M2.mat&&M2.mat.total)||0,false],
    ['DCMA Passes',(M1.dcma||[]).filter(function(c){return c.pass;}).length,(M2.dcma||[]).filter(function(c){return c.pass;}).length,false],
    ['Logic Density',(M1.rels&&M1.rels.density)||0,(M2.rels&&M2.rels.density)||0,false],
    ['SF Rels',(M1.rels&&M1.rels.PR_SF)||0,(M2.rels&&M2.rels.PR_SF)||0,true],
    ['Neg Lags',(M1.rels&&M1.rels.negLagCnt)||0,(M2.rels&&M2.rels.negLagCnt)||0,true]
  ].map(function(r){return dr(r[0],r[1],r[2],r[3]);}).join('');
  setTimeout(initCmpFilters,80);
}

function renderCmpActivity(){
  if(!M1||!M2)return;
  var diff;try{diff=forensic(RAW1,RAW2);}catch(e){diff={addedCnt:0,removedCnt:0,modifiedCnt:0,rA:0,rR:0,modified:[],added:[],removed:[]};}
  var ke=document.getElementById('cmpActKpis');
  if(ke)ke.innerHTML=kpi('+'+diff.addedCnt,'Added','em','')+kpi('-'+diff.removedCnt,'Removed','rd','')+kpi(diff.modifiedCnt,'Modified','ind','')+kpi((diff.rA||0)+'/'+(diff.rR||0),'Rel +/-','cy','');
  var mb=document.getElementById('cmpModBody');
  if(mb){var rows=[];(diff.modified||[]).slice(0,200).forEach(function(m){(m.changes||[]).forEach(function(c){rows.push('<tr><td class="mono" style="font-size:10px">'+m.id+'</td><td class="nm">'+(m.name||'').slice(0,34)+'</td><td style="font-size:10px">'+c.f+'</td><td class="mono" style="font-size:10px">'+String(c.from||'').slice(0,16)+'</td><td class="mono" style="font-size:10px">'+String(c.to||'').slice(0,16)+'</td><td class="num" style="color:'+(c.diff>0?'var(--am)':'var(--em)')+'">'+( c.diff!==undefined?(c.diff>0?'+':'')+c.diff:'--')+'</td></tr>');});});if(!rows.length)rows=['<tr><td colspan="6" style="text-align:center;color:var(--em);padding:12px">\u2713 No field changes</td></tr>'];mb.innerHTML=rows.join('');}
  var ac=document.getElementById('cmpAddCnt');if(ac)ac.textContent=diff.addedCnt;
  var ab=document.getElementById('cmpAddBody');
  if(ab)ab.innerHTML=(diff.added||[]).length?(diff.added||[]).slice(0,80).map(function(a){return'<tr><td class="mono">'+a.id+'</td><td class="nm">'+(a.name||'').slice(0,36)+'</td><td style="color:var(--em)">Added</td></tr>';}).join(''):'<tr><td colspan="3" style="text-align:center;color:var(--tx3);padding:8px">None</td></tr>';
  var rc=document.getElementById('cmpRemCnt');if(rc)rc.textContent=diff.removedCnt;
  var rb=document.getElementById('cmpRemBody');
  if(rb)rb.innerHTML=(diff.removed||[]).length?(diff.removed||[]).slice(0,80).map(function(a){return'<tr><td class="mono">'+a.id+'</td><td class="nm">'+(a.name||'').slice(0,36)+'</td><td style="color:var(--rd)">Removed</td></tr>';}).join(''):'<tr><td colspan="3" style="text-align:center;color:var(--tx3);padding:8px">None</td></tr>';
  setTimeout(initCmpFilters,80);
}

function renderCmpCritical(){
  if(!M1||!M2)return;
  var diff;try{diff=forensic(RAW1,RAW2);}catch(e){diff={slippage:[],newCritical:[],notCritical:[]};}
  var sl=diff.slippage||[];
  var slc=document.getElementById('cmpSlipCnt');if(slc)slc.textContent=sl.length;
  var slb=document.getElementById('cmpSlipBody');
  if(slb)slb.innerHTML=sl.length?sl.slice(0,100).map(function(a){var efCh=(a.changes||[]).find(function(c){return c.f==='EF';});var d=efCh?efCh.diff:0;return'<tr><td class="mono">'+a.id+'</td><td class="nm">'+(a.name||'').slice(0,42)+'</td><td class="mono">'+(efCh?fmtDate(efCh.from):'--')+'</td><td class="mono">'+(efCh?fmtDate(efCh.to):'--')+'</td><td class="num" style="color:var(--'+(d>0?'rd':'em')+');font-weight:700">'+(d>0?'+':'')+d+'d</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--em);padding:10px">\u2713 No slippage &gt;5d</td></tr>';
  var nc=diff.newCritical||[];
  var ncc=document.getElementById('cmpNewCritCnt');if(ncc)ncc.textContent=nc.length;
  var ncb=document.getElementById('cmpNewCritBody');
  if(ncb)ncb.innerHTML=nc.length?nc.slice(0,80).map(function(a){return'<tr><td class="mono">'+a.id+'</td><td class="nm">'+(a.name||'').slice(0,48)+'</td><td class="num" style="color:var(--rd)">Now Critical</td></tr>';}).join(''):'<tr><td colspan="3" style="text-align:center;color:var(--em);padding:10px">\u2713 None</td></tr>';
  var not=diff.notCritical||[];
  var rcc=document.getElementById('cmpRemCritCnt');if(rcc)rcc.textContent=not.length;
  var rcb=document.getElementById('cmpRemCritBody');
  if(rcb)rcb.innerHTML=not.length?not.slice(0,80).map(function(a){return'<tr><td class="mono">'+a.id+'</td><td class="nm">'+(a.name||'').slice(0,48)+'</td><td class="num" style="color:var(--em)">Cleared</td></tr>';}).join(''):'<tr><td colspan="3" style="text-align:center;color:var(--em);padding:10px">\u2713 None</td></tr>';
}

function renderCmpSchedule(){
  if(!M1||!M2)return;
  var diff;try{diff=forensic(RAW1,RAW2);}catch(e){diff={rA:0,rR:0,slippage:[]};}
  var pd=document.getElementById('cmpProgDetail');
  if(pd)pd.innerHTML='<div class="g4" style="margin-bottom:10px">'+kpi(((M1.prg&&M1.prg.w)||0).toFixed(1)+'%','XER1 Progress','am','weighted')+kpi(((M2.prg&&M2.prg.w)||0).toFixed(1)+'%','XER2 Progress','em','weighted')+kpi((((M2.prg&&M2.prg.w)||0)-((M1.prg&&M1.prg.w)||0)).toFixed(1)+'%','Delta','cy','')+kpi((diff.slippage||[]).length,'Slippage Events',(diff.slippage||[]).length?'rd':'em','')+'</div><div style="font-size:11px;color:var(--tx3);line-height:2">DD XER1: '+fmtDate((M1.project||{}).dd)+' \u2192 XER2: '+fmtDate((M2.project||{}).dd)+'<br>PE XER1: '+fmtDate((M1.project||{}).pe)+' \u2192 XER2: '+fmtDate((M2.project||{}).pe)+'</div>';
  var rd=document.getElementById('cmpRelDetail');
  if(rd)rd.innerHTML='<div class="g4">'+kpi('+'+(diff.rA||0),'Rels Added','em','')+kpi('-'+(diff.rR||0),'Rels Removed','rd','')+kpi((M1.rels&&M1.rels.tot)||0,'Total XER1','cy','')+kpi((M2.rels&&M2.rels.tot)||0,'Total XER2','cy','')+'</div>';
}

function renderCmpCompliance(){
  if(!M1||!M2)return;
  var de=document.getElementById('cmpDcmaList');
  if(de){var m1dm={};(M1.dcma||[]).forEach(function(c){m1dm[c.id]=c;});de.innerHTML=(M2.dcma||[]).map(function(c){var bc=m1dm[c.id];var st=c.pass?'PASS':c.warn?'WARN':'FAIL';var bst=bc?(bc.pass?'PASS':bc.warn?'WARN':'FAIL'):'--';var imp=bc&&((c.pass&&!bc.pass)||(c.warn&&!bc.pass&&!bc.warn));var wor=bc&&((!c.pass&&bc.pass)||(!c.warn&&!c.pass&&bc.warn));return'<div class="cmp-row">'+badge(st)+'<span class="cmp-nm">'+c.id+'. '+c.nm+'</span>'+(bc?'<span style="font-size:10px;color:var(--tx3);margin-left:auto">'+String(bc.val)+'</span>'+badge(bst)+'<span style="font-size:10px;margin-left:4px;color:'+(imp?'var(--em)':wor?'var(--rd)':'var(--tx3)')+'">'+( imp?'\u2191':wor?'\u2193':'=')+'</span>':'')+'</div>';}).join('');}
  var me=document.getElementById('cmpMatDetail');
  if(me){var dims=[['Logic',(M1.mat||{}).logic||0,(M2.mat||{}).logic||0,20],['Resources',(M1.mat||{}).resources||0,(M2.mat||{}).resources||0,15],['Float',(M1.mat||{}).float||0,(M2.mat||{}).float||0,15],['Relationships',(M1.mat||{}).relationships||0,(M2.mat||{}).relationships||0,15],['Constraints',(M1.mat||{}).constraints||0,(M2.mat||{}).constraints||0,10],['Durations',(M1.mat||{}).durations||0,(M2.mat||{}).durations||0,10],['OOS',(M1.mat||{}).oos||0,(M2.mat||{}).oos||0,10],['Baseline',(M1.mat||{}).baseline||0,(M2.mat||{}).baseline||0,5]];me.innerHTML='<div style="text-align:center;font-size:26px;font-weight:800;margin-bottom:10px">'+(M1.mat&&M1.mat.total||0)+'<span style="font-size:14px;color:var(--tx3)"> \u2192 </span><span style="color:'+((M2.mat&&M2.mat.total||0)>=(M1.mat&&M1.mat.total||0)?'var(--em)':'var(--rd)')+'">'+(M2.mat&&M2.mat.total||0)+'</span><span style="font-size:11px;color:var(--tx3)">/100</span></div>'+dims.map(function(d){var delta=d[2]-d[1];return'<div class="bar-row"><span class="bar-lbl">'+d[0]+'</span><div class="bar-t"><div class="bar-f" style="width:'+Math.round(d[2]/d[3]*100)+'%;background:'+(delta>=0?'var(--em)':'var(--rd)')+'"></div></div><span class="bar-val" style="color:'+(delta>0?'var(--em)':delta<0?'var(--rd)':'var(--tx3)')+'">'+d[1]+' \u2192 '+d[2]+'</span></div>';}).join('');}
}

function renderCmpMilestones(){
  if(!M1||!M2)return;
  var ms1={};(M1.keyMilestones||[]).forEach(function(m){ms1[m.id]=m;});
  var rows=[];
  (M2.keyMilestones||[]).forEach(function(m2){var m1=ms1[m2.id];var slip=null;if(m1&&m1.ef&&m2.ef){try{slip=Math.round((new Date(m2.ef)-new Date(m1.ef))/86400000);}catch(e){}}var ss=slip===null?'--':(slip>0?'+':'')+slip+'d';var sc=slip===null?'var(--tx3)':slip>0?'var(--rd)':slip<0?'var(--em)':'var(--tx3)';var stB=m2.st==='TK_Complete'?'<span class="badge b-pass">Done</span>':m2.st==='TK_Active'?'<span class="badge b-warn">Active</span>':'<span class="badge b-info">Pending</span>';rows.push('<tr><td class="mono">'+m2.id+'</td><td class="nm">'+(m2.name||'').slice(0,48)+'</td><td class="mono">'+(m1?fmtDate(m1.ef):'--')+'</td><td class="mono">'+fmtDate(m2.ef)+'</td><td class="num" style="color:'+sc+';font-weight:600">'+ss+'</td><td>'+stB+'</td></tr>');});
  var msb=document.getElementById('cmpMsBody');if(msb)msb.innerHTML=rows.length?rows.join(''):'<tr><td colspan="6" style="text-align:center;color:var(--tx3);padding:12px">No milestones</td></tr>';
}



// ── PLAN GRID, CLEAR FUNCTIONS, USER MENU ───────────────────────
function renderPlanGrid(){
  var grid=document.getElementById('planGrid');if(!grid)return;
  var keys=['day','week','month','annual'];
  grid.innerHTML=keys.map(function(k){
    var p=PLANS[k];
    var current=CURR_USER&&CURR_USER.plan===k;
    var feats=(p.features||[]).map(function(f){return '<li>'+f+'</li>';}).join('');
    var period=p.days===1?'day':p.days===7?'week':p.days===30?'month':'year';
    return '<div class="plan-card'+(p.popular?' popular':'')+(current?' current':'')+'" onclick="selectPlan(\''+k+'\')">'
      +(p.popular?'<div class="plan-badge">Most Popular</div>':'')
      +'<h3 class="plan-name">'+p.label+'</h3>'
      +'<div class="plan-price"><span class="amt">'+p.price+'</span><span class="per">/'+period+'</span></div>'
      +'<div class="plan-credits">'+(p.credits>=999999?'Unlimited':p.credits)+' credits</div>'
      +'<ul class="plan-feats">'+feats+'</ul>'
      +'<button class="plan-cta">'+(current?'Current Plan':'Choose '+p.label)+'</button>'
      +'</div>';
  }).join('');
}

function clearXer(){
  if(!confirm('Clear current XER analysis? You will need to upload again.'))return;
  RAW=null;M=null;EVM=null;BRAW=null;BM=null;BEVM=null;BFNAME='';STEP=0;
  var f1=document.getElementById('fi1');if(f1)f1.value='';
  var dz=document.getElementById('dzOrb1');if(dz)dz.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,1)" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>';
  var t=document.getElementById('dzT1');if(t)t.textContent='Drop your XER file here';
  setMode('single');goStep(0);
}

function clearCmpXer(){
  if(!confirm('Clear forensic comparison? Both XERs will be removed.'))return;
  RAW1=null;M1=null;F1='';RAW2=null;M2=null;F2='';
  var dz1=document.getElementById('cdz1');if(dz1)dz1.classList.remove('loaded');
  var dz2=document.getElementById('cdz2');if(dz2)dz2.classList.remove('loaded');
  var i1=document.getElementById('cico1');if(i1)i1.textContent=String.fromCodePoint(0x1F4C1);
  var i2=document.getElementById('cico2');if(i2)i2.textContent=String.fromCodePoint(0x1F4C1);
  var t1=document.getElementById('ctit1');if(t1)t1.textContent='Drop XER 1 here';
  var t2=document.getElementById('ctit2');if(t2)t2.textContent='Drop XER 2 here';
  var fp=document.getElementById('cmpFPreview');if(fp)fp.innerHTML='';
  var btn=document.getElementById('cmpBtn');if(btn)btn.style.opacity='0.35';
  setMode('compare');goStep(0);
}





function closeSubscribePage(){
  // Determine where to return: dashboard if XER loaded, else upload
  if(M||(M1&&M2)){
    if(MODE==='compare'&&M1&&M2)showPage('pgCmpCfg');
    else if(M)showPage('pgAnalysis');
    else showPage('pgUpload');
  }else{
    showPage('pgUpload');
  }
}

// Global Esc key handler for closable pages
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  var current=document.body.getAttribute('data-page');
  if(current==='pgSubscribe'){closeSubscribePage();}
  else if(current==='pgAdmin'){showPage('pgUpload');}
  // Also close user menu
  hideUserMenu();
});


