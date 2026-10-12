# RETRO TETRIS

スマートフォンブラウザ向けの、Modern Retro Pixel ArcadeスタイルのEndless Tetrisです。

## 特徴

- 10×20盤面
- 7-Bag Randomizer
- SRS系回転・Wall Kick
- HOLD
- NEXT 3〜5
- Ghost Piece
- Soft Drop / Hard Drop
- Touch Gesture + 画面ボタン + キーボード
- DAS/ARR相当の長押し操作
- T-Spin / B2B / Combo / Perfect Clear
- レベル・Gravity
- ローカル記録
- 設定
- Web Audio APIによるSE
- Haptic Feedback
- PWA / Service Worker
- オフライン動作

## 無料で起動する方法

ローカルファイルを `file://` で開くのではなく、ローカルHTTPサーバーを使ってください。

Pythonが入っている場合：

```bash
python -m http.server 8000
```

その後、

http://localhost:8000/

をブラウザで開きます。

スマートフォンから同じWi-Fi経由で試す場合は、PCのローカルIPを使います。

例：

http://192.168.1.10:8000/

## 無料公開

GitHub Pagesなどの静的ホスティングに、このフォルダをそのままアップロードできます。

外部APIや有料サービスは使用していません。

## 注意

これはオリジナルのレトロゲーム風UIを採用した実装です。特定の市販テトリス製品の画像・音源・ロゴをコピーしていません。
