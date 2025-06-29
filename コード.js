/**
 * WebアプリのURLにアクセスがあった時に実行されるメイン関数
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('自作アプリ管理ツール');
}

/**
 * 【役割：データを読み込む】
 * スプレッドシート「アプリ一覧」から全データを取得して、オブジェクトの配列として返す
 * (一覧表示で使います)
 * @returns {Array<Object>} アプリデータの配列
 */
function getAppsData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('アプリ一覧');
    if (!sheet) {
      throw new Error('「アプリ一覧」という名前のシートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // ヘッダー行を取得
    
    // データ本体をオブジェクトの配列に変換
    const apps = data.map(row => {
      const appObject = {};
      headers.forEach((header, index) => {
        if (row[index] instanceof Date) {
          appObject[header] = row[index].toLocaleDateString();
        } else {
          appObject[header] = row[index];
        }
      });
      return appObject;
    });
    
    return apps;

  } catch (e) {
    console.error('データの取得中にエラーが発生しました: ' + e.message);
    throw new Error('データの取得中にエラーが発生しました： ' + e.message);
  }
}

/**
 * 【役割：データを書き込む】
 * フォームから受け取ったデータにIDや日付を付与して、スプレッドシートに新しい行として追加する
 * (「保存する」ボタンで使います)
 * @param {Object} appData - HTMLのフォームから送られてくるオブジェクト
 * @returns {Object} 成功メッセージ
 */
function addApp(appData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('アプリ一覧');
    if (!sheet) {
      throw new Error('「アプリ一覧」という名前のシートが見つかりません。');
    }

    // --- 自動生成するデータ ---
    const id = Utilities.getUuid(); // 世界で一つだけのユニークなIDを生成
    const now = new Date();       // 現在の日時を取得

    // --- 書き込む行のデータを、ヘッダーの順番に合わせて作成 ---
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => {
      switch (header) {
        case 'id':
          return id;
        case 'created_at':
        case 'updated_at':
          return now;
        case 'name':
          return appData.name;
        case 'overview':
          return appData.overview;
        case 'status':
          return appData.status;
        case 'next_action':
          return appData.next_action;
        default:
          return ''; // 上記以外で、フォームにない項目は空欄にしておく
      }
    });

    // --- シートの最終行に新しいデータを書き込む ---
    sheet.appendRow(newRow);

    return { status: 'success', message: '新しいアプリを追加しました。' };

  } catch (e) {
    console.error('データの追加中にエラーが発生しました: ' + e.message);
    throw new Error('データの追加中にエラーが発生しました：' + e.message);
  }
}