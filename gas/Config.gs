// ============================================
// 設定ファイル
// ここに各種IDやURLを記入してください
// ============================================

const CONFIG = {
  // ─── スプレッドシート ───
  // URLの /d/ と /edit の間にある長い文字列がID
  // 例: https://docs.google.com/spreadsheets/d/ここがID/edit

  // 在庫管理スプレッドシート
  INVENTORY_SHEET_ID: '',     // ← ここにIDを貼り付け
  INVENTORY_SHEET_NAME: '',   // ← シート名（下のタブに表示されてる名前）

  // 卸注文ログスプレッドシート
  WHOLESALE_SHEET_ID: '',     // ← ここにIDを貼り付け
  WHOLESALE_SHEET_NAME: '',   // ← シート名

  // ─── Slack ───
  // Slack App の Incoming Webhook URL
  SLACK_WEBHOOK_URL: '',      // ← ここにURLを貼り付け

  // ─── Claude API（Phase Dで有効化。それまでコメントのまま） ───
  // CLAUDE_API_KEY: '',
  // CLAUDE_MODEL: 'claude-sonnet-4-6',

  // ─── GitHub（発注者.md取得用。Phase Dで有効化） ───
  // GITHUB_TOKEN: '',
  // GITHUB_REPO: 'ユーザー名/kickswrap-ordering',
  // GITHUB_FILE_PATH: '発注者.md',
};
