# 集金記録 Discord Bot

`入金+名前+金額` のようなメッセージに反応する、サークル・イベント向けの集金記録 Bot です。

## できること

| コマンド | 説明 |
|---|---|
| `/一覧` `/総額` `/未集金` `/入金` `/削除` 等 | Discord の `/` メニュー（推奨） |
| `入金+名前+金額` | 入金を記録（テキスト。Message Content Intent 必須） |
| `出金+名前+金額` | 出金・減額を記録 |
| `総額` / `未集金` / `一覧` | 集計表示 |
| `登録+名前+目標金額` | 名簿に追加 |
| `目標+金額` / `目標+名前+金額` | 目標設定 |
| `削除+入力者+削除対象+理由` | テキストでも削除可 |
| `履歴` / `取消` / `リセット確認` / `ヘルプ` | その他 |

括弧 `()` / `（）` で囲んでも同じように動きます。金額は `1,000` や `1000円` も受け付けます。  
データは **チャンネルごと** に独立保存されます。

## 常時オンライン運用（推奨: bot-hosting.net）

他の Bot と同じ [bot-hosting.net](https://bot-hosting.net/) で動かせます（無料・24時間稼働）。

### 1. Discord Developer Portal

1. [Discord Developer Portal](https://discord.com/developers/applications) で Application を開く
2. **Bot** → Token を控える
3. **Privileged Gateway Intents** で **MESSAGE CONTENT INTENT** を ON → Save
4. Application ID を控える（`DISCORD_CLIENT_ID`）

### 2. bot-hosting.net でデプロイ作成

1. [bot-hosting.net](https://bot-hosting.net/) にログイン
2. **New Deployment** → **Application**
3. Runtime: **Node.js**（v18 以上）
4. Source: **ZIP** または **GitHub**（このリポジトリ）

### 3. ファイル配置

ZIP を使う場合:

1. `scripts/pack-bot-hosting.sh` で作った ZIP をアップロード（または GitHub から取得）
2. Files で解凍し、**ルート直下**に `package.json` と `src/` がある状態にする
3. **`node_modules` はアップロードしない**（起動時に自動インストール）

Startup 設定:

| 項目 | 値 |
|---|---|
| Entry File (`STARTUP_FILE`) | `src/index.js` |

### 4. Environment Variables

パネルの **Environment Variables**（または `.env`）に設定:

| 変数名 | 必須 | 値 |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot トークン |
| `DISCORD_CLIENT_ID` | ✅ | Application ID |
| `DISCORD_GUILD_ID` | 推奨 | Discord サーバー ID（スラッシュ即時反映） |

※ `PORT` / `ENABLE_HEALTH` は **不要**（Discord Bot にはヘルスチェック不要）

### 5. 起動

1. **Start** を押す
2. Console に `ログイン完了: DG#xxxx` が出れば OK
3. 名簿が空なら、バックアップから **自動復元**されます（初回のみ）
4. Discord で `/一覧` または `一覧` を試す

### トラブルシュート

| 症状 | 対処 |
|---|---|
| `DISCORD_TOKEN が未設定` | Env Variables に `DISCORD_TOKEN` を追加して再起動 |
| `TokenInvalid` | Developer Portal で Reset Token → 変数を更新 |
| `Cannot find module` | `package.json` がルートにあるか確認。再起動で依存関係を入れ直す |
| `アプリケーションが応答しません` | Bot がオフライン。Console で起動ログを確認。**二重起動しない** |
| 名簿が空 | 再起動で自動復元。だめなら `scripts/backups/` を確認 |

## ローカルで動かす

```bash
npm install
cp .env.example .env
# .env に DISCORD_TOKEN を書く
npm start
```

## ZIP の作り方

```bash
bash scripts/pack-bot-hosting.sh /tmp/collection-bot.zip
```

## 使い方の例

```text
目標+3000
登録+太郎+3000
入金+太郎+3000
一覧

# または Discord の / メニュー
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

データファイルは `data/<channelId>.json` に保存されます（`.gitignore` 済み）。
