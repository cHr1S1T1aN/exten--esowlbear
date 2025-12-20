import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
/*function showSuccessMessage(message: string) {
  const content = document.getElementById("gm-content");
  if (!content) return;

  const msg = document.createElement("div");
  msg.className = "success-message";
  msg.textContent = message;

  content.prepend(msg);

  setTimeout(() => {
    msg.remove();
  }, 2500);
}*/
const METADATA_KEY = "skills-extension";

type SkillType = "ativa" | "passiva" | "ultimate";

type Skill = {
  id: string;
  name: string;
  type: SkillType;
  description: string;
  manaCost?: number;
  cooldown?: number;
};

type SkillHistoryEntry = {
  id: string;
  skillId: string;
  skillName: string;
  action: "use" | "edit";
  skillType: SkillType; // 👈 ADICIONAR ISSO
  usedAt: number;
};


type SkillsMetadata = {
  players: {
    [playerId: string]: Skill[];
  };
  history?: {
    [playerId: string]: SkillHistoryEntry[];
  };
};

/*async function getSkillsMetadata(): Promise<SkillsMetadata> {
  const metadata = await OBR.room.getMetadata();

  if (!metadata[METADATA_KEY]) {
    const initialData: SkillsMetadata = { players: {} };

    await OBR.room.setMetadata({
      ...metadata,
      [METADATA_KEY]: initialData,
    });

    return initialData;
  }

  return metadata[METADATA_KEY] as SkillsMetadata;
}*/

async function saveSkillForPlayer(playerId: string, skill: Skill) {
  const metadata = await OBR.room.getMetadata();
  const skillsData = (metadata[METADATA_KEY] ??
    { players: {} }) as SkillsMetadata;

  if (!skillsData.players[playerId]) {
    skillsData.players[playerId] = [];
  }

  skillsData.players[playerId].push(skill);

  await OBR.room.setMetadata({
    ...metadata,
    [METADATA_KEY]: skillsData,
  });
}
async function useSkill(playerId: string, skill: Skill) {
  const metadata = await OBR.room.getMetadata();

  const skillsData = (metadata[METADATA_KEY] ??
    { players: {}, history: {} }) as SkillsMetadata;

  if (!skillsData.history) {
    skillsData.history = {};
  }

  if (!skillsData.history[playerId]) {
    skillsData.history[playerId] = [];
  }

  skillsData.history[playerId].push({
  id: crypto.randomUUID(),
  skillId: skill.id,
  action: "use",
  skillName: skill.name,
  skillType: skill.type, // 👈 ESSENCIAL
  usedAt: Date.now(),
});



  await OBR.room.setMetadata({
    ...metadata,
    [METADATA_KEY]: skillsData,
  });
}

OBR.onReady(async () => {
  // 1️⃣ Role
  const role = await OBR.player.getRole();
  const isGM = role === "GM";
console.log("ROLE DETECTADA:", role);


  const app = document.getElementById("app")!;

  // 2️⃣ Estrutura base
  app.innerHTML = `
    <div class="skills-header">
    <h2>Skills</h2>
  </div>
    <div id="gm-controls"></div>

    <div id="skills-session" style="display: none;">
      <div id="session-content"></div>
    </div>
  `;

  // 3️⃣ Botão Start (só GM)
  if (isGM) {
    const controls = document.getElementById("gm-controls")!;
    const startButton = document.createElement("button");

    startButton.textContent = "Start Skills";
    startButton.className = "start-skills-btn"; // 👈 AQUI
    startButton.addEventListener("click", () => openSkillsSession(isGM));

    controls.appendChild(startButton);
  } else {
    // Player entra direto
    openSkillsSession(isGM);
  }
let gmHistoryFilter: SkillType = "ativa";

  // 4️⃣ Router de sessão
  function openSkillsSession(isGM: boolean) {
    const session = document.getElementById("skills-session")!;
    session.style.display = "block";

    const content = document.getElementById("session-content")!;
    content.innerHTML = "";

    if (isGM) {
      renderGMSession(content);
    } else {
      renderPlayerSession(content);
    }
  }

async function openEditSkills(playerId: string, playerName: string) {
  const content = document.getElementById("gm-content")!;
  const metadata = await OBR.room.getMetadata();
  const skills =
    (metadata[METADATA_KEY] as SkillsMetadata)?.players[playerId] ?? [];

  content.innerHTML = `
    <h3>✏️ Editar Skillssss — ${playerName}</h3>
    <div class="edit-skills-list"></div>
    <button class="back-btn" id="back-to-players">⬅ Voltar</button>
  `;

  const list = content.querySelector(".edit-skills-list") as HTMLElement;

  if (skills.length === 0) {
    list.innerHTML = `<p>(nenhuma skill)</p>`;
    return;
  }

  skills.forEach(skill => {
    const row = document.createElement("div");
    row.className = "edit-skill-row";

    row.innerHTML = `
      <div class="skill-info">
        <strong>${skill.name}</strong>
        <small class="skill-type">${skill.type}</small>
      </div>

      <div class="skill-actions">
        <button class="icon-btn edit">✏️</button>
      </div>
    `;

    row
      .querySelector(".edit")!
      .addEventListener("click", () => {
        openEditSkillForm(playerId, skill);
      });

    list.appendChild(row);
  });

  document
    .getElementById("back-to-players")
    ?.addEventListener("click", () => {
      renderGMContent("players");
    });
}

async function openEditSkillForm(
  playerId: string,
  skill: Skill
) {
  const content = document.getElementById("gm-content")!;

  content.innerHTML = `
    <h3>✏️ Editar Skill — ${skill.name}</h3>

    <form id="skill-form" class="skill-form">
      <label>
        Nome da Skill
        <input type="text" id="skill-name" value="${skill.name}" required />
      </label>

      <label>
        Tipo
        <select id="skill-type">
          <option value="ativa" ${skill.type === "ativa" ? "selected" : ""}>Ativa</option>
          <option value="passiva" ${skill.type === "passiva" ? "selected" : ""}>Passiva</option>
          <option value="ultimate" ${skill.type === "ultimate" ? "selected" : ""}>Ultimate</option>
        </select>
      </label>

      <label>
        Descrição
        <textarea id="skill-description">${skill.description}</textarea>
      </label>

      <label>
        Custo de Mana
        <input type="number" id="skill-mana" value="${skill.manaCost ?? ""}" />
      </label>

      <label>
        Cooldown
        <input type="number" id="skill-cooldown" value="${skill.cooldown ?? ""}" />
      </label>

      <div class="form-actions">
        <button type="submit">💾 Salvar Alterações</button>
        <button type="button" id="cancel-edit">Cancelar</button>
      </div>
    </form>
  `;

  const form = document.getElementById("skill-form") as HTMLFormElement;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    await updateSkillForPlayer(playerId, {
      ...skill,
      name: (document.getElementById("skill-name") as HTMLInputElement).value,
      type: (document.getElementById("skill-type") as HTMLSelectElement)
        .value as SkillType,
      description: (document.getElementById("skill-description") as HTMLTextAreaElement).value,
      manaCost: Number((document.getElementById("skill-mana") as HTMLInputElement).value) || undefined,
      cooldown: Number((document.getElementById("skill-cooldown") as HTMLInputElement).value) || undefined,
    });

    renderGMContent("players");
  });

  document
    .getElementById("cancel-edit")!
    .addEventListener("click", () => {
      renderGMContent("players");
    });
}
async function updateSkillForPlayer(playerId: string, updatedSkill: Skill) {
  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata;

  const skills = skillsData.players[playerId];

  const index = skills.findIndex(s => s.id === updatedSkill.id);
  if (index === -1) return;

  skills[index] = updatedSkill;

  await OBR.room.setMetadata({
    ...metadata,
    [METADATA_KEY]: skillsData,
  });
}



async function openDeleteSkills(playerId: string, playerName: string) {
  const content = document.getElementById("gm-content")!;
  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata | undefined;

  const skills = skillsData?.players[playerId] ?? [];

  content.innerHTML = `
    <h3>🗑️ Apagar Skills — ${playerName}</h3>

    ${
      skills.length === 0
        ? "<p>(esse player não possui skills)</p>"
        : `<ul class="delete-skills-list"></ul>`
    }

    <button id="back-to-players">⬅ Voltar</button>
  `;

  const backBtn = document.getElementById("back-to-players");
  backBtn?.addEventListener("click", () => {
    renderGMContent("players");
  });

  if (skills.length === 0) return;

  const list = content.querySelector(
    ".delete-skills-list"
  ) as HTMLUListElement;

  skills.forEach(skill => {
    const li = document.createElement("li");
    li.className = "delete-skill-item";

    li.innerHTML = `
      <span>
        <strong>${skill.name}</strong>
        <small>(${skill.type})</small>
      </span>

      <button class="delete-btn">🗑️</button>
    `;

    const deleteBtn = li.querySelector(
      ".delete-btn"
    ) as HTMLButtonElement;

    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = confirm(
        `Tem certeza que deseja apagar a skill "${skill.name}"?`
      );

      if (!confirmDelete) return;

      await deleteSkillForPlayer(playerId, skill.id);

      // feedback visual simples
      li.remove();

      if (list.children.length === 0) {
        list.innerHTML = "<p>(todas as skills foram apagadas)</p>";
      }
    });

    list.appendChild(li);
  });
}

async function deleteSkillForPlayer(playerId: string, skillId: string) {
  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata | undefined;

  if (!skillsData?.players[playerId]) return;

  skillsData.players[playerId] =
    skillsData.players[playerId].filter(skill => skill.id !== skillId);

  await OBR.room.setMetadata({
    ...metadata,
    [METADATA_KEY]: skillsData,
  });
}

  async function renderGMSession(container: HTMLElement) {
  container.innerHTML = `
    <div class="gm-layout">
      <div class="gm-menu">
        <button class="gm-tab active" data-view="players">👥 Players</button>
        <button class="gm-tab" data-view="history">📜 Histórico</button>
        <button class="gm-tab" data-view="events">🌍 Eventos</button>
      </div>

      <div class="gm-content" id="gm-content"></div>
    </div>
  `;

  bindGMMenuEvents();
  renderGMContent("players");
}
function bindGMMenuEvents() {
  const buttons = document.querySelectorAll(".gm-tab");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      button.classList.add("active");

      const view = button.getAttribute("data-view") as
        | "players"
        | "history"
        | "events";

      renderGMContent(view);
    });
  });
}
async function renderGMContent(
  view: "players" | "history" | "events"
) {
  const content = document.getElementById("gm-content")!;

 if (view === "players") {
  content.innerHTML = `
    <h3>👥 Players</h3>
    <ul id="players-list" class="players-list"></ul>
  `;

  const players = await OBR.party.getPlayers();
  const list = document.getElementById("players-list")!;

  players.forEach(player => {
  const li = document.createElement("li");
  li.style.display = "flex";
  li.style.justifyContent = "space-between";
  li.style.alignItems = "center";
  li.style.gap = "8px";

  const name = document.createElement("span");
  name.textContent =
    player.role === "GM"
      ? `${player.name} (GM)`
      : player.name;

  const actions = document.createElement("div");
actions.className = "player-actions";

/* ➕ ADD */

const addBtn = document.createElement("button");
addBtn.textContent = "➕";
addBtn.title = "Adicionar Skill";
addBtn.className = "icon-btn add";
addBtn.disabled = player.role === "GM";
addBtn.addEventListener("click", () => {
  onAddSkillClick(player.id, player.name);
});

   /* ✏️ EDIT */
const editBtn = document.createElement("button");
editBtn.textContent = "✏️";
editBtn.title = "Editar Skills";
editBtn.className = "icon-btn edit";
editBtn.disabled = player.role === "GM";
editBtn.addEventListener("click", () => {
  openEditSkills(player.id, player.name);
});

    /* 🗑️ DELETE */
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Apagar Skills";
      deleteBtn.className = "icon-btn delete";
      deleteBtn.disabled = player.role === "GM";
      deleteBtn.addEventListener("click", () => {
        openDeleteSkills(player.id, player.name);
      });

    actions.appendChild(addBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(name);
    li.appendChild(actions);

  list.appendChild(li);
});
}

  if (view === "history") {
  content.innerHTML = `
    <h3>📜 Histórico de Skills</h3>

    <div class="history-filters">
      <button class="filter-btn active" data-type="ativa">⚔️ Ativas</button>
      <button class="filter-btn" data-type="passiva">🛡️ Passivas</button>
      <button class="filter-btn" data-type="ultimate">🔥 Ultimates</button>
    </div>

    <div id="history-list"></div>
  `;

  const buttons =
  content.querySelectorAll<HTMLButtonElement>(".filter-btn");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    gmHistoryFilter = btn.dataset.type as SkillType;
    renderGMHistory();
  });
});

  renderGMHistory(); // primeira renderização
}
async function renderGMHistory() {
  const container = document.getElementById("history-list")!;
  container.innerHTML = "";

  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata | undefined;

  if (!skillsData) {
    container.innerHTML = `<p>(sem dados)</p>`;
    return;
  }

  const players = await OBR.party.getPlayers();

  players.forEach(player => {
    const history = skillsData.history?.[player.id] ?? [];
    const skills = skillsData.players[player.id] ?? [];

    let entries: HTMLElement[] = [];

    /* 🛡️ PASSIVAS — SEMPRE MOSTRAR */
    if (gmHistoryFilter === "passiva") {
      const passivas = skills.filter(s => s.type === "passiva");

      passivas.forEach(skill => {
        const div = document.createElement("div");
        div.className = "history-entry passive";

        div.innerHTML = `
        <strong>${skill.name}</strong>
        <small class="passive-desc">
          🛡️ ${skill.description || "Passiva sempre ativa"}
        </small>
      `;



        entries.push(div);
      });
    }

    /* ⚔️ ATIVAS / 🔥 ULTIMATES — USADAS */
    else {
      const FIFTEEN_MINUTES = 15 * 60 * 1000;

const now = Date.now();

history
  .filter(entry =>
    entry.skillType === gmHistoryFilter &&
    now - entry.usedAt <= FIFTEEN_MINUTES
  )
  .slice()
  .reverse()
  .forEach(entry => {
    const div = document.createElement("div");
    div.className = "history-entry";

    const label =
      entry.action === "edit"
        ? "✏️ skill editada em"
        : entry.skillType === "ultimate"
        ? "🔥 skill usada em"
        : "⚡ skill usada em";

    div.innerHTML = `
      <strong>${entry.skillName}</strong>
      <small>
        ${label} ${new Date(entry.usedAt).toLocaleString()}
      </small>
    `;

    entries.push(div);
  });

    }

    if (entries.length === 0) return;

    const section = document.createElement("section");
    section.className = "gm-history-section";
    section.innerHTML = `<h4>👤 ${player.name}</h4>`;

    entries.forEach(e => section.appendChild(e));
    container.appendChild(section);
  });
}

  if (view === "events") {
    content.innerHTML = `
      <h3>🌍 Eventos Globais</h3>
      <div>(em breve)</div>
    `;
  }
}
async function onAddSkillClick(playerId: string, playerName: string) {
  const content = document.getElementById("gm-content")!;
  
  content.innerHTML = `
    <h3>➕ Nova Skill para ${playerName}</h3>

    <form id="skill-form" class="skill-form">
      <label>
        Nome da Skill
        <input type="text" id="skill-name" required />
      </label>

      <label>
        Tipo
        <select id="skill-type">
          <option value="ativa">Ativa</option>
          <option value="passiva">Passiva</option>
          <option value="ultimate">Ultimate</option>
        </select>
      </label>

      <label>
        Descrição
        <textarea id="skill-description"></textarea>
      </label>

      <label>
        Custo de Mana
        <input type="number" id="skill-mana" min="0" />
      </label>

      <label>
        Cooldown
        <input type="number" id="skill-cooldown" min="0" />
      </label>

      <div class="form-actions">
        <button type="submit">💾 Salvar Skill</button>
        <button type="button" id="cancel-skill">Cancelar</button>
      </div>
    </form>
  `;

  const form = document.getElementById("skill-form") as HTMLFormElement;

  form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const skill: Skill = {
  id: crypto.randomUUID(),
  name: (document.getElementById("skill-name") as HTMLInputElement).value,
  type: (document.getElementById("skill-type") as HTMLSelectElement)
    .value as SkillType,
  description: (document.getElementById("skill-description") as HTMLTextAreaElement).value,
  manaCost: Number((document.getElementById("skill-mana") as HTMLInputElement).value) || undefined,
  cooldown: Number((document.getElementById("skill-cooldown") as HTMLInputElement).value) || undefined,
};


  await saveSkillForPlayer(playerId, skill);

// limpa o formulário e mostra feedback
content.innerHTML = `
  <div class="success-message">
    ✅ Skill criada com sucesso!
  </div>
`;

// volta pra lista depois de 1.5s
setTimeout(() => {
  renderGMContent("players");
}, 1500);

});

  document
    .getElementById("cancel-skill")!
    .addEventListener("click", () => {
      renderGMContent("players");
    });
}


  // 6️⃣ Sessão do Player
 async function renderPlayerSession(container: HTMLElement) {
  container.innerHTML = `
    <div class="player-layout">
      <div class="player-tabs">
        <button class="player-tab active" data-view="skills">📘 Skills</button>
        <button class="player-tab" data-view="history">📜 Histórico</button>
      </div>

      <div class="player-content" id="player-content"></div>
    </div>
  `;

  bindPlayerTabs();
  renderPlayerContent("skills");
}
function bindPlayerTabs() {
  const tabs = document.querySelectorAll(".player-tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const view = tab.getAttribute("data-view") as
        | "skills"
        | "history";

      renderPlayerContent(view);
    });
  });
}
function showToast(message: string, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;

  document.body.appendChild(toast);

  // força reflow pra animação funcionar
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createSkillCard(
  skill: Skill,
  options: {
    showUseButton?: boolean;
    onUse?: () => void;
    showEditButton?: boolean;
    onEdit?: () => void;
  } = {}
) {
  const div = document.createElement("div");

  // classe base + tipo (ativa/passiva/ultimate)
  div.className = `skill-card ${skill.type}`;

  div.innerHTML = `
    <div class="skill-header">
      <span class="skill-name">${skill.name}</span>
      <span class="skill-badge ${skill.type}">
        ${skill.type}
      </span>
    </div>

    <p>${skill.description}</p>

    <div class="skill-info">
      ${
        skill.manaCost !== undefined
          ? `<div class="skill-stat">🔥 Mana: ${skill.manaCost}</div>`
          : ""
      }
      ${
        skill.cooldown !== undefined
          ? `<div class="skill-stat">⏱ Cooldown: ${skill.cooldown}</div>`
          : ""
      }
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "skill-actions";

  /* ⚡ USAR */
  if (options.showUseButton) {
    const useBtn = document.createElement("button");
    useBtn.textContent = "⚡ Usar";
    useBtn.className = "use-skill-btn";

    useBtn.onclick = () => {
      options.onUse?.();
      showToast(`⚡ ${skill.name} foi usada`);
    };

    actions.appendChild(useBtn);
  }

  /* ✏️ EDITAR */
  if (options.showEditButton) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️ Editar";
    editBtn.className = "edit-skill-btn";
    editBtn.onclick = options.onEdit!;

    actions.appendChild(editBtn);
  }

  if (actions.children.length > 0) {
    div.appendChild(actions);
  }

  return div;
}

async function openPlayerEditSkill(
  skill: Skill,
  playerId: string
) {
  const content = document.getElementById("player-content")!;

content.innerHTML = `
  <h4>✏️ Editar Skill</h4>

  <label>
    Nome
    <input id="edit-name" value="${skill.name}" />
  </label>

  <label>
    Descrição
    <textarea id="edit-desc">${skill.description}</textarea>
  </label>

  <label>
    Mana
    <input type="number" id="edit-mana" value="${skill.manaCost ?? ""}" />
  </label>

  <label>
    Cooldown
    <input type="number" id="edit-cd" value="${skill.cooldown ?? ""}" />
  </label>

  <div class="edit-actions">
    <button id="save-edit" class="btn primary">💾 Salvar</button>
    <button id="cancel-edit" class="btn ghost">Cancelar</button>
  </div>
`;


  document.getElementById("save-edit")!.onclick = async () => {
    await updatePlayerSkill(playerId, {
      ...skill,
      name: (document.getElementById("edit-name") as HTMLInputElement).value,
      description: (document.getElementById("edit-desc") as HTMLTextAreaElement).value,
      manaCost: Number(
        (document.getElementById("edit-mana") as HTMLInputElement).value
      ) || undefined,
      cooldown: Number(
        (document.getElementById("edit-cd") as HTMLInputElement).value
      ) || undefined,
    });

    renderPlayerContent("skills");
  };

  document.getElementById("cancel-edit")!.onclick = () => {
    renderPlayerContent("skills");
  };
}

async function updatePlayerSkill(
  playerId: string,
  updatedSkill: Skill
) {
  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata;

  const skills = skillsData.players[playerId];
  const index = skills.findIndex(s => s.id === updatedSkill.id);

  if (index === -1) return;

  skills[index] = updatedSkill;

  // 🔔 registra no histórico
  if (!skillsData.history) skillsData.history = {};
  if (!skillsData.history[playerId])
    skillsData.history[playerId] = [];

  skillsData.history[playerId].push({
    id: crypto.randomUUID(),
    skillId: updatedSkill.id,
    skillName: updatedSkill.name,
    action: "edit",
    skillType: updatedSkill.type,
    usedAt: Date.now(),
  });

  await OBR.room.setMetadata({
    ...metadata,
    [METADATA_KEY]: skillsData,
  });
}

async function renderPlayerContent(view: "skills" | "history") {
  const content = document.getElementById("player-content")!;
  const myId = await OBR.player.getId();
  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata | undefined;

  /* 📘 SKILLS */
  if (view === "skills") {
    content.innerHTML = "";
    const mySkills = skillsData?.players[myId] ?? [];
    const passivas = mySkills.filter(s => s.type === "passiva");
    const ativas = mySkills.filter(s => s.type === "ativa");
    const ultimates = mySkills.filter(s => s.type === "ultimate");
    /* 🟢 PASSIVAS */
    if (passivas.length > 0) {
      const section = document.createElement("section");
      section.innerHTML = `<h4>🟢 Passivas</h4>`;

      passivas.forEach(skill => {
      section.appendChild(
        createSkillCard(skill, {
          showEditButton: true,
          onEdit: () => openPlayerEditSkill(skill, myId),
        })
      );
    });


      content.appendChild(section);
    }

    /* 🔵 ATIVAS */
    if (ativas.length > 0) {
      const section = document.createElement("section");
      section.innerHTML = `<h4>🔵 Ativas</h4>`;

      ativas.forEach(skill => {
      section.appendChild(
        createSkillCard(skill, {
          showUseButton: true,
          onUse: async () => {
            await useSkill(myId, skill);
          },
          showEditButton: true,
          onEdit: () => openPlayerEditSkill(skill, myId),
        })
      );
    });


      content.appendChild(section);
    }

    /* 🔴 ULTIMATES */
    if (ultimates.length > 0) {
      const section = document.createElement("section");
      section.innerHTML = `<h4>🔴 Ultimates</h4>`;

      ultimates.forEach(skill => {
        section.appendChild(
          createSkillCard(skill, {
            showUseButton: true,
            onUse: async () => {
              await useSkill(myId, skill);
            },
            showEditButton: true,
            onEdit: () => openPlayerEditSkill(skill, myId),
          })
        );
      });


      content.appendChild(section);
    }
  }
/* 📜 HISTÓRICO */
if (view === "history") {
  const history = skillsData?.history?.[myId] ?? [];

  if (history.length === 0) {
    content.innerHTML = "<p>(nenhuma ação registrada ainda)</p>";
    return;
  }

  content.innerHTML = "";
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      const now = Date.now();

      history
        .slice()
        .reverse()
        .filter(entry => {
          // Ativas e ultimates somem após 5 minutos
          if (entry.skillType === "ativa" || entry.skillType === "ultimate") {
            return now - entry.usedAt <= FIFTEEN_MINUTES;
          }

          // Passivas e edits ficam
          return true;
        })
        .forEach(entry => {
          const div = document.createElement("div");
          div.className = "history-entry";

          const icon =
            entry.action === "edit"
              ? "✏️"
              : entry.skillType === "ultimate"
              ? "🔥"
              : entry.skillType === "ativa"
              ? "⚡"
              : "🛡️";

          const text =
            entry.action === "edit"
              ? "skill editada em"
              : "skill usada em";

          div.innerHTML = `
            <strong>${icon} ${entry.skillName}</strong>
            <small>
              ${text} ${new Date(entry.usedAt).toLocaleString()}
            </small>
          `;

          content.appendChild(div);
        });
    }
  }
});
