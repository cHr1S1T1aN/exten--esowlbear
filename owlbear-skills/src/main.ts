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

type SkillsMetadata = {
  players: {
    [playerId: string]: Skill[];
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

  // 5️⃣ Sessão do GM
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

  const button = document.createElement("button");
  button.textContent = "➕ Adicionar Skill";
  button.disabled = player.role === "GM"; // GM não adiciona skill a si mesmo

  button.addEventListener("click", () => {
    onAddSkillClick(player.id, player.name);
  });

  li.appendChild(name);
  li.appendChild(button);
  list.appendChild(li);
});
}

  if (view === "history") {
    content.innerHTML = `
      <h3>📜 Histórico de Skills</h3>
      <div>(em breve)</div>
    `;
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

//testando

  // 6️⃣ Sessão do Player
  async function renderPlayerSession(container: HTMLElement) {
  const myId = await OBR.player.getId();
  const metadata = await OBR.room.getMetadata();
  const skillsData = metadata[METADATA_KEY] as SkillsMetadata | undefined;

  const mySkills = skillsData?.players[myId] ?? [];

  container.innerHTML = `
    <section>
      <h3>👤 Suas Skills</h3>
      <div class="player-skills"></div>
    </section>
  `;

  const skillsContainer = container.querySelector(
    ".player-skills"
  ) as HTMLElement;

  if (mySkills.length === 0) {
    skillsContainer.innerHTML = "<p>(nenhuma skill ainda)</p>";
    return;
  }

  mySkills.forEach(skill => {
    const div = document.createElement("div");
    div.className = "skill-card";

    div.innerHTML = `
      <strong>${skill.name}</strong>
      <small>${skill.type}</small>
      <p>${skill.description}</p>
      ${skill.manaCost ? `<span>Mana: ${skill.manaCost}</span>` : ""}
      ${skill.cooldown ? `<span>Cooldown: ${skill.cooldown}</span>` : ""}
    `;

    skillsContainer.appendChild(div);
  });
}
OBR.room.onMetadataChange(() => {
  if (!isGM) {
    const content = document.getElementById("session-content");
    if (content) renderPlayerSession(content);
  }
});
});
