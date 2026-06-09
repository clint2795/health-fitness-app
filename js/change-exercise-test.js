(function () {
  var replacements = [
    {
      id: "machine-lateral-raise",
      name: "Machine lateral raise",
      muscle: "Side Delts",
      repRange: "10-20",
      notes: "Good default when the machine path feels natural."
    },
    {
      id: "dumbbell-lateral-raise",
      name: "Dumbbell lateral raise",
      muscle: "Side Delts",
      repRange: "12-25",
      notes: "Use controlled reps and stop short of positions that irritate the shoulder."
    },
    {
      id: "lean-away-cable-lateral-raise",
      name: "Lean-away cable lateral raise",
      muscle: "Side Delts",
      repRange: "12-25",
      notes: "Useful variation when the shoulder stays centered and comfortable."
    }
  ];
  var lastActionAt = 0;
  var lastActionKey = "";

  function getById(id) {
    return document.getElementById(id);
  }

  function getSelectedReplacement() {
    var select = getById("test-change-exercise-select");

    return replacements.find(function (exercise) {
      return select && exercise.id === select.value;
    }) || replacements[0];
  }

  function renderReplacementDetails() {
    var details = getById("test-change-exercise-details");
    var exercise = getSelectedReplacement();

    if (details && exercise) {
      details.textContent = exercise.muscle + " - " + exercise.repRange + " - " + exercise.notes;
    }
  }

  function openModal() {
    var modal = getById("test-change-exercise-modal");
    var select = getById("test-change-exercise-select");
    var current = getById("test-change-exercise-current");
    var title = getById("test-exercise-title");

    if (!modal || !select) {
      return;
    }

    select.innerHTML = replacements.map(function (exercise) {
      return '<option value="' + exercise.id + '">' + exercise.name + '</option>';
    }).join("");

    if (current && title) {
      current.textContent = "Current: " + title.textContent;
    }

    modal.hidden = false;
    if (modal.removeAttribute) {
      modal.removeAttribute("hidden");
    }
    if (modal.classList) {
      modal.classList.add("modal-open");
    }
    modal.style.display = "grid";
    renderReplacementDetails();
    select.focus();
  }

  function closeModal() {
    var modal = getById("test-change-exercise-modal");

    if (!modal) {
      return;
    }

    modal.hidden = true;
    if (modal.setAttribute) {
      modal.setAttribute("hidden", "");
    }
    if (modal.classList) {
      modal.classList.remove("modal-open");
    }
    modal.style.display = "";
  }

  function saveReplacement() {
    var exercise = getSelectedReplacement();
    var title = getById("test-exercise-title");
    var meta = getById("test-exercise-meta");
    var notes = getById("test-exercise-notes");

    if (!exercise) {
      return;
    }

    if (title) {
      title.textContent = exercise.name;
    }
    if (meta) {
      meta.textContent = exercise.muscle + " - " + exercise.repRange;
    }
    if (notes) {
      notes.textContent = exercise.notes;
    }

    closeModal();
  }

  function handleAction(event) {
    var button = event.target && event.target.closest ? event.target.closest("[data-test-action]") : null;
    var action = button ? button.dataset.testAction : "";
    var now = Date.now();

    if (!action) {
      return;
    }

    if (action === lastActionKey && now - lastActionAt < 350) {
      event.preventDefault();
      return;
    }

    lastActionKey = action;
    lastActionAt = now;
    event.preventDefault();

    if (action === "change-exercise") {
      openModal();
    }
  }

  function bindActionEvents() {
    if (window.PointerEvent) {
      document.addEventListener("pointerup", handleAction);
      return;
    }

    document.addEventListener("touchend", handleAction);
    document.addEventListener("click", handleAction);
  }

  function init() {
    var select = getById("test-change-exercise-select");
    var saveButton = getById("test-save-exercise-change-button");
    var cancelButton = getById("test-cancel-exercise-change-button");

    bindActionEvents();

    if (select) {
      select.addEventListener("change", renderReplacementDetails);
    }
    if (saveButton) {
      saveButton.addEventListener("click", saveReplacement);
    }
    if (cancelButton) {
      cancelButton.addEventListener("click", closeModal);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
