# 集金記録 Discord Bot

`入金+名前+金額` のようなメッセージに反応する、サークル・イベント向けの集金記録 Bot です。

## できること

| コマンド | 説明 |
|---|---|
| `/一覧` `/総額` `/未集金` 等（スラッシュ） | Discord の `/` メニューから操作（**Railway 推奨**） |
| `入金+名前+金額` | 入金を記録（テキスト。Message Content Intent 必須） |
| `出金+名前+金額` | 出金・減額を記録 |
| `総額` | 集金済みの全額を計算して送信 |
| `未集金` | 未集金の人・金額・未入金総額を送信 |
| `登録+名前+目標金額` | 名簿に追加 |
| `目標+金額` | デフォルトの目標金額を設定 |
| `目標+名前+金額` | 個人の目標を変更 |
| `/削除`（スラッシュ） | 名簿から削除（入力者・削除対象・理由） |
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

起動時にスラッシュコマンド（`/一覧` `/総額` `/入金` `/削除` 等）を自動登録します。

## Railway で常時オンライン運用（推奨）

1. [Railway](https://railway.com/) で GitHub リポジトリを Import
2. **Variables** に以下を設定:

| 変数名 | 必須 | 値 |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot トークン（Reset したら必ず更新） |
| `DISCORD_CLIENT_ID` | ✅ | `1533753341639786607` |
| `DISCORD_GUILD_ID` | 推奨 | サーバー ID（スラッシュ即時反映） |
| `DATA_DIR` | 任意 | **Volume を付けたときだけ** `/data` |

3. **Volume** を追加し、マウントパス `/data` に設定（名簿を再デプロイ後も保持）
4. Deploy が成功したら Discord で `一覧` を試す

ビルドは **Nixpacks**（`npm start`）を使用します。Dockerfile は使いません。

### 再デプロイでクラッシュするとき

Railway の **Deploy Logs** を確認:

| ログ | 対処 |
|---|---|
| `DISCORD_TOKEN が未設定` | Variables にトークンを追加 |
| `Discord ログイン失敗` / `TokenInvalid` | Developer Portal で Reset Token → Railway Variables を更新 |
| `DATA_DIR=/data は使えない` | Volume を `/data` にマウントするか、`DATA_DIR` 変数を削除 |
| Healthcheck 失敗 | Settings → Healthcheck Path を **空** にする |

### コマンドが反応しないとき

**以前は動いていたのに急に反応しなくなった場合**、同じ `DISCORD_TOKEN` で Bot が **2台同時起動** している可能性が高いです（Cloud Agent・手元の PC と Railway が競合）。**Railway だけ**を起動してください。

- Railway ダッシュボードで Deploy が **Running** か確認
- 他の環境で `npm start` していないか確認
- テキストの `一覧` も引き続き使えます（Developer Portal で **MESSAGE CONTENT INTENT** が ON なら）
- 名簿が空になった場合: `npm run restore-roster`（Volume 設定後に1回実行）
- `DISCORD_CLIENT_ID` が Railway Variables に入っているか確認
- `ALLOWED_CHANNEL_IDS` を設定している場合、チャンネル ID が一致しているか確認

手動でスラッシュ登録:

```bash
npm run register-commands
```

招待リンク:

```bash
npm run invite
```

※ 招待リンクには `applications.commands` スコープが含まれます。

任意で `ALLOWED_CHANNEL_IDS` にチャンネル ID をカンマ区切り指定すると、そのチャンネルだけ反応します。

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

# Discord で / を押して使う（Railway 推奨）
/一覧
/総額
/入金 名前:太郎 金額:3000
/削除 入力者:管理者 削除対象の名前:次郎 理由:退会
```

テキストでも同じ削除ができます: `削除+管理者+次郎+退会のため`

## 追加で入れた機能

必須要件に加えて、運用でよく欲しくなるものを入れています。

- **名簿登録 / 目標金額** … 「未集金」を出すには目標が必要なので、`登録` と `目標` を用意
- **一覧** … 完了・未完了を一目で確認
- **履歴 / 取消** … 打ち間違いにすぐ戻せる
- **リセット確認** … 事故防止のため二段階
- **チャンネル別保存** … 複数の集金プロジェクトを同居可能
- **スラッシュコマンド** … `/一覧` `/総額` `/入金` `/削除` 等（Railway でも確実に動作）

### さらに足すと便利そうなもの（未実装）

必要なら続きで実装できます。

1. **締切リマインド** … 毎週決まった曜日に未集金者へメンション通知
2. **CSV / スプレッドシート出力** … `エクスポート` で会計提出用データを生成
3. **管理者限定コマンド** … リセットや出金を特定ロールのみに制限
4. **部分入金の進捗バー** … 一覧に視覚的な達成率表示
5. **目標変更のスラッシュ化** … `/目標` なども `/` メニューへ

## 開発

```bash
npm test              # パーサ・コマンドのユニットテスト
npm run register-commands  # スラッシュコマンドを Discord に登録
npm run dev           # ファイル変更で自動再起動
```

データファイルは `data/<channelId>.json` に保存されます（`.gitignore` 済み）。
