const API_BASE = "https://sis-api-smoky.vercel.app";

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
  document.getElementById(id)?.style && (document.getElementById(id).style.display='flex');
}

function closeModal(id){ 
  document.getElementById(id)?.style && (document.getElementById(id).style.display='none');
}

// -------------------
// Audit Log (frontend cache only for now)
// -------------------
function addAudit(user, role, action){
  const logs = JSON.parse(localStorage.getItem('adminAudit') || '[]');
  logs.push({ time: new Date().toISOString(), user, role, action });
  localStorage.setItem('adminAudit', JSON.stringify(logs));
}

// -------------------
// FETCH ADMIN DATA
// -------------------
async function fetchAdminData(){
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const school_id = user?.school_id;

    if (!school_id) throw new Error("Missing school_id");

    const res = await fetch(`${API_BASE}/api/admin/get-counselors?school_id=${school_id}`);
    const res2 = await fetch(`${API_BASE}/api/admin/get-students?school_id=${school_id}`);

    const counselorsRaw = await res.json();
    const studentsRaw = await res2.json();

    const counselors = Array.isArray(counselorsRaw)
      ? counselorsRaw
      : (counselorsRaw.data || []);

    const students = Array.isArray(studentsRaw)
      ? studentsRaw
      : (studentsRaw.data || []);

    const map = {};

    counselors.forEach(c => {
      map[c.id] = { ...c, students: [] };
    });

    students.forEach(s => {
      if (s.counselor_id && map[s.counselor_id]) {
        map[s.counselor_id].students.push(s);
      }
    });

    return { counselors: Object.values(map) };

  } catch(err){ 
    console.error("fetchAdminData error:", err); 
    return { counselors: [] }; 
  }
}

// -------------------
// LOAD DASHBOARD
// -------------------
async function loadData(){
  const { counselors } = await fetchAdminData();

  const container = document.getElementById('counselorCards');
  if (!container) return;

  container.innerHTML = '';

  counselors.forEach(c => {

    const studentsHTML = (c.students || []).map(s => `
      <li>${s.first_name} ${s.last_name} (ID: ${s.sis_student_id || s.student_id})</li>
    `).join('');

    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <h3>${c.name || "No Name"}</h3>
      <p>Email: ${c.email || "-"}</p>
      <p>Status: ${c.is_visible ? 'Active' : 'Hidden'}</p>

      <p>Assigned Students (${(c.students || []).length}):</p>
      <ul>${studentsHTML || '<li>No students assigned</li>'}</ul>

      <button class="btn" onclick="toggleCounselor('${c.id}', ${c.is_visible})">
        ${c.is_visible ? 'Hide' : 'Show'}
      </button>
    `;

    container.appendChild(card);
  });

  populateCounselorDropdown(counselors);

  const countBadge = document.getElementById('totalCounselors');
  if (countBadge) countBadge.innerText = counselors.length;
}

// -------------------
// TOGGLE COUNSELOR
// -------------------
async function toggleCounselor(id, currentStatus){
  try {
    const res = await fetch(`${API_BASE}/api/admin/edit-counselor`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        id,
        is_visible: !currentStatus
      })
    });

    const data = await res.json();

    if (data?.success || data?.id){
      addAudit('Admin','Admin',`${currentStatus ? 'Hidden' : 'Activated'} counselor`);
      await loadData();
    }

  } catch(err){ 
    console.error("toggleCounselor error:", err); 
  }
}

// -------------------
// DROPDOWN
// -------------------
function populateCounselorDropdown(counselors){
  const dropdown = document.getElementById('newStudentCounselor'); 
  if (!dropdown) return;

  dropdown.innerHTML = '';

  counselors
    .filter(c => c.is_visible === true)
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name || "Unnamed"} (${c.email})`;
      dropdown.appendChild(opt);
    });
}

// -------------------
// ADD COUNSELOR
// -------------------
async function addCounselor(){
  const name = document.getElementById('newCounselorName')?.value.trim();
  const email = document.getElementById('newCounselorEmail')?.value.trim();

  const user = JSON.parse(localStorage.getItem("user"));

  if (!name || !email){
    alert('Enter name and email');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/create-counselor`,{ 
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        name,
        email,
        password: "default123",
        school_id: user.school_id
      })
    });

    const data = await res.json();

    if (!data?.error){
      addAudit('Admin','Admin',`Added counselor ${name}`);
      await loadData();
      closeModal('addCounselorModal');
    } else {
      alert(data.error);
    }

  } catch(err){ 
    console.error("addCounselor error:", err); 
    alert('Error creating counselor'); 
  }
}

// -------------------
// INIT
// -------------------
window.onload = async () => {
  await loadData();
  setInterval(loadData, 5000);
};
