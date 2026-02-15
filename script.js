// ==========================
// ADMIN DASHBOARD JS (Updated)
// ==========================

// Storage keys (optional local copy / backup)
const STORAGE = { audit: 'adminAudit' };

// --------------------------
// Section Switching
// --------------------------
function showSection(sectionId){
  document.querySelectorAll('.main .section').forEach(sec => sec.style.display='none');
  document.getElementById(sectionId).style.display='block';
  document.querySelectorAll('.sidebar a').forEach(link => link.classList.remove('active'));
  document.querySelector(`.sidebar a[onclick="showSection('${sectionId}')"]`)?.classList.add('active');
}

// --------------------------
// Modals
// --------------------------
function openModal(id){ document.getElementById(id).style.display='flex'; }
function closeModal(id){ document.getElementById(id).style.display='none'; }

// --------------------------
// Audit Log
// --------------------------
function addAudit(user, role, action){
  const logs = JSON.parse(localStorage.getItem(STORAGE.audit) || '[]');
  logs.push({ time: new Date().toLocaleString(), user, role, action });
  localStorage.setItem(STORAGE.audit, JSON.stringify(logs));
}

// --------------------------
// Fetch Data from SIS API + merge student-side counselors
// --------------------------
async function fetchAdminData(){
  try {
    const [cRes, sRes, mRes] = await Promise.all([
      fetch('/api/counselors'),
      fetch('/api/students'),
      fetch('/api/messages')
    ]);
    let counselors = await cRes.json();
    const students = await sRes.json();
    const messages = await mRes.json();

    // Add unique counselors from student messages if missing
    messages.forEach(m => {
      if(m.counselor && !counselors.find(c => c.username === m.counselor)){
        counselors.push({ name: m.counselor, email: m.counselor+'@example.com', username: m.counselor });
      }
    });

    return { counselors, students, messages };
  } catch(err){
    console.error('Failed to fetch admin data', err);
    return { counselors: [], students: [], messages: [] };
  }
}

// --------------------------
// Load and Render Dashboard
// --------------------------
async function loadData(){
  const { counselors, students, messages } = await fetchAdminData();

  // ----- Counselors Cards -----
  const container = document.getElementById('counselorCards');
  container.innerHTML='';
  counselors.forEach(c => {
    const activeCrises = messages.filter(m => m.counselor === c.username && m.urgency==="I’m in Crisis").length;
    const assigned = students.filter(s => s.counselor === c.username).length;
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<h3>${c.name}</h3>
      <p>Assigned Students: ${assigned}</p>
      <p>Active Crises: ${activeCrises}</p>
      <button class="btn" onclick="manageCounselor('${c.username}')">Manage</button>
      <button class="btn btn-danger" onclick="removeCounselor('${c.username}')">Remove</button>`;
    container.appendChild(card);
  });
  document.getElementById('totalCounselors').innerText = counselors.length;

  // ----- Students Table -----
  const tbody = document.getElementById('studentTable');
  tbody.innerHTML='';
  students.forEach(s => {
    const crisisBadge = messages.find(m=>m.firstName+' '+m.lastName===s.name && m.urgency==="I’m in Crisis") ? '<span class="badge-red">Red</span>' : '';
    const row = document.createElement('tr');
    row.innerHTML = `<td>${s.name}</td><td>${s.grade}</td><td>${s.counselor}</td><td>${crisisBadge}</td>
      <td>
        <button class="btn" onclick="assignStudent('${s.name}')">Assign</button>
        <button class="btn btn-danger" onclick="archiveStudent('${s.name}')">Archive</button>
      </td>`;
    tbody.appendChild(row);
  });
  document.getElementById('totalStudents').innerText = students.length;
  document.getElementById('activeCrises').innerText = messages.filter(m=>m.urgency==="I’m in Crisis").length;

  // ----- Crisis Monitor -----
  const crisisContainer = document.getElementById('crisisCards');
  crisisContainer.innerHTML='';
  messages.filter(m => m.urgency==="I’m in Crisis").forEach(m=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<h3>${m.firstName} ${m.lastName} (Grade ${m.grade})</h3>
      <p>Counselor: ${m.counselor}</p>
      <p>Status: Unseen</p>
      <button class="btn" onclick="markReviewed('${m.firstName}','${m.lastName}')">Mark Reviewed</button>
      <button class="btn btn-danger" onclick="escalate('${m.firstName}','${m.lastName}')">Escalate</button>`;
    crisisContainer.appendChild(card);
  });
  document.getElementById('crisisCount').innerText = messages.filter(m=>m.urgency==="I’m in Crisis").length + ' Crises';

  // ----- Audit Log -----
  const auditTbody = document.getElementById('auditTable');
  auditTbody.innerHTML='';
  const auditLogs = JSON.parse(localStorage.getItem(STORAGE.audit)||'[]');
  auditLogs.forEach(a=>{
    const row = document.createElement('tr');
    row.innerHTML = `<td>${a.time}</td><td>${a.user}</td><td>${a.role}</td><td>${a.action}</td>`;
    auditTbody.appendChild(row);
  });
}

// --------------------------
// Add / Remove / Manage Counselors
// --------------------------
async function addCounselor(){
  const name = document.getElementById('newCounselorName').value;
  const email = document.getElementById('newCounselorEmail').value;
  if(!name || !email){ alert('Enter all fields'); return; }
  const username = email.split('@')[0];
  try {
    const res = await fetch('/api/counselors', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ name, email, username })
    });
    const data = await res.json();
    if(data.success){
      addAudit('Admin','Admin',`Added counselor ${name}`);
      await loadData();
      await populateCounselorDropdown();
      closeModal('addCounselorModal');
    } else alert('Failed to add counselor');
  } catch(err){ console.error(err); alert('Network error'); }
}

async function removeCounselor(username){
  if(!confirm(`Are you sure you want to remove ${username}?`)) return;
  try {
    const res = await fetch('/api/counselors/'+username, { method:'DELETE' });
    const data = await res.json();
    if(data.success){
      addAudit('Admin','Admin',`Removed counselor ${username}`);
      await loadData();
      await populateCounselorDropdown();
    } else alert('Failed to remove counselor');
  } catch(err){ console.error(err); alert('Network error'); }
}

async function addStudent(){
  const name = document.getElementById('newStudentName').value;
  const grade = document.getElementById('newStudentGrade').value;
  const counselor = document.getElementById('newStudentCounselor').value;
  if(!name || !grade || !counselor){ alert('Enter all fields'); return; }
  try {
    const res = await fetch('/api/students',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ name, grade, counselor })
    });
    const data = await res.json();
    if(data.success){
      addAudit('Admin','Admin',`Added student ${name} to ${counselor}`);
      await loadData();
      closeModal('addStudentModal');
    } else alert('Failed to add student');
  } catch(err){ console.error(err); alert('Network error'); }
}

// --------------------------
// Assign / Archive / Manage / Crisis actions (stubs)
// --------------------------
function manageCounselor(username){ alert('Manage '+username); }
function assignStudent(name){ alert('Assign '+name); }
function archiveStudent(name){ alert('Archive '+name); }
function markReviewed(first,last){ alert('Reviewed '+first+' '+last); }
function escalate(first,last){ alert('Escalate '+first+' '+last); }

// --------------------------
// Populate Counselor Dropdown for Students
// --------------------------
async function populateCounselorDropdown(){
  try {
    const res = await fetch('/api/counselors');
    const counselors = await res.json();
    const dropdown = document.getElementById('newStudentCounselor');
    dropdown.innerHTML='';
    counselors.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.username; opt.textContent = c.name;
      dropdown.appendChild(opt);
    });
  } catch(err){ console.error(err); }
}

// --------------------------
// INIT
// --------------------------
window.onload = async ()=>{
  await populateCounselorDropdown();
  await loadData();
  setInterval(loadData,5000); // refresh every 5s
};
