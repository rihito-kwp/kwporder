# GAS開発ナビゲーター

GASの実装をステップバイステップでガイドするスキル。
すべての応答を日本語で行うこと。

## 前提
- 発注者.md と商品別ルールが記入済みであること
- 未完成なら「先に /build-knowledge でナレッジを作りましょう」と案内して終了
- GASはGoogle Apps Scriptエディタ（script.google.com）で実装する
- Claude APIは後付け設計。Phase A〜Cを先に作り、Phase DでAPIを組み込む

## Steps

### Step 1: 前提確認

1. 発注者.md を読んで完成度をチェック。未記入セクションがあれば警告
2. gas/Config.gs を読んで、設定の記入状況を確認
3. gas/Code.gs を読んで、実装済みの関数を把握

### Step 2: 実装ステップの案内

```
📊 開発の進捗

[✅ or ⬜] Phase A: 在庫チェック（スプシ読み取り → 閾値判定）
[✅ or ⬜] Phase B: Slack通知（アラート → Slack投稿）
[✅ or ⬜] Phase C: 定期実行（GASトリガー設定）
[⬜] Phase D: Claude API追加（APIキー発行後）
[⬜] Phase E: 承認フロー + 月次レポート

どのPhaseに取り組みますか？（番号 or 「次」で未完了の最初から）
```

### Step 3: 選択されたPhaseを実装

各Phaseの実装内容：

**Phase A: 在庫チェック**
1. Config.gs にスプレッドシートIDを記入してもらう（URLからIDの取り出し方も案内）
2. Code.gs の checkInventory() に在庫データ読み取りロジックを実装
3. 発注者.md の閾値を参照して判定ロジックを実装
4. テスト実行方法を案内 → 動作確認

**Phase B: Slack通知**
1. Slack Appの作成手順を案内（Incoming Webhook）
2. Config.gs にWebhook URLを記入
3. notify() にSlack投稿ロジックを実装
4. テスト通知を送って確認

**Phase C: 定期実行**
1. GASトリガーの設定手順を案内（gas/README.md 参照）
2. 日次実行を設定
3. 翌日にログを確認して動作テスト

**Phase D: Claude API追加（APIキー発行後）**
1. Config.gs のClaude API設定をコメント解除
2. APIキーを記入
3. GitHub連携（発注者.mdの自動取得）を実装
4. generateDraft() にClaude API呼び出しを実装
5. 発注者.md → system_prompt、在庫データ → user入力の構成
6. レスポンスパース → 発注下書き生成
7. 通知に下書きを含めるようnotify()を拡張

**Phase E: 承認フロー + 月次レポート**
1. Slack Interactive Message（承認ボタン）の実装
2. 承認 → 発注ログ記録
3. 月次集計 + Notion API連携
4. 月末トリガー設定

### Step 4: 実装の進め方

各ステップで以下の流れ：
1. 何を実装するか、なぜ必要かを簡潔に説明
2. gas/ フォルダのファイルにコードを書く
3. 「これをGASエディタにコピペしてください」と案内
4. テスト方法を具体的に伝える（どの関数を実行する、何が表示されればOK）
5. 動作確認できたら次のステップへ

## 注意事項
- コードを書いたら必ずテスト手順とセットで案内する
- GASエディタの操作は画面の見え方レベルで具体的に伝える
- エラーが出たらログの見方を教える（「実行ログ」タブ）
- APIキー等の機密情報はConfig.gsにのみ記載し、GitHubにはpushしない旨を伝える
