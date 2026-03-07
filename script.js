// ==========================
// ADMIN DASHBOARD JS (SIS-ready)
// ==========================

// -------------------
// Section Switching
// -------------------
function showSection(sectionId){
  document.querySelectorAll('.main .section').forEach(sec => sec.style.display='none');
  document.getElementById(sectionId).style.display='block';
  document.querySelectorAll('.sidebar a').forEach(link => link.classList.remove('active'));
  document.querySelector(`.sidebar a[onclick="showSection('${sectionId}')"]`)?.classList.add('active');
}

// -------------------
// Modals
// -------------------
function openModal(id){ document.getElementById(id).style.display='flex'; }
function closeModal(id){ document.getElementById(id).style.display='none'; }

// -------------------
// Audit Log
// -------------------
function addAudit(user, role, action){
  const logs = JSON.parse(localStorage.getItem('adminAudit')||'[]');
  logs.push({ time: new Date().toLocaleString(), user, role, action });
  localStorage.setItem('adminAudit', JSON.stringify(logs));
}

// -------------------
// Fetch Admin Data → Counselors + Assigned Students
// -------------------
async function fetchAdminData(){
  try {
    const res = await fetch('/api/editcounselor?action=counselors_with_students');
    const json = await res.json();
    if(!json.success) return { counselors: [] };
    return { counselors: json.counselors };
  } catch(err){ console.error(err); return { counselors: [] }; }
}

// -------------------
// Load & Render Dashboard
// -------------------
async function loadData(){
  const { counselors } = await fetchAdminData();

  // Counselors cards with assigned students
  const container = document.getElementById('counselorCards');
  container.innerHTML='';
  counselors.forEach(c=>{
    const studentsHTML = (c.students || []).map(s=>`
      <li>${s.first_name} ${s.last_name} (ID: ${s.student_id}, Grade: ${s.grade || '-'})</li>
    `).join('');

    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<h3>${c.name}</h3>
      <p>Email: ${c.email}</p>
      <p>Status: ${c.active ? 'Active' : 'Hidden'}</p>
      <p>Assigned Students (${(c.students||[]).length}):</p>
      <ul>${studentsHTML || '<li>No students assigned</li>'}</ul>
      <button class="btn" onclick="toggleCounselor(${c.id}, ${c.active})">${c.active ? 'Hide' : 'Show'}</button>`;
    container.appendChild(card);
  });
  document.getElementById('totalCounselors').innerText = counselors.length;

  // Populate student add dropdown dynamically
  populateCounselorDropdown(counselors);
}

// -------------------
// Toggle Counselor Active Status
// -------------------
async function toggleCounselor(id, currentStatus){
  try {
    const res = await fetch('/api/editcounselor', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_counselor', id, active:!currentStatus })
    });
    const data = await res.json();
    if(data.success) addAudit('Admin','Admin',`${currentStatus?'Hidden':'Activated'} counselor ID ${id}`);
    await loadData();
  } catch(err){ console.error(err); }
}

// -------------------
// Populate dropdown for adding students
// -------------------
function populateCounselorDropdown(counselors){
  const dropdown = document.getElementById('newStudentCounselor'); 
  if(!dropdown) return;
  dropdown.innerHTML='';
  counselors.filter(c=>c.active).forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id; // store counselor_id for assignments
    opt.textContent = c.name;
    dropdown.appendChild(opt);
  });
}

// -------------------
// Add / Remove / Manage Counselors
// -------------------
async function addCounselor(){
  const name = document.getElementById('newCounselorName').value;
  const email = document.getElementById('newCounselorEmail').value;
  if(!name||!email){ alert('Enter all fields'); return; }
  const username = email.split('@')[0];

  try {
    const res = await fetch('/api/counselors',{ 
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email,username})
    });
    const data = await res.json();
    if(data.success){
      addAudit('Admin','Admin',`Added counselor ${name}`);
      await loadData();
      closeModal('addCounselorModal');
    } else alert('Failed to add counselor');
  } catch(err){ console.error(err); alert('Network error'); }
}

// -------------------
// INIT
// -------------------
window.onload = async ()=>{
  await loadData();
  setInterval(loadData,5000);
};
