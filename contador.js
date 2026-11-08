"use strict";

const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");
const errorMessage = document.getElementById("error-message");
const warningMessage = document.getElementById("warning-message");
const metricsSection = document.getElementById("metrics-section");
const charactersSection = document.getElementById("characters-section");
const charactersTable = document.getElementById("characters-table");

const characters = ["Quijote", "Sancho", "Dulcinea", "Rocinante", "Sansón"];
const wordPattern = /[A-Za-zÁÉÍÓÚÜÑáéíóúü]+/g;
const vowelPattern = /[aeiouáéíóúü]/gi;
const consonantPattern = /[bcdfghjklmnñpqrstvwxyz]/gi;
const letterPattern = /[A-Za-zÁÉÍÓÚÜÑáéíóúü]/;
let activeRead = 0;

function clearResults() {
  document.getElementById("word-count").textContent = "—";
  document.getElementById("vowel-count").textContent = "—";
  document.getElementById("consonant-count").textContent = "—";
  metricsSection.hidden = true;
  charactersSection.hidden = true;
  charactersTable.replaceChildren();
  warningMessage.hidden = true;
  warningMessage.textContent = "";
  errorMessage.hidden = true;
  errorMessage.textContent = "";
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function countCharacter(text, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^${letterPattern.source.slice(1, -1)}])${escapedName}(?=$|[^${letterPattern.source.slice(1, -1)}])`, "gi");
  let count = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    count += 1;
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
    }
  }

  return count;
}

function countCharacters(text) {
  const firstMarker = "Capítulo primero.";
  const secondMarker = "Capítulo Primero.";
  const firstStart = text.indexOf(firstMarker);
  const secondStart = text.indexOf(secondMarker);

  if (firstStart === -1 || secondStart === -1 || secondStart <= firstStart) {
    return null;
  }

  const firstPart = text.slice(firstStart, secondStart);
  const secondPart = text.slice(secondStart);
  return characters.map((name) => {
    const firstCount = countCharacter(firstPart, name);
    const secondCount = countCharacter(secondPart, name);
    return {
      name,
      firstCount,
      secondCount,
      total: firstCount + secondCount
    };
  });
}

function renderMetrics(text) {
  document.getElementById("word-count").textContent = countMatches(text, wordPattern).toLocaleString("es");
  document.getElementById("vowel-count").textContent = countMatches(text, vowelPattern).toLocaleString("es");
  document.getElementById("consonant-count").textContent = countMatches(text, consonantPattern).toLocaleString("es");
  metricsSection.hidden = false;
}

function renderCharacters(rows) {
  const allMentions = rows.reduce((sum, row) => sum + row.total, 0);
  if (allMentions === 0) {
    warningMessage.textContent = "El archivo se ha podido leer y sus palabras están contadas, pero no se han detectado menciones de los personajes esperados. Puede tratarse de una versión modificada o de un problema estructural del texto.";
    warningMessage.hidden = false;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of [row.name, row.firstCount, row.secondCount, row.total]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.append(td);
    }
    fragment.append(tr);
  }

  charactersTable.replaceChildren(fragment);
  charactersSection.hidden = false;
}

function showError(message) {
  clearResults();
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

async function processFile(file, readId) {
  clearResults();
  fileName.textContent = file ? file.name : "Todavía no has elegido ningún archivo.";

  if (!file) {
    return;
  }

  if (!/\.txt$/i.test(file.name) || file.size === 0) {
    showError("El archivo no ha podido procesarse. Selecciona un archivo .txt que contenga texto.");
    return;
  }

  try {
    const bytes = await file.arrayBuffer();
    if (readId !== activeRead) {
      return;
    }

    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (decoded.trim().length === 0 || decoded.includes("\u0000")) {
      throw new Error("Formato de texto no válido.");
    }

    const text = decoded.normalize("NFC");
    renderMetrics(text);

    const rows = countCharacters(text);
    if (rows === null) {
      warningMessage.textContent = "Se han contado las palabras del archivo, pero no se han detectado las marcas de capítulo «Capítulo primero.» y «Capítulo Primero.». Puede tratarse de una versión modificada o de un problema estructural del texto.";
      warningMessage.hidden = false;
      return;
    }

    renderCharacters(rows);
  } catch {
    if (readId === activeRead) {
      showError("El archivo no ha podido procesarse. Comprueba que sea un texto válido codificado en UTF-8 e inténtalo de nuevo.");
    }
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  activeRead += 1;
  const readId = activeRead;
  fileInput.value = "";
  processFile(file, readId);
});
