function doGet(){
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('自作アプリ管理ツール');
}

function getAppsData (){
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('アプリ一覧');
    if (!sheet){
      throw new Error('「アプリ一覧」という名前のシートが見つかりません。');     
    }
    const data = sheet.getDataRange().getValues();
    const headers = data.shift  ();

    const apps = data.map(row => {
      const appObject = {};
      headers.forEach((header, index) => {
        if (row[index] instanceof Date){
          appObject[header] = row[index].toLocaleDateString();
        }else{
          appObject[header] = row[index];
        }
      });
      return appObject;
    });

    return apps;

  } catch (e) {
    console.error('データの取得中にエラーが発生しました：　' + e.message);
    return [];
  }
}


