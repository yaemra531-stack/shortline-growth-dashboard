"use strict";

const data = window.dashboardData;

if (data) {
  renderDashboard(data);
} else {
  document.getElementById("load-error").hidden = false;
}

function renderDashboard(data) {
  const byId = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? "待补充").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const label = (number) => "V" + number;

  let nextNumber = 1;
  const phases = data.phases.map((phase) => ({
    ...phase,
    rounds: phase.tasks.map((task) => {
      const number = nextNumber++;
      return { number, task, review: data.reviews[number] };
    }),
  }));
  const rounds = phases.flatMap((phase) => phase.rounds);
  const recorded = rounds.filter((round) => round.review);
  const current = recorded.at(-1);
  const currentPhase = phases.find((phase) => phase.rounds.includes(current));
  const completed = recorded.filter((round) => round.review.completed).length;
  const upcoming = rounds.find((round) => round.number > (current?.number ?? 0) && !round.review?.completed);
  const focus = current?.review.focus;
  const focusRound = upcoming ? label(upcoming.number) + " 计划" : "阶段回看";

  byId("goal-minutes").textContent = data.goalMinutes;
  byId("current-version").textContent = current ? "当前 " + label(current.number) : "待开始";
  byId("current-stage").textContent = focus?.stage || currentPhase?.title || "阶段待补充";
  byId("completed").textContent = completed;
  byId("total").textContent = "/ " + rounds.length;
  byId("rate").textContent = (completed / rounds.length * 100).toFixed(1) + "%";
  byId("round-grid").innerHTML = rounds.map((round) => {
    const state = round === current ? "now" : round.review?.completed ? "done" : "next";
    const status = { now: "当前轮", done: "已完成", next: "后续计划" }[state];
    return `<button type="button" class="round-tile ${state}" data-round="${round.number}" data-jump aria-label="${label(round.number)} · ${status}" ${state === "now" ? 'aria-current="step"' : ""}>${label(round.number)}</button>`;
  }).join("");

  byId("focus").innerHTML = `
    <div class="card-kicker"><span class="focus-dot"></span>当前瓶颈</div>
    <h2>${safe(focus?.title || upcoming?.task || "待补充")}</h2>
    <p>${safe(focus?.text || "本轮瓶颈和验证边界待补充。")}</p>
    ${upcoming ? `<button type="button" class="text-button" data-round="${upcoming.number}" data-jump>查看 ${focusRound} <span aria-hidden="true">↗</span></button>` : ""}`;

  const funnel = data.funnel;
  byId("funnel").setAttribute("aria-label", label(funnel.round) + " 候选精选");
  byId("funnel").innerHTML = `
    <div class="card-kicker">${label(funnel.round)} <span class="thin-divider"></span> 单批筛选验证</div>
    <ol class="funnel-steps">${funnel.steps.map((step) => `
      <li><strong>${safe(step.count)}</strong><span>${safe(step.label)}</span></li>`).join("")}
    </ol>
    <p>${safe(funnel.note)}</p>`;

  byId("history").innerHTML = recorded.map(({ number, review }) => `
    <li><button type="button" data-round="${number}" aria-controls="round-detail" aria-pressed="false">
      <span class="history-version">${label(number)}</span>
      <span>${safe(review.title)}</span><span class="history-arrow" aria-hidden="true">›</span>
    </button></li>`).join("");

  function showRound(round) {
    const { number, review, task } = round;
    const completedText = review?.completed ? "本轮实验已记录" : "本轮实践进行中";
    const statusTone = review?.status === "通过" ? "done" : "wait";
    const fields = [
      ["本轮核心目标", review?.goal || task],
      ["实际验证", review?.verified],
      ["最大收获", review?.takeaway],
      ["暴露的问题", review?.issue],
    ];
    byId("round-detail").innerHTML = `
      <div class="detail-meta">
        <span class="detail-version">${label(number)}</span>
        <span class="status ${review ? statusTone : "wait"}">${safe(review?.status || "后续计划")}</span>
        <span class="detail-state">${review ? completedText : "实践记录待补充"}</span>
      </div>
      <h3 id="round-title">${safe(review?.title || task)}</h3>
      <dl class="round-fields">${fields.map(([name, value]) => `<div><dt>${name}</dt><dd>${safe(value)}</dd></div>`).join("")}</dl>
      <div class="conclusion"><span>复盘结论</span><p>${safe(review?.conclusion)}</p></div>
      ${review?.duration ? `<p class="duration"><strong>耗时记录</strong> ${safe(review.duration)}</p>` : ""}`;

    byId("history").querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", Number(button.dataset.round) === number);
    });
  }

  showRound(current || rounds[0]);

  byId("direction-grid").innerHTML = data.directions.map((direction, index) => `
    <article class="panel direction-card">
      <div class="direction-top">
        <span class="direction-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="status ${direction.tone === "done" ? "done" : "wait"}">${safe(direction.status)}</span>
      </div>
      <h3>${safe(direction.name)}</h3>
      <dl>
        <div><dt>已验证</dt><dd>${safe(direction.verified)}</dd></div>
        <div><dt>当前卡点</dt><dd>${safe(direction.issue)}</dd></div>
        <div><dt>下一步</dt><dd>${safe(direction.next)}</dd></div>
      </dl>
    </article>`).join("");
  byId("process").innerHTML = `
    <div><p class="card-kicker">固定执行机制</p><h3>${safe(data.principles.process)}</h3></div>
    <p>${safe(data.principles.practice)}</p>`;

  byId("phase-list").innerHTML = phases.map((phase, index) => {
    const first = phase.rounds[0].number;
    const last = phase.rounds.at(-1).number;
    const phaseCompleted = phase.rounds.filter((round) => round.review?.completed).length;
    const isCurrent = phase === currentPhase;
    const phaseStatus = phaseCompleted === phase.rounds.length ? "阶段已记录" : isCurrent ? "当前阶段" : "后续计划";
    return `
      <details class="phase panel" ${isCurrent ? "open" : ""}>
        <summary>
          <span class="phase-index">${String(index + 1).padStart(2, "0")}</span>
          <strong>${safe(phase.title)}</strong>
          <span class="phase-range">${label(first)}–${label(last)}</span>
          <span class="phase-status ${isCurrent ? "phase-active" : ""}">${phaseStatus}</span>
          <span class="chevron" aria-hidden="true"></span>
        </summary>
        <div class="phase-body">
          <p>${safe(phase.goal)}</p>
          <ul>${phase.rounds.map((round) => `
            <li><button type="button" class="phase-round" data-round="${round.number}" data-jump>
              <span>${label(round.number)}</span>${safe(round.task)}
              <span class="phase-round-state">${round.review?.completed ? "已记录" : round.review ? "进行中" : "计划"}</span>
            </button></li>`).join("")}</ul>
        </div>
      </details>`;
  }).join("");

  byId("insight-grid").innerHTML = data.insights.map((insight) => `
    <article class="insight-card">
      <p class="insight-version">${safe(insight.rounds)}</p>
      <h3>${safe(insight.title)}</h3>
      <p>${safe(insight.text)}</p>
    </article>`).join("");
  byId("principles").innerHTML = `
    <div><p class="card-kicker">系统建设顺序</p><h3>${safe(data.principles.sequence)}</h3></div>
    <p>${safe(data.principles.quality)}</p>`;

  byId("milestone-list").innerHTML = data.milestones.map((milestone) => `
    <li><span class="milestone-version">${label(milestone.round)}</span>
      <h3>${safe(milestone.title)}</h3><p>${safe(milestone.text)}</p>
    </li>`).join("");

  byId("extension-grid").innerHTML = data.extensions.map((extension) => `
    <article class="extension-card">
      <p class="extension-status">${extension.entries.length ? "持续更新" : "待补充"}</p>
      <h3>${safe(extension.title)}</h3><p>${safe(extension.description)}</p>
      ${extension.entries.length ? `<ul>${extension.entries.map((entry) => `<li>${safe(entry)}</li>`).join("")}</ul>` : ""}
    </article>`).join("");

  byId("source").textContent = "资料基线 · 《" + data.source.title + "》｜起于 " + data.source.started + " · 更新于 " + data.source.updated;

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-round]");
    if (!button) return;

    const round = rounds.find(({ number }) => number === Number(button.dataset.round));
    if (!round) return;

    showRound(round);
    if (button.hasAttribute("data-jump")) {
      const detail = byId("round-detail");
      detail.focus({ preventScroll: true });
      detail.scrollIntoView({ block: "start" });
    }
  });
}
