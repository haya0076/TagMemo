
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
    selectableRows: true,
    selectableRowsPersistence: false,

    cellEdited: function(cell) {
      const rowData = cell.getRow().getData();

      rowData.updatedAt = new Date().toISOString();

      appData = table.getData();
      saveData();
      updateStatus("保存しました");
    },

    columns: [
      {
        title: "選択",
        formatter: "rowSelection",
        titleFormatter: "rowSelection",
        hozAlign: "center",
        headerSort: false,
        width: 60
      },
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

  const noDateItems = parsed.filter(item => !item.date);

  if (noDateItems.length > 0) {
    const ok = confirm(
      `日付がないデータが ${noDateItems.length} 件あります。\n` +
      `このまま取り込みますか？`
    );

    if (!ok) {
      updateStatus("取込を中止しました");
      return;
    }
  }

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
  return /^(\d{4}[\/\-年]\d{1,2}[\/\-月]\d{1,2}日?|\d{1,2}[\/\-月]\d{1,2}日?)$/.test(token);
}

function normalizeDate(token) {
  const now = new Date();

  const normalized = token
    .trim()
    .replaceAll("年", "/")
    .replaceAll("月", "/")
    .replaceAll("日", "")
    .replaceAll("-", "/");

  const parts = normalized.split("/").filter(p => p !== "");

  let y, m, d;

  if (parts.length === 3) {
    y = Number(parts[0]);
    m = Number(parts[1]);
    d = Number(parts[2]);
  } else if (parts.length === 2) {
    y = now.getFullYear();
    m = Number(parts[0]);
    d = Number(parts[1]);
  } else {
    return "";
  }

  if (!y || !m || !d) return "";

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
    const loaded = JSON.parse(raw);

    appData = Array.isArray(loaded)
      ? loaded.map(normalizeItem)
      : [];

    saveData();
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

function exportJson() {

  const json =
    JSON.stringify(appData, null, 2);

  const blob =
    new Blob(
      [json],
      { type: "application/json" }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `tagmemo_${todayString()}.json`;

  a.click();

  URL.revokeObjectURL(url);

  updateStatus("JSON出力");
}

function importJson(event) {

  const file =
    event.target.files[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = function(e) {

    try {

      const imported =
        JSON.parse(e.target.result);

      if (!Array.isArray(imported)) {
        throw new Error();
      }

      let added = 0;

      for (const item of imported) {

        if (
          existsSameRecord(item)
        ) {
          continue;
        }

        appData.push(item);
        added++;
      }

      saveData();

      table.setData(appData);

      updateStatus(
        `${added}件取込`
      );

    }
    catch {

      alert(
        "JSON読込失敗"
      );

    }

  };

  reader.readAsText(file);

}

function todayString() {

  const d =
    new Date();

  return (
    d.getFullYear()
    +
    String(
      d.getMonth() + 1
    ).padStart(2, "0")
    +
    String(
      d.getDate()
    ).padStart(2, "0")
  );

}

function deleteSelectedRows() {
  const selectedRows = table.getSelectedRows();

  if (selectedRows.length === 0) {
    alert("削除する行を選択してください。");
    return;
  }

  const activeRows = table.getRows("active");
  const activeIds = activeRows.map(row => row.getData().id);

  const deleteIds = selectedRows
    .map(row => row.getData().id)
    .filter(id => activeIds.includes(id));

  if (deleteIds.length === 0) {
    alert("現在の表示条件で削除対象になる行がありません。");
    return;
  }

  const ok = confirm(
    `現在表示中の選択行 ${deleteIds.length} 件を削除します。\n` +
    `フィルタ外の行は削除しません。\n\n` +
    `よろしいですか？`
  );

  if (!ok) return;

  appData = appData.filter(item => !deleteIds.includes(item.id));

  saveData();
  table.setData(appData);
  updateStatus(`${deleteIds.length}件削除しました`);
}

function normalizeItem(item) {
  return {
    id: item.id || createId(),
    tag: item.tag || "",
    date: item.date || "",
    content: item.content || "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || ""
  };
}

function importJsonText() {
  const text = document.getElementById("jsonText").value.trim();

  if (!text) {
    alert("JSON文字列が空です。");
    return;
  }

  try {
    const imported = JSON.parse(text);

    if (!Array.isArray(imported)) {
      alert("JSONは配列形式で入力してください。");
      return;
    }

    let added = 0;
    let skipped = 0;

    for (const item of imported) {
      const normalized = normalizeItem(item);

      if (existsSameRecord(normalized)) {
        skipped++;
        continue;
      }

      appData.push(normalized);
      added++;
    }

    saveData();
    table.setData(appData);

    updateStatus(`JSON文字列取込: 追加 ${added}件 / 重複スキップ ${skipped}件`);
  } catch {
    alert("JSON文字列の解析に失敗しました。");
  }
}
