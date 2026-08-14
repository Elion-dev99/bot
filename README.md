# 集金記録 Discord Bot

`入金+名前+金額` のようなメッセージに反応する、サークル・イベント向けの集金記録 Bot です。

## できること

| コマンド | 説明 |
|---|---|
| `入金+名前+金額` | 入金を記録 |
| `出金+名前+金額` | 出金・減額を記録 |
| `総額` | 集金済みの全額を計算して送信 |
| `未集金` | 未集金の人・金額・未入金総額を送信 |
| `登録+名前+目標金額` | 名簿に追加 |
| `目標+金額` | デフォルトの目標金額を設定 |
| `目標+名前+金額` | 個人の目標を変更 |
| `/削除`（スラッシュ） | Discordの `/` メニューから削除（入力者・削除対象・理由） |
| `削除+入力者+削除対象の名前+理由` | テキストでも削除可 |
| `一覧` | 全員の入金状況 |
| `履歴` | 直近の取引履歴 |
| `取消` | 直前の入金/出金を取り消し |
| `リセット確認` | チャンネルのデータを全消去 |
| `ヘルプ` | コマンド一覧 |

括弧 `()` / `（）` で囲んでも同じように動きます。金額は `1,000` や `1000円` も受け付けます。  
データは **チャンネルごと** に独立保存されるので、用途別にチャンネルを分ければ並行運用できます。

## セットアップ

### 1. Discord Developer Portal

1. [Discord Developer Portal](https://discord.com/developers/applications) で Application を開く
2. 左メニュー **Bot** → **Reset Token**（または Add Bot）で **Token** を控える
3. 同じ画面の **Privileged Gateway Intents** で **MESSAGE CONTENT INTENT** を ON → Save
4. Application ID（Client ID）は `.env` の `DISCORD_CLIENT_ID` に入れる

### 2. このリポジトリ

```bash
npm install
cp .env.example .env
# .env の DISCORD_TOKEN にトークンを貼る
npm start
```

起動時にスラッシュコマンド `/削除` を自動登録します。手動登録する場合:

```bash
npm run register-commands
```

すぐにサーバーへ反映したいときは `.env` に `DISCORD_GUILD_ID`（サーバーID）を書いてから登録してください。グローバル登録は反映まで最大約1時間かかることがあります。

招待リンクの表示:

```bash
npm run invite
```

※ 招待リンクには `applications.commands` スコープが含まれます。すでに Bot を入れているサーバーでは、同じリンクで権限を追加し直してください。

任意で `ALLOWED_CHANNEL_IDS` にチャンネル ID をカンマ区切り指定すると、そのチャンネルだけ反応します。

## 常時オンライン（24時間稼働）

Discord Bot は **プロセスが動いている間だけ** オンライン表示になります。PC のターミナルで `npm start` したあと PC をスリープさせたり、ターミナルを閉じると Bot はオフラインになります。

常時オンラインにするには、VPS やクラウド上で Bot を起動し続けてください。

### 方法 A: Docker（おすすめ）

```bash
cp .env.example .env
# .env に DISCORD_TOKEN などを設定

docker compose up -d --build
docker compose logs -f bot   # ログ確認
```

`restart: unless-stopped` により、サーバー再起動後も自動で Bot が立ち上がります。集金データは Docker ボリューム `bot-data` に保存されます。

### 方法 B: PM2（VPS / 常時起動サーバー）

```bash
npm install
npm install -g pm2
cp .env.example .env
# .env を編集

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 表示されたコマンドを実行すると OS 再起動後も自動起動
```

### 方法 C: Railway / Fly.io など

1. このリポジトリをデプロイ先に接続
2. **Worker / Background** タイプのサービスとして作成（Web サーバーではなく常駐プロセス）
3. 環境変数 `DISCORD_TOKEN`（必須）、`DISCORD_CLIENT_ID`（推奨）を設定
4. 起動コマンド: `node src/index.js`（または Dockerfile を使用）

### オフラインになる主な原因

| 原因 | 対処 |
|---|---|
| `npm start` した PC を閉じた / スリープ | Docker や VPS で常時稼働させる |
| プロセスがクラッシュした | `docker compose` や PM2 の自動再起動を使う |
| `DISCORD_TOKEN` が無効・再発行された | Developer Portal でトークンを再取得し `.env` を更新 |
| MESSAGE CONTENT INTENT が OFF | Developer Portal で ON にして Bot を再起動 |

起動ログに `ログイン完了: Bot名#1234` が出ていれば Discord 上ではオンラインです。切断時は `[shard 0] Discord から切断` のログが出ます（discord.js が自動再接続します）。

## 使い方の例

```text
目標+3000
登録+太郎
登録+花子+3000
登録+次郎+3000

入金+太郎+3000
入金+花子+1500

総額
未集金
一覧

# Discord で / を押し、削除 を選択
# 入力者 / 削除対象の名前 / 理由 を入力
```

テキストでも同じ削除ができます: `削除+管理者+次郎+退会のため`

## 追加で入れた機能

必須要件に加えて、運用でよく欲しくなるものを入れています。

- **名簿登録 / 目標金額** … 「未集金」を出すには目標が必要なので、`登録` と `目標` を用意
- **一覧** … 完了・未完了を一目で確認
- **履歴 / 取消** … 打ち間違いにすぐ戻せる
- **リセット確認** … 事故防止のため二段階
- **チャンネル別保存** … 複数の集金プロジェクトを同居可能
- **スラッシュコマンド `/削除`** … Discordの `/` メニューから入力者・対象・理由つきで削除

### さらに足すと便利そうなもの（未実装）

必要なら続きで実装できます。

1. **締切リマインド** … 毎週決まった曜日に未集金者へメンション通知
2. **CSV / スプレッドシート出力** … `エクスポート` で会計提出用データを生成
3. **管理者限定コマンド** … リセットや出金を特定ロールのみに制限
4. **部分入金の進捗バー** … 一覧に視覚的な達成率表示
5. **他コマンドのスラッシュ化** … `/入金` `/総額` なども `/` メニューへ

## 開発

```bash
npm test              # パーサ・コマンドのユニットテスト
npm run register-commands  # スラッシュコマンドを Discord に登録
npm run dev           # ファイル変更で自動再起動
```

データファイルは `data/<channelId>.json` に保存されます（`.gitignore` 済み）。
