
const API = 'http://localhost:3000'; 

// Al cargar la página
const user = JSON.parse(localStorage.getItem('user'));
if (!user) showLogin();
else showDashboard();

// ------------------ SIDEBAR ------------------

function renderSidebar(user) {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <h3>👤 ${user.username}</h3>
    <nav>
      <button onclick="showDashboard()">🏠 Dashboard</button>
      ${user.role === 'visitor' ? `<button onclick="showMyEvents()">📅 Mis eventos</button>` : ''}
      ${(user.role === 'admin' || user.role === 'visitor') ? `<button onclick="showCreateEvent()">➕ Crear evento</button>` : ''}
      <button onclick="logout()">🚪 Cerrar sesión</button>
    </nav>
  `;
}

// ------------------ LOGIN ------------------

function showLogin() {
  document.getElementById('sidebar').innerHTML = '';
  document.getElementById('main').innerHTML = `
    <form id="loginForm" class="auth-form">
      <h2>Iniciar Sesión</h2>
      <input name="username" placeholder="Usuario" required />
      <input name="password" type="password" placeholder="Contraseña" required />
      <button type="submit">Entrar</button>
      <p>¿No tienes cuenta? <a href="#" onclick="showRegister()">Regístrate</a></p>
    </form>
  `;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const res = await fetch(`${API}/users?username=${data.username}&password=${data.password}`);
    const result = await res.json();
    if (result.length) {
      localStorage.setItem('user', JSON.stringify(result[0]));
      showDashboard();
    } else {
      alert('Credenciales incorrectas');
    }
  };
}


// ------------------ REGISTRO ------------------

function showRegister() {
  document.getElementById('sidebar').innerHTML = '';
  document.getElementById('main').innerHTML = `
    <form id="registerForm" class="auth-form">
      <h2>Registro</h2>
      <input name="username" placeholder="Usuario" required />
      <input name="password" type="password" placeholder="Contraseña" required />
      <select name="role">
        <option value="visitor">Visitante</option>
        <option value="admin">Administrador</option>
      </select>
      <button type="submit">Registrarse</button>
      <p>¿Ya tienes cuenta? <a href="#" onclick="showLogin()">Login</a></p>
    </form>
  `;
  document.getElementById('registerForm').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    alert('Registro exitoso');
    showLogin();
  };
}


// ------------------ DASHBOARD ------------------

function showDashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  renderSidebar(user);
  const main = document.getElementById('main');
  main.innerHTML = `
    <h2>Bienvenido, ${user.username} (${user.role})</h2>
    <div id="eventList"></div>
  `;
  loadEvents();
}

function logout() {
  localStorage.removeItem('user');
  showLogin();
}

// ------------------ LISTADO DE EVENTOS ------------------

async function loadEvents() {
  const user = JSON.parse(localStorage.getItem('user'));
  const container = document.getElementById('eventList');
  container.innerHTML = '<p>Cargando eventos...</p>';

  try {
    const res = await fetch(`${API}/events`);
    if (!res.ok) throw new Error('Error al cargar eventos');
    const events = await res.json();

    container.innerHTML = events.map(ev => {
      const inscritos = ev.attendees?.length || 0;
      const disponible = ev.capacidad - inscritos;
      const yaInscrito = ev.attendees?.includes(user.username);

      return `
        <div class="event-card">
          <strong>${ev.name}</strong><br>
          ${ev.description}<br>
          <small>Fecha: ${ev.fecha}</small><br>
          <small>Capacidad: ${ev.capacidad} | Inscritos: ${inscritos} | Disponibles: ${disponible}</small><br>
          ${user.role === 'admin' ? `
            <button onclick="deleteEvent(${ev.id})">Eliminar</button>
          ` : ''}
          ${user.role === 'visitor' && !yaInscrito && disponible > 0 ? `
            <button onclick="joinEvent(${ev.id})">Unirme</button>
          ` : user.role === 'visitor' && yaInscrito ? `
            <span class="success-tag">✅ Ya estás inscrito</span>
          ` : user.role === 'visitor' && disponible === 0 ? `
            <span class="full-tag">❌ Evento lleno</span>
          ` : ''}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error al cargar eventos:', error);
    container.innerHTML = '<p>Error al cargar eventos. Intenta nuevamente más tarde.</p>';
  }
}


// ------------------ CREAR EVENTO ------------------

function showCreateEvent() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <form id="createEventForm">
      <h3>Crear Evento</h3>
      <input name="name" placeholder="Nombre del evento" required />
      <textarea name="description" placeholder="Descripción" required></textarea>
      <input name="fecha" type="date" required />
      <input name="capacidad" type="number" min="1" placeholder="Capacidad máxima" required />
      <button type="submit">Crear</button>
    </form>
  `;

  document.getElementById('createEventForm').onsubmit = async e => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const data = Object.fromEntries(new FormData(e.target));
    data.owner = user.username;
    data.attendees = [];
    data.capacidad = parseInt(data.capacidad);

    await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    alert('Evento creado con éxito.');
    showDashboard();
  };
}

// ------------------ UNIRSE A EVENTO ------------------

async function joinEvent(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  const res = await fetch(`${API}/events/${id}`);
  const event = await res.json();

  if (event.attendees.includes(user.username)) {
    alert('Ya estás registrado en este evento.');
    return;
  }

  if (event.attendees.length >= event.capacidad) {
    alert('Este evento ya alcanzó su capacidad máxima.');
    return;
  }

  event.attendees.push(user.username);

  await fetch(`${API}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });

  alert(`¡Registro exitoso, ${user.username}!
Nos vemos el día del evento: ${event.fecha}`);
  showDashboard();
}

// ------------------ ELIMINAR EVENTO ------------------

async function deleteEvent(id) {
  console.log("Intentando eliminar evento con ID:", id);
  const confirmDelete = confirm('¿Estás seguro de eliminar este evento?');
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('No se pudo eliminar el evento');

    alert('✅ Evento eliminado correctamente');
    showDashboard();
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    alert('❌ Ocurrió un error al intentar eliminar el evento.');
  }
}


// ------------------ MIS EVENTOS ------------------

async function showMyEvents() {
  const user = JSON.parse(localStorage.getItem('user'));
  renderSidebar(user);
  const res = await fetch(`${API}/events`);
  const events = await res.json();
  const inscritos = events.filter(ev => ev.attendees?.includes(user.username));

  const main = document.getElementById('main');
  main.innerHTML = `
    <h2>Mis eventos</h2>
    <div id="eventList"></div>
  `;

  const container = document.getElementById('eventList');

  if (inscritos.length === 0) {
    container.innerHTML = `<p>No estás registrado en ningún evento aún.</p>`;
  } else {
    container.innerHTML = inscritos.map(ev => `
      <div class="event-card">
        <strong>${ev.name}</strong><br>
        ${ev.description}<br>
        <small>Fecha: ${ev.fecha}</small><br>
        <small>Capacidad: ${ev.capacidad} | Inscritos: ${ev.attendees.length}</small><br>
        <button onclick="cancelRegistration(${ev.id})">Cancelar inscripción</button>
      </div>
    `).join('');
  }
}

// ------------------ CANCELAR INSCRIPCIÓN ------------------

async function cancelRegistration(id) {
  const confirm = window.confirm('¿Estás seguro de cancelar tu inscripción a este evento?');
  if (!confirm) return;

  const user = JSON.parse(localStorage.getItem('user'));
  const res = await fetch(`${API}/events/${id}`);
  const event = await res.json();

  event.attendees = event.attendees.filter(nombre => nombre !== user.username);

  await fetch(`${API}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });

  alert('Has cancelado tu inscripción.');
  showMyEvents();
}

//----------------Mostrar/ocultar sidebar en móviles-----------------------------

    document.getElementById('menu-toggle').onclick = () => {
      document.getElementById('sidebar').classList.toggle('active');
    };