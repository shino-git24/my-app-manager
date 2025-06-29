/**
 * ===================================================================
 *  自作アプリ管理ツール - サーバーサイドスクリプト
 * ===================================================================
 */

// --- 定数定義 ---
const SHEET_NAME = 'アプリ一覧';
const HEADERS = [
  'id', 'name', 'overview', 'status', 'tags', 'tech_stack', 'deployment_type', 
  'used_apis', 'url', 'repository', 'local_source_path', 'usage_context', 
  'icon_status', 'next_action', 'changelog', 'memo', 'created_at', 'updated_at'
];


/**
 * ===================================================================
 *  初期セットアップ
 * ===================================================================
 */

/**
 * 【初回設定用：1度だけ実行】
 * 既存のデータにID、作成日時、更新日時をまとめて付与します。
 * Apps Scriptエディタからこの関数を手動で実行してください。
 */
function setupInitialData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`シート「${SHEET_NAME}」が見つかりません。`);

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    
    // 列のインデックスを動的に取得
    const idCol = headers.indexOf('id');
    const createdCol = headers.indexOf('created_at');
    const updatedCol = headers.indexOf('updated_at');

    if (idCol === -1 || createdCol === -1 || updatedCol === -1) {
      throw new Error('必要な列（id, created_at, updated_at）が見つかりません。');
    }

    let updated = false;
    const now = new Date();

    for (let i = 1; i < values.length; i++) {
      if (!values[i][idCol]) { // IDが空の行のみ処理
        values[i][idCol] = Utilities.getUuid();
        if (!values[i][createdCol]) values[i][createdCol] = now;
        values[i][updatedCol] = now;
        updated = true;
      }
    }

    if (updated) {
      dataRange.setValues(values);
      SpreadsheetApp.flush();
      Browser.msgBox('セットアップが完了しました。既存のデータにIDと日付を付与しました。');
    } else {
      Browser.msgBox('セットアップの必要はありません。すべてのデータにIDが付与されています。');
    }
  } catch (e) {
    console.error(`セットアップエラー: ${e.stack}`);
    Browser.msgBox(`エラーが発生しました: ${e.message}`);
  }
}


/**
 * ===================================================================
 *  Webアプリケーションのメイン処理
 * ===================================================================
 */

/**
 * WebアプリのGETリクエストを処理
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('自作アプリ管理ツール')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * ===================================================================
 *  データ操作 API (クライアントサイドから呼び出される関数)
 * ===================================================================
 */

/**
 * 【READ】すべてのアプリデータを取得する
 * @returns {object} { status: 'success', data: AppData[] } | { status: 'error', message: string }
 */
function getRecords() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`シート「${SHEET_NAME}」が見つかりません。`);
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    const records = data.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        // 日付オブジェクトはISO文字列に変換してタイムゾーン問題を回避
        record[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
      });
      return record;
    });

       console.log(`[サーバー] 取得したデータ件数: ${records.length}件`);
       console.log(`[サーバー] 返却するデータの中身（先頭5件）: ${JSON.stringify(records.slice(0, 5), null, 2)}`);

    
    console.log(`全${records.length}件のデータを取得しました。`);
    return { status: 'success', data: records };

  } catch (e) {
    console.error(`[getRecords] Error: ${e.stack}`);
    return { status: 'error', message: `データ取得エラー: ${e.message}` };
  }
}

/**
 * 【CREATE】新しいアプリデータを追加する
 * @param {object} recordData - 新しいアプリのデータ
 * @returns {object} { status: 'success', data: AppData } | { status: 'error', message: string }
 */
function createRecord(recordData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`シート「${SHEET_NAME}」が見つかりません。`);

    const now = new Date();
    const newId = Utilities.getUuid();

    const newRow = HEADERS.map(header => {
      if (header === 'id') return newId;
      if (header === 'created_at' || header === 'updated_at') return now;
      return recordData[header] || '';
    });

    sheet.appendRow(newRow);
    
    const newRecord = HEADERS.reduce((obj, header, index) => {
      obj[header] = newRow[index] instanceof Date ? newRow[index].toISOString() : newRow[index];
      return obj;
    }, {});

    console.log(`新規アプリを追加しました。ID: ${newId}`);
    return { status: 'success', data: newRecord };

  } catch (e) {
    console.error(`[createRecord] Error: ${e.stack}`);
    return { status: 'error', message: `データ追加エラー: ${e.message}` };
  }
}

/**
 * 【UPDATE】既存のアプリデータを更新する
 * @param {object} recordData - 更新するアプリのデータ (idを含む)
 * @returns {object} { status: 'success', data: AppData } | { status: 'error', message: string }
 */
function updateRecord(recordData) {
  if (!recordData || !recordData.id) {
    return { status: 'error', message: '更新対象のIDが必要です。' };
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`シート「${SHEET_NAME}」が見つかりません。`);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

    const rowIndex = data.findIndex(row => row[idCol] === recordData.id);

    if (rowIndex === -1) {
      throw new Error(`ID「${recordData.id}」のデータが見つかりません。`);
    }

    const now = new Date();
    const updatedRow = headers.map((header, index) => {
      if (header === 'updated_at') return now;
      if (header in recordData) return recordData[header];
      return data[rowIndex][index]; // 既存の値を維持
    });

    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([updatedRow]);

    const updatedRecord = HEADERS.reduce((obj, header, index) => {
      obj[header] = updatedRow[index] instanceof Date ? updatedRow[index].toISOString() : updatedRow[index];
      return obj;
    }, {});
    
    console.log(`アプリ情報を更新しました。ID: ${recordData.id}`);
    return { status: 'success', data: updatedRecord };

  } catch (e) {
    console.error(`[updateRecord] Error: ${e.stack}`);
    return { status: 'error', message: `データ更新エラー: ${e.message}` };
  }
}

/**
 * 【DELETE】アプリデータを削除する
 * @param {string} id - 削除するアプリのID
 * @returns {object} { status: 'success', message: string } | { status: 'error', message: string }
 */
function deleteRecord(id) {
  if (!id) {
    return { status: 'error', message: '削除対象のIDが必要です。' };
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`シート「${SHEET_NAME}」が見つかりません。`);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

    const rowIndex = data.findIndex(row => row[idCol] === id);

    if (rowIndex === -1) {
      throw new Error(`ID「${id}」のデータが見つかりません。`);
    }

    sheet.deleteRow(rowIndex + 1);
    
    console.log(`アプリを削除しました。ID: ${id}`);
    return { status: 'success', message: `ID: ${id} のアプリを削除しました。` };

  } catch (e) {
    console.error(`[deleteRecord] Error: ${e.stack}`);
    return { status: 'error', message: `データ削除エラー: ${e.message}` };
  }
}