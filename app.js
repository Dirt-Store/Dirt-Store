import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── Config ───────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDKKTRIOY7pU8pwQLtcp9KLc5_vZ1hujhQ",
    authDomain: "dirtstore-abe3b.firebaseapp.com",
    projectId: "dirtstore-abe3b",
    storageBucket: "dirtstore-abe3b.firebasestorage.app",
    messagingSenderId: "126536114565",
    appId: "1:126536114565:web:2b22f79697abe53355e4ec"
};

const DISCORD_SERVER_ID = "1409158681232281610";
const DISCORD_ROLE_ID   = "1452062936087531541";
const DISCORD_BOT_TOKEN = "MTQ5OTAxNzk0NzM0NjI0MzY5NQ.G2zve2.Ijyki0-CTOasSUtySBdxoiMRE1LRrE28gEO6Bc";
// ─── IMPORTANT: Move bot token to a backend/proxy in production ───

const app      = initializeApp(firebaseConfig);
const db       = getFirestore(app);
const auth     = getAuth(app);
const supabase = createClient(
    'https://nimidighcuwhsiuyuftg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbWlkaWdoY3V3aHNpdXl1ZnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTQxMDgsImV4cCI6MjA4OTE3MDEwOH0.MKgIaWwhj5dDLq5fo9VKWRdg9geeaID9E05BxSqmB40'
);

let products = [];

// ─── Loading bar ──────────────────────────────────────────
function triggerLoading(callback) {
    const overlay = document.getElementById('loader');
    const bar     = document.getElementById('loadBar');
    overlay.classList.add('active');
    bar.style.width = '0%';
    let w = 0;
    const iv = setInterval(() => {
        w += 20; bar.style.width = w + '%';
        if (w >= 100) { clearInterval(iv); setTimeout(() => { callback(); overlay.classList.remove('active'); }, 300); }
    }, 50);
}

// ─── Navigation ───────────────────────────────────────────
window.navTo = (id) => {
    document.querySelectorAll('.section-view').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('sidebar').classList.remove('open');
};

document.getElementById('openBtn').onclick  = () => document.getElementById('sidebar').classList.add('open');
document.getElementById('closeBtn').onclick = () => document.getElementById('sidebar').classList.remove('open');

// ─── Auth ─────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    ['navUpload','navManage','btnLogout'].forEach(id =>
        document.getElementById(id).classList.toggle('hidden', !user)
    );
    document.getElementById('navLogin').classList.toggle('hidden', !!user);
    if (user) fetchAdmins();
});

document.getElementById('doLogin').onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('emailInp').value, document.getElementById('passInp').value);
        navTo('secStore');
    } catch { alert("Access Denied"); }
};

document.getElementById('btnLogout').onclick = () => signOut(auth);

// ─── Admin Panel ──────────────────────────────────────────
async function fetchAdmins() {
    onSnapshot(collection(db, "admins"), snap => {
        const c = document.getElementById('adminRows');
        c.innerHTML = "";
        snap.forEach(a => {
            c.innerHTML += `<div style="display:flex;justify-content:space-between;padding:15px;background:rgba(255,255,255,0.03);margin-top:8px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
                <span>${a.data().email}</span>
                <button onclick="delAdmin('${a.id}')" style="color:var(--danger);border:none;background:none;cursor:pointer;font-weight:bold;">Revoke</button>
            </div>`;
        });
    });
}

window.delAdmin = async (id) => {
    if (confirm("Revoke admin?")) await deleteDoc(doc(db, "admins", id));
};

document.getElementById('doAddAdmin').onclick = async () => {
    const email = document.getElementById('admEmail').value;
    if (!email) return;
    try { await addDoc(collection(db, "admins"), { email }); alert("Registered."); } catch {}
};

// ─── Upload form ──────────────────────────────────────────
window.adjustUploadForm = (v) => {
    document.getElementById('assetCode').classList.toggle('hidden', v !== 'code');
    document.getElementById('fileLabel').classList.toggle('hidden', v === 'code' || v === 'photo' || v === 'role');
};

window.toggleCreate = (show) => {
    document.getElementById('listView').classList.toggle('hidden', show);
    document.getElementById('createView').classList.toggle('hidden', !show);
};

document.getElementById('doPublish').onclick = async () => {
    const name    = document.getElementById('assetName').value;
    const price   = document.getElementById('assetPrice').value;
    const type    = document.getElementById('assetType').value;
    const code    = document.getElementById('assetCode').value;
    const imgFile = document.getElementById('assetImgFile').files[0];
    const assetFile = document.getElementById('assetFile').files[0];
    if (!name || !imgFile) return alert("Required fields missing!");

    triggerLoading(async () => {
        const imgPath = `thumbs/${Date.now()}_${imgFile.name}`;
        await supabase.storage.from('dirt-assets').upload(imgPath, imgFile);
        const thumbUrl = (await supabase.storage.from('dirt-assets').getPublicUrl(imgPath)).data.publicUrl;

        let fUrl = "", fPath = "";
        if (assetFile && type !== 'code' && type !== 'photo' && type !== 'role') {
            fPath = `assets/${Date.now()}_${assetFile.name}`;
            await supabase.storage.from('dirt-assets').upload(fPath, assetFile);
            fUrl  = (await supabase.storage.from('dirt-assets').getPublicUrl(fPath)).data.publicUrl;
        }

        await addDoc(collection(db, "products"), {
            name, price: Number(price), type, img: thumbUrl,
            codeData: code, file: fUrl, filePath: fPath,
            downloads: 0, createdAt: new Date()
        });
        toggleCreate(false);
    });
};

// ─── Market render ────────────────────────────────────────
function renderMarket() {
    const grid   = document.getElementById('marketGrid');
    const myList = document.getElementById('myProductsList');
    const search = document.getElementById('mainSearch').value.toLowerCase();
    grid.innerHTML = ""; if (myList) myList.innerHTML = "";

    products.forEach(p => {
        if (auth.currentUser && myList) {
            myList.innerHTML += `<div style="display:flex;justify-content:space-between;padding:12px;background:rgba(0,0,0,0.3);margin-top:8px;border-radius:15px;border:1px solid rgba(255,255,255,0.05);">
                <span>${p.name}</span>
                <button onclick="delProduct('${p.id}','${p.filePath}')" style="color:var(--danger);border:none;background:none;cursor:pointer;">Delete</button>
            </div>`;
        }

        if (!p.name.toLowerCase().includes(search)) return;

        const pVal    = p.price == 0 ? "FREE" : '$' + p.price;
        const isRole  = p.type === 'role';
        const roleBadge = isRole ? `<div class="role-badge">🎖️ Discord Role</div>` : '';
        const btnLabel  = isRole ? '🎮 Add Role' : 'Get Now';
        const btnAction = isRole
            ? `openRoleModal('${p.id}')`
            : `handleDownload('${p.id}','${p.file}','${p.type}','${encodeURIComponent(p.codeData || '')}')`;

        grid.innerHTML += `
            <div class="item-card">
                ${roleBadge}
                <img src="${p.img}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h3 style="margin:0;">${p.name}</h3>
                    <span class="price-tag">${pVal}</span>
                </div>
                <button class="btn" onclick="${btnAction}">${btnLabel}</button>
                <div class="get-counter">✨ ${p.downloads || 0} got this</div>
            </div>`;
    });
}

// ─── Regular download ─────────────────────────────────────
window.handleDownload = (id, url, type, code) => {
    const key = `got_${id}`;
    if (!localStorage.getItem(key)) {
        updateDoc(doc(db, "products", id), { downloads: increment(1) });
        localStorage.setItem(key, "true");
    }
    if (type === 'code') {
        navigator.clipboard.writeText(decodeURIComponent(code));
        alert("Code copied!");
    } else {
        window.location.href = url;
    }
};

window.delProduct = async (id, path) => {
    if (confirm("Delete?")) {
        await deleteDoc(doc(db, "products", id));
        if (path) await supabase.storage.from('dirt-assets').remove([path]);
    }
};

// ─── Discord Role System ──────────────────────────────────
let currentRoleProductId = null;

window.openRoleModal = (productId) => {
    currentRoleProductId = productId;
    document.getElementById('discordUsername').value = '';
    setStatus('', '');
    document.getElementById('roleModal').classList.remove('hidden');
};

document.getElementById('cancelRole').onclick = () => {
    document.getElementById('roleModal').classList.add('hidden');
    currentRoleProductId = null;
};

// Close modal on backdrop click
document.getElementById('roleModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('roleModal')) {
        document.getElementById('roleModal').classList.add('hidden');
        currentRoleProductId = null;
    }
});

document.getElementById('confirmRole').onclick = async () => {
    const username = document.getElementById('discordUsername').value.trim();
    if (!username) { setStatus('⚠️ Please enter your Discord username', 'error'); return; }

    const btn = document.getElementById('confirmRole');
    btn.disabled = true;
    setStatus('<span class="spinner"></span> Looking up your account...', 'loading');

    try {
        // Step 1: Search for user in the guild
        const membersRes = await fetch(
            `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/search?query=${encodeURIComponent(username)}&limit=5`,
            { headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
        );

        if (!membersRes.ok) throw new Error('Failed to search members');
        const members = await membersRes.json();

        if (!members || members.length === 0) {
            setStatus('❌ User not found in the server. Make sure you are in the Discord server first.', 'error');
            btn.disabled = false;
            return;
        }

        // Match by username (handle both old user#1234 and new @username format)
        const cleanInput = username.replace('@', '').split('#')[0].toLowerCase();
        const member = members.find(m =>
            m.user.username.toLowerCase() === cleanInput ||
            (m.user.global_name && m.user.global_name.toLowerCase() === cleanInput) ||
            m.nick?.toLowerCase() === cleanInput
        ) || members[0]; // fallback to first result

        const userId = member.user.id;
        const displayName = member.user.global_name || member.user.username;

        setStatus(`<span class="spinner"></span> Found <b>${displayName}</b> — assigning role...`, 'loading');

        // Check if already has the role
        if (member.roles && member.roles.includes(DISCORD_ROLE_ID)) {
            setStatus(`✅ <b>${displayName}</b> already has this role!`, 'success');
            btn.disabled = false;
            // Still count the download
            countPurchase(currentRoleProductId);
            return;
        }

        // Step 2: Add the role
        const addRes = await fetch(
            `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/${userId}/roles/${DISCORD_ROLE_ID}`,
            { method: 'PUT', headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
        );

        if (addRes.status === 204 || addRes.ok) {
            setStatus(`🎉 Role given to <b>${displayName}</b> successfully! Check your Discord.`, 'success');
            countPurchase(currentRoleProductId);

            // Auto close after 3 seconds
            setTimeout(() => {
                document.getElementById('roleModal').classList.add('hidden');
                currentRoleProductId = null;
            }, 3000);
        } else {
            const err = await addRes.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${addRes.status}`);
        }

    } catch (e) {
        console.error(e);
        setStatus(`❌ Error: ${e.message}. Make sure the bot is in the server with Manage Roles permission.`, 'error');
    }

    btn.disabled = false;
};

function setStatus(msg, type) {
    const el = document.getElementById('roleStatus');
    el.innerHTML = msg;
    el.className = 'role-status';
    if (type) { el.classList.add(type); el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
}

function countPurchase(productId) {
    if (!productId) return;
    const key = `got_${productId}`;
    if (!localStorage.getItem(key)) {
        updateDoc(doc(db, "products", productId), { downloads: increment(1) });
        localStorage.setItem(key, "true");
    }
}

// ─── Realtime products ────────────────────────────────────
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMarket();
});

document.getElementById('mainSearch').oninput = renderMarket;
