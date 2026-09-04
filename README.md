# 集金記録 Discord Bot

`入金+名前+金額` のようなメッセージに反応する、サークル・イベント向けの集金記録 Bot です。

## できること

| コマンド | 説明 |
|---|---|
| `/一覧` `/総額` `/未集金` `/入金` `/削除` 等 | Discord の `/` メニュー（推奨） |
| `入金+名前+金額` など | テキストコマンド（MESSAGE CONTENT INTENT 必須） |
| `一覧` / `総額` / `未集金` / `履歴` / `取消` | 集計・履歴 |
| `登録` / `目標` / `削除` | 名簿管理 |

データはチャンネルごとに `data/<channelId>.json` へ保存されます。

## 常時オンラインの置き場所（Railway / bot-hosting 無料枠が使えない場合）

| 候補 | 無料枠の目安 | 向き |
|---|---|---|
| **[Discloud](https://discloud.app/)** | 無料プランあり（Bot 可） | いちばん手軽（推奨） |
| **[Quaxly](https://quaxly.com/)** | **最大3 Bot** / 512MB 共有 | すでに1枠使っている人向け |
| [Kerit Cloud](https://kerit.cloud/free-discord-bot-hosting) | 無料・24/7 主張 | 代替 |
| 手元 PC + PM2 | 電気代のみ | PC を常時つけられる場合 |

※ [bot-hosting.net](https://bot-hosting.net/) は無料 **1枠** なので、他 Bot で埋まっている場合は使えません。

---

## 推奨: Discloud でデプロイ

1. [Discloud](https://discloud.app/) でアカウント作成（無料プラン）
2. このリポジトリを ZIP にする（`node_modules` なし）  
   ```bash
   npm run pack:hosting
   ```
3. Dashboard で ZIP をアップロード（または Discord 上の Discloud Bot で `.upconfig`）
4. ルートに `discloud.config` があること（リポジトリに同梱済み）
5. 環境変数を設定:

| 変数 | 必須 | 値 |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot トークン |
| `DISCORD_CLIENT_ID` | ✅ | `1533753341639786607` |
| `DISCORD_GUILD_ID` | 推奨 | Discord サーバー ID |

6. Start → ログに `ログイン完了:` が出れば OK  
7. 名簿は初回起動でバックアップから **自動復元**されます

`discloud.config` の要点:

```ini
TYPE=bot
MAIN=src/index.js
START=npm start
RAM=100
```

---

## 代替: Quaxly（無料で最大3 Bot）

1. [quaxly.com](https://quaxly.com/) でサインアップ
2. ZIP または Git でデプロイ
3. Secrets に `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` / `DISCORD_GUILD_ID` を設定
4. Start

---

## Discord Developer Portal 設定

1. [Developer Portal](https://discord.com/developers/applications) → Bot Token
2. **MESSAGE CONTENT INTENT** を ON
3. 招待リンク: `npm run invite`（`applications.commands` 付き）

## ローカル起動

```bash
npm install
cp .env.example .env
npm start
```

## 配布 ZIP

```bash
npm run pack:hosting
# → /tmp/collection-discord-bot-hosting.zip
```

## 使い方の例

```text
一覧
総額
入金+太郎+3000

# または /
/一覧
/入金
/削除
```

## 開発

```bash
npm test
npm run register-commands
npm run restore-roster
```
