
const STORAGE_KEY = "tagMemoData_v1";

let appData = [];
let table = null;
let currentDate = "";

window.addEventListener("DOMContentLoaded", () => {
  loadData();
  initTable();
  bindEvents();
  updateStatus();
});

function bindEvents() {
  document.getElementById("importBtn").addEventListener("click", handleImportText);

  document.getElementById("clearInputBtn").addEventListener("click", () => {
    document.getElementById("inputText").value = "";
  });

  document.getElementById("clearDataBtn").addEventListener("click", () => {
    if (!confirm("全データを削除します。よろしいですか？")) return;

    appData = [];
    saveData();
    table.setData(appData);
    updateStatus();
  });
}

function initTable() {
  table = new Tabulator("#table", {
    data: appData,
    layout: "fitColumns",
    height: "500px",
    index: "id",

    cellEdited: function(cell) {
      const rowData = cell.getRow().getData();

      rowData.updatedAt = new Date().toISOString();

      appData = table.getData();
      saveData();
      updateStatus("保存しました");
    },

    columns: [
      {
        title: "TAG",
        field: "tag",
        editor: "input",
        headerFilter: "input",
        width: 180
      },
      {
        title: "日付",
        field: "date",
        editor: "input",
        headerFilter: "input",
        width: 130
      },
      {
        title: "内容",
        field: "content",
        editor: "input",
        headerFilter: "input"
      },
      {
        title: "更新日時",
        field: "updatedAt",
        visible: false
      },
      {
        title: "登録日時",
        field: "createdAt",
        visible: false
      }
    ]
  });
}

function handleImportText() {
  const text = document.getElementById("inputText").value;

  const baseDateInput = document.getElementById("baseDate").value.trim();
  currentDate = baseDateInput ? normalizeDate(baseDateInput) : "";

  const parsed = parseText(text);

  let added = 0;
  let skipped = 0;

  for (const item of parsed) {
    if (existsSameRecord(item)) {
      skipped++;
      continue;
    }

    appData.push(item);
    added++;
  }

  saveData();
  table.setData(appData);
  updateStatus(`追加 ${added}件 / 重複スキップ ${skipped}件`);
}

function parseText(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const item = parseLine(line);
    if (item) result.push(item);
  }

  return result;
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const firstSpaceIndex = trimmed.search(/\s/);

  let tag = "";
  let rest = "";

  if (firstSpaceIndex === -1) {
    tag = trimmed;
    rest = "";
  } else {
    tag = trimmed.slice(0, firstSpaceIndex);
    rest = trimmed.slice(firstSpaceIndex).trim();
  }

  if (!tag) return null;

  const parts = rest.split(/\s+/);

  let date = currentDate;
  let content = rest;

  if (parts.length > 0 && isDateToken(parts[0])) {
    date = normalizeDate(parts[0]);
    currentDate = date;
    content = rest.slice(parts[0].length).trim();
  }

  return {
    id: createId(),
    tag,
    date,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: ""
  };
}

function isDateToken(token) {
  return /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2})$/.test(token);
}

function normalizeDate(token) {
  const now = new Date();
  const parts = token.replaceAll("-", "/").split("/");

  let y, m, d;

  if (parts.length === 3) {
    y = Number(parts[0]);
    m = Number(parts[1]);
    d = Number(parts[2]);
  } else {
    y = now.getFullYear();
    m = Number(parts[0]);
    d = Number(parts[1]);
  }

  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function existsSameRecord(newItem) {
  return appData.some(item =>
    item.tag === newItem.tag &&
    item.date === newItem.date &&
    item.content === newItem.content
  );
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    appData = [];
    return;
  }

  try {
    appData = JSON.parse(raw);
  } catch {
    appData = [];
  }
}

function updateStatus(message = "") {
  const status = document.getElementById("status");

  const count = appData.length;
  const now = new Date().toLocaleTimeString();

  status.textContent = message
    ? `${message} / ${count}件 / ${now}`
    : `${count}件`;
}

// const STORAGE_KEY = "tagMemoData_v1";

// let appData = [];
// let currentDate = "";

// window.addEventListener("DOMContentLoaded", () => {
//   loadData();
//   bindEvents();
//   renderList(appData);
// });

// function bindEvents() {
//   document.getElementById("importBtn").addEventListener("click", handleImportText);
//   document.getElementById("clearInputBtn").addEventListener("click", () => {
//     document.getElementById("inputText").value = "";
//   });

//   document.getElementById("filterBtn").addEventListener("click", handleFilter);
//   document.getElementById("resetFilterBtn").addEventListener("click", () => {
//     document.getElementById("filterKeyword").value = "";
//     document.getElementById("filterTag").value = "";
//     document.getElementById("filterDate").value = "";
//     renderList(appData);
//   });

//   document.getElementById("exportBtn").addEventListener("click", exportJson);
//   document.getElementById("importJsonFile").addEventListener("change", importJson);

//   document.getElementById("clearDataBtn").addEventListener("click", () => {
//     if (!confirm("全データを削除します。よろしいですか？")) return;
//     appData = [];
//     saveData();
//     renderList(appData);
//   });
// }

// function handleImportText() {
//   const text = document.getElementById("inputText").value;

//   const baseDateInput = document.getElementById("baseDate").value.trim();
//   currentDate = baseDateInput ? normalizeDate(baseDateInput) : "";

//   const parsed = parseText(text);

//   let added = 0;
//   let skipped = 0;

//   for (const item of parsed) {
//     if (existsSameRecord(item)) {
//       skipped++;
//       continue;
//     }

//     appData.push(item);
//     added++;
//   }

//   saveData();
//   renderList(appData);

//   alert(`追加: ${added}件 / 重複スキップ: ${skipped}件`);
// }

// function parseText(text) {
//   const lines = text.split(/\r?\n/);
//   const result = [];

//   for (const line of lines) {
//     const item = parseLine(line);
//     if (item) result.push(item);
//   }

//   return result;
// }

// function parseLine(line) {
//   const trimmed = line.trim();
//   if (!trimmed) return null;

//   const firstSpaceIndex = trimmed.search(/\s/);

//   let tag = "";
//   let rest = "";

//   if (firstSpaceIndex === -1) {
//     tag = trimmed;
//     rest = "";
//   } else {
//     tag = trimmed.slice(0, firstSpaceIndex);
//     rest = trimmed.slice(firstSpaceIndex).trim();
//   }

//   if (!tag) return null;

//   const parts = rest.split(/\s+/);
//   let date = currentDate;
//   let content = rest;

//   if (parts.length > 0 && isDateToken(parts[0])) {
//     date = normalizeDate(parts[0]);
//     currentDate = date;
//     content = rest.slice(parts[0].length).trim();
//   }

//   return {
//     id: createId(),
//     tag,
//     date,
//     content,
//     createdAt: new Date().toISOString(),
//     updatedAt: null
//   };
// }

// function isDateToken(token) {
//   return /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2})$/.test(token);
// }

// function normalizeDate(token) {
//   const now = new Date();
//   const parts = token.replaceAll("-", "/").split("/");

//   let y, m, d;

//   if (parts.length === 3) {
//     y = Number(parts[0]);
//     m = Number(parts[1]);
//     d = Number(parts[2]);
//   } else {
//     y = now.getFullYear();
//     m = Number(parts[0]);
//     d = Number(parts[1]);
//   }

//   return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
// }

// function createId() {
//   return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// }

// function existsSameRecord(newItem) {
//   return appData.some(item =>
//     item.tag === newItem.tag &&
//     item.date === newItem.date &&
//     item.content === newItem.content
//   );
// }

// function saveData() {
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
// }

// function loadData() {
//   const raw = localStorage.getItem(STORAGE_KEY);

//   if (!raw) {
//     appData = [];
//     return;
//   }

//   try {
//     appData = JSON.parse(raw);
//   } catch {
//     appData = [];
//   }
// }

// function handleFilter() {
//   const keyword = document.getElementById("filterKeyword").value.trim();
//   const tag = document.getElementById("filterTag").value.trim();
//   const date = document.getElementById("filterDate").value.trim();

//   const filtered = appData.filter(item => {
//     const matchKeyword =
//       !keyword ||
//       item.content.includes(keyword) ||
//       item.tag.includes(keyword) ||
//       item.date.includes(keyword);

//     const matchTag =
//       !tag ||
//       item.tag.includes(tag);

//     const matchDate =
//       !date ||
//       item.date === normalizeDate(date);

//     return matchKeyword && matchTag && matchDate;
//   });

//   renderList(filtered);
// }

// function renderList(data) {
//   const list = document.getElementById("list");
//   const count = document.getElementById("count");

//   count.textContent = `${data.length}件`;

//   list.innerHTML = "";

//   for (const item of data) {
//     const div = document.createElement("div");
//     div.className = "item";

//     div.innerHTML = `
//       <div class="meta">${escapeHtml(item.date)} / ${escapeHtml(item.tag)}</div>
//       <div class="content">${escapeHtml(item.content)}</div>
//     `;

//     list.appendChild(div);
//   }
// }

// function exportJson() {
//   const json = JSON.stringify(appData, null, 2);
//   const blob = new Blob([json], { type: "application/json" });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `tagmemo_${getTodayString()}.json`;
//   a.click();

//   URL.revokeObjectURL(url);
// }

// function importJson(event) {
//   const file = event.target.files[0];
//   if (!file) return;

//   const reader = new FileReader();

//   reader.onload = () => {
//     try {
//       const imported = JSON.parse(reader.result);

//       if (!Array.isArray(imported)) {
//         alert("JSON形式が不正です。");
//         return;
//       }

//       let added = 0;
//       let skipped = 0;

//       for (const item of imported) {
//         if (!item.tag || !item.content) continue;

//         const normalized = {
//           id: item.id || createId(),
//           tag: item.tag,
//           date: item.date || "",
//           content: item.content,
//           createdAt: item.createdAt || new Date().toISOString(),
//           updatedAt: item.updatedAt || null
//         };

//         if (existsSameRecord(normalized)) {
//           skipped++;
//           continue;
//         }

//         appData.push(normalized);
//         added++;
//       }

//       saveData();
//       renderList(appData);

//       alert(`JSON取込完了: 追加 ${added}件 / 重複スキップ ${skipped}件`);
//     } catch {
//       alert("JSONの読み込みに失敗しました。");
//     }
//   };

//   reader.readAsText(file);
//   event.target.value = "";
// }

// function getTodayString() {
//   const d = new Date();
//   return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
// }

// function escapeHtml(text) {
//   return String(text ?? "")
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#039;");
// }

// // document.getElementById("parseBtn")
// // .addEventListener("click", () => {

// //     const text =
// //         document.getElementById("src").value;

// //     const lines =
// //         text.split(/\r?\n/);

// //     let currentDate = "";

// //     const result = [];

// //     for (const line of lines) {

// //         const m =
// //             line.match(/^(\S+)\s+(.*)$/);

// //         if (!m) continue;

// //         const tag = m[1];
// //         const rest = m[2];

// //         const p =
// //             rest.split(/\s+/);

// //         let date = currentDate;
// //         let content = rest;

// //         if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(p[0])) {

// //             date = p[0];
// //             currentDate = date;

// //             content =
// //                 rest.substring(date.length).trim();
// //         }

// //         result.push({
// //             tag,
// //             date,
// //             content
// //         });
// //     }

// //     document.getElementById("result")
// //         .textContent =
// //         JSON.stringify(result, null, 2);

// // });