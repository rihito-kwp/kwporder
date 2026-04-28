#!/usr/bin/env python3
"""KicksWrap 発注エージェント — GitHub Actions で毎日実行"""

import os
import sys
from pathlib import Path

import anthropic
import requests

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
SHEET_CSV_URL     = os.environ["SHEET_CSV_URL"]
SLACK_WEBHOOK     = os.environ["SLACK_WEBHOOK"]

REPO_ROOT = Path(__file__).parent.parent


def load_knowledge() -> str:
    parts = []

    p = REPO_ROOT / "発注者.md"
    if p.exists():
        parts.append(f"# 発注者ルール\n{p.read_text('utf-8')}")

    for f in sorted((REPO_ROOT / "knowledge").glob("*.md")):
        parts.append(f"# ナレッジ: {f.name}\n{f.read_text('utf-8')}")

    t = REPO_ROOT / "templates" / "hanchu.md"
    if t.exists():
        parts.append(f"# 発注テンプレート\n{t.read_text('utf-8')}")

    return "\n\n---\n\n".join(parts)


def load_products() -> str:
    parts = []
    for f in sorted((REPO_ROOT / "products").glob("*.md")):
        if f.name.startswith("_"):
            continue
        parts.append(f"## {f.stem}\n{f.read_text('utf-8')}")
    return "\n\n".join(parts)


def fetch_inventory_csv() -> str:
    resp = requests.get(SHEET_CSV_URL, timeout=30)
    resp.raise_for_status()
    return resp.text


def run_agent(knowledge: str, products: str, inventory_csv: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # ナレッジ・商品マスタは変化が少ないのでプロンプトキャッシュを適用
    system = [
        {
            "type": "text",
            "text": (
                "あなたはKicksWrapの発注エージェントです。\n"
                "以下のルールと商品マスタに従い、在庫データから発注判断を行ってください。\n\n"
                "## ルール・ナレッジ\n\n" + knowledge
            ),
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": "## 商品マスタ（products/*.md）\n\n" + products,
            "cache_control": {"type": "ephemeral"},
        },
    ]

    user = f"""今日の在庫データを分析して、以下の2つを出力してください。

## 在庫データ（CSV）
列構成（2行目からデータ）:
- A列: 日本管理SKU
- B列: 商品名
- C列: 国立倉庫在庫
- D列: Amazon(FBA)在庫
- E列: 合算在庫（C+D）
- F列: 月間売上合計
- G列: Shopify月販
- H列: 卸月販
- I列: Amazon月販

```csv
{inventory_csv}
```

## 出力1：発注検討リスト
残月数（E÷F）が2.0未満の商品を以下の形式で一覧表示してください。
SKUまたは月間売上が空・0の行はスキップしてください。

| SKU | 商品名 | 合算在庫 | 月間売上 | 残月数 |
|-----|--------|----------|----------|--------|

## 出力2：Chatwork発注下書き
発注検討リストの商品について、ヲヲフェニックスへのChatwork発注依頼文を作成してください。
- 液体商品（DRY・SR・YR・FC-200・CW・LC系）は EMS便② 形式
- それ以外は 快速船便③ 形式
- templates/hanchu.md の形式に従う
- 数量は3ヶ月分になるよう補充（現在庫との差分）
- キット商品は構成品を個別に記載
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )

    usage = response.usage
    print(
        f"  → tokens: input={usage.input_tokens}, "
        f"cache_read={getattr(usage, 'cache_read_input_tokens', 0)}, "
        f"cache_write={getattr(usage, 'cache_creation_input_tokens', 0)}, "
        f"output={usage.output_tokens}"
    )

    return response.content[0].text


def post_to_slack(text: str):
    resp = requests.post(SLACK_WEBHOOK, json={"text": text}, timeout=10)
    resp.raise_for_status()


def main():
    print("📦 KicksWrap 発注エージェント起動")

    print("▶ ナレッジ・商品マスタを読み込み中...")
    knowledge = load_knowledge()
    products  = load_products()
    print(f"  → knowledge: {len(knowledge):,} chars, products: {len(products):,} chars")

    print("▶ 在庫データを取得中...")
    try:
        inventory_csv = fetch_inventory_csv()
        row_count = inventory_csv.count("\n")
        print(f"  → {row_count} 行取得")
    except Exception as e:
        print(f"❌ 在庫データ取得失敗: {e}", file=sys.stderr)
        sys.exit(1)

    print("▶ Claude に分析を依頼中...")
    try:
        result = run_agent(knowledge, products, inventory_csv)
    except Exception as e:
        import traceback
        print(f"❌ Claude API エラー: {e}", file=sys.stderr)
        print("--- traceback ---", file=sys.stderr)
        traceback.print_exc()
        # API key の文字種を検査（値は出さない）
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        non_ascii = [(i, c, hex(ord(c))) for i, c in enumerate(key) if ord(c) > 127]
        print(f"--- API key validation: len={len(key)}, non-ascii chars at: {non_ascii}", file=sys.stderr)
        sys.exit(1)

    slack_text = f"📦 *KicksWrap 発注検討アラート*\n\n{result}"

    print("▶ Slack に送信中...")
    try:
        post_to_slack(slack_text)
        print("✅ Slack送信完了")
    except Exception as e:
        print(f"❌ Slack送信失敗: {e}", file=sys.stderr)

    print("\n" + "=" * 60)
    print(result)


if __name__ == "__main__":
    main()
