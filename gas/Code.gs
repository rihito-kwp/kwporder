// ============================================
// KicksWrap 発注自動化 — メインスクリプト
// ============================================
//
// /dev コマンドで Phase ごとに実装していきます。
// 最初は中身が空の関数だけ並んでいます。
//

// ──────────────────────────────────────────
// Phase A: 在庫チェック
// 在庫管理スプシを読み取り、閾値を下回った商品を見つける
// ──────────────────────────────────────────

function checkInventory() {
  // A-1: スプレッドシートからデータ取得
  const ss = SpreadsheetApp.openById(CONFIG.INVENTORY_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.INVENTORY_SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('データがありません');
    return;
  }

  // 2行目からデータ取得（A〜I列）
  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  // A-2: 商品ごとに閾値チェック
  const alerts = [];

  data.forEach(function(row) {
    const sku            = row[0]; // A列: 日本管理SKU
    const productName    = row[1]; // B列: 日本管理商品名
    const nationalStock  = row[2]; // C列: 国立倉庫現在庫
    const fbaStock       = row[3]; // D列: Amazon(FBA)在庫
    const combinedStock  = row[4]; // E列: 国立+Amazon合算在庫
    const monthlySales   = row[5]; // F列: 月間売上合計
    const shopifySales   = row[6]; // G列: Shopify月間売上
    const wholesaleSales = row[7]; // H列: 卸月間売上
    const amazonSales    = row[8]; // I列: Amazon月間売上

    // SKUまたは月間売上が空の行はスキップ
    if (!sku || !monthlySales || monthlySales === 0) return;

    const monthsRemaining = combinedStock / monthlySales;
    const threshold = 2.0; // 2ヶ月分を切ったらアラート

    if (monthsRemaining < threshold) {
      alerts.push({
        sku: sku,
        name: productName,
        nationalStock: nationalStock || 0,
        fbaStock: fbaStock || 0,
        stock: combinedStock,
        monthlySales: monthlySales,
        shopifySales: shopifySales || 0,
        wholesaleSales: wholesaleSales || 0,
        amazonSales: amazonSales || 0,
        monthsRemaining: Math.round(monthsRemaining * 10) / 10, // 小数点1桁
        suggestedOrder: Math.ceil(monthlySales * 3 - combinedStock), // 3ヶ月分になるよう補充
      });
    }
  });

  Logger.log('チェック完了: ' + data.length + '商品中 ' + alerts.length + '件アラート');

  // A-3: アラートがあれば発注下書き生成 → 通知へ
  if (alerts.length > 0) {
    const draft = generateDraft(alerts);
    notify(alerts, draft);
  } else {
    Logger.log('発注検討が必要な商品はありません');
  }
}


// ──────────────────────────────────────────
// Phase B: Slack通知
// 発注検討アラートをSlackに送る
// ──────────────────────────────────────────

function notify(alerts, draft) {
  // B-1: アラート情報を整形
  const lines = alerts.map(function(item) {
    return [
      '*' + item.sku + '* — ' + item.name,
      '　在庫　｜ 国立: ' + item.nationalStock + '個　FBA: ' + item.fbaStock + '個　合計: *' + item.stock + '個*',
      '　月販　｜ Shopify: ' + item.shopifySales + '個　卸: ' + item.wholesaleSales + '個　Amazon: ' + item.amazonSales + '個　合計: ' + item.monthlySales + '個',
      '　残り *' + item.monthsRemaining + 'ヶ月分* → 発送指示推奨: *' + item.suggestedOrder + '個*（3ヶ月分まで補充）',
    ].join('\n');
  });

  const message = [
    '📦 *KicksWrap 発注検討アラート*',
    '国内在庫が2ヶ月分を下回っている商品があります。\n',
    lines.join('\n\n'),
    draft ? '\n\n---\n📝 *発注下書き（Chatwork用）*\n\n' + draft : '',
  ].join('\n');

  // B-2: Slack Webhook にPOST
  const payload = JSON.stringify({ text: message });
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
  };

  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
  Logger.log('Slack通知送信完了: ' + alerts.length + '件');
}


// ──────────────────────────────────────────
// Phase D: Gemini APIで発注判断（後から追加）
// 発注者.mdをプロンプトにして発注下書きを生成する
// ──────────────────────────────────────────

function generateDraft(alerts) {
  const today = new Date();
  const dateStr = (today.getMonth() + 1) + '月' + today.getDate() + '日';

  const lines = alerts.map(function(item) {
    return [
      '【発送依頼】',
      '商品名：' + item.sku,
      '数量：' + item.suggestedOrder + '個',
      '作業内容：PKG梱包',
      '',
    ].join('\n');
  });

  const draft = [
    'お世話になっております。',
    '以下の商品について、日本への発送をお願いいたします。',
    '',
    lines.join('\n'),
    'お手数おかけしますが、よろしくお願いいたします。',
  ].join('\n');

  return draft;
}


// ──────────────────────────────────────────
// Phase E: 月次レポート（後から追加）
// ──────────────────────────────────────────

// function monthlyReport() {
//   // E-1: 発注ログを集計
//   // E-2: Claude APIで傾向分析
//   // E-3: Notionにレポートページ作成
//   // → /dev Phase E で実装
// }
