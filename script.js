// ==========================
// ADMIN DASHBOARD JS (CONNECTED)
// ==========================

const API_BASE = "https://YOUR-ADMIN-APP.vercel.app";

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
function openModal(id){ 
  const modal = document.getElementById(id);
  if(modal) modal.style.display='flex'; 
}
function closeModal(id){ 
  const modal = document.getElementById(id);
  if(modal) modal.style.display='none'; 
}

// -------------------
// Audit Log
// -------------------
function addAudit(user, role, action){
  const logs = JSON.parse(localStorage.getItem('adminAudit')||'[]');
  logs.push({ time: new Date().toLocaleString(), user, role, action });
  localStorage.setItem('adminAudit', JSON.stringify(logs));
}

// -------------------
// Fetch Admin Data
// -------------------
async function fetchAdminData(){
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const school_id = user?.school_id;

    // GET counselors
    const res = await fetch(`${API_BASE}/api/admin/get-counselors?school_id=${school_id}`);
    const counselors = await res.json();

    // GET students
    const res2 = await fetch(`${API_BASE}/api/admin/get-students?school_id=${school_id}`);
    const students = await res2.json();

    // Attach students to counselors
    const map = {};
    counselors.forEach(c => {
      map[c.id] = { ...c, students: [] };
    });

    students.forEach(s => {
      if (map[s.counselor_id]) {
        map[s.counselor_id].students.push(s);
      }
    });

    return { counselors: Object.values(map) };

  } catch(err){ 
    console.error(err); 
    return { counselors: [] }; 
  }
}

// -------------------
// Load & Render Dashboard
// -------------------
async function loadData(){
  const { counselors } = await fetchAdminData();

  const container = document.getElementById('counselorCards');
  if(container){
    container.innerHTML='';

    counselors.forEach(c=>{
      const studentsHTML = (c.students || []).map(s=>`
        <li>${s.first_name} ${s.last_name} (ID: ${s.student_id})</li>
      `).join('');

      const card = document.createElement('div');
      card.className='card';
      card.innerHTML = `
        <h3>${c.name}</h3>
        <p>Email: ${c.email}</p>
        <p>Status: ${c.is_visible ? 'Active' : 'Hidden'}</p>
        <p>Assigned Students (${(c.students||[]).length}):</p>
        <ul>${studentsHTML || '<li>No students assigned</li>'}</ul>
        <button class="btn" onclick="toggleCounselor('${c.id}', ${c.is_visible})">
          ${c.is_visible ? 'Hide' : 'Show'}
        </button>
      `;
      container.appendChild(card);
    });
  }

  populateCounselorDropdown(counselors);

  const countBadge = document.getElementById('totalCounselors');
  if(countBadge) countBadge.innerText = counselors.length;
}

// -------------------
// Toggle Counselor Visibility
// -------------------
async function toggleCounselor(id, currentStatus){
  try {
    const res = await fetch(`${API_BASE}/api/admin/edit-counselor`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        id,
        is_visible: !currentStatus
      })
    });

    const data = await res.json();

    if(data){
      addAudit('Admin','Admin',`${currentStatus?'Hidden':'Activated'} counselor`);
      await loadData();
    }

  } catch(err){ console.error(err); }
}

// -------------------
// Populate dropdown
// -------------------
function populateCounselorDropdown(counselors){
  const dropdown = document.getElementById('newStudentCounselor'); 
  if(!dropdown) return;

  dropdown.innerHTML='';

  counselors
    .filter(c=>c.is_visible)
    .forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.email})`;
      dropdown.appendChild(opt);
    });
}

// -------------------
// Add Counselor
// -------------------
async function addCounselor(){
  const name = document.getElementById('newCounselorName')?.value.trim();
  const email = document.getElementById('newCounselorEmail')?.value.trim();
  const password = "default123"; // you can improve later

  const user = JSON.parse(localStorage.getItem("user"));

  if(!name || !email){
    alert('Enter name and email');
    return;
  }

  try {
    await fetch(`${API_BASE}/api/admin/create-counselor`,{ 
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name,
        email,
        password,
        school_id: user.school_id
      })
    });

    addAudit('Admin','Admin',`Added counselor ${name}`);
    await loadData();

    closeModal('addCounselorModal');

  } catch(err){ 
    console.error(err); 
    alert('Error creating counselor'); 
  }
}

// -------------------
// INIT
// -------------------
window.onload = async ()=>{
  await loadData();
  setInterval(loadData,5000);
};
