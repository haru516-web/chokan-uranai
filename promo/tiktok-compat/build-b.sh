#!/usr/bin/env bash
# TikTok 動画「既読ついたのに返信こない夜」（20秒・1080×1920・30fps）を作る。
#   1. record.mjs で scene.html を1コマずつ撮る
#   2. ffmpeg で、やさしい和音の伴奏と、場面の切り替わりのきらめき音を作る（外部の音源は使わない）
#   3. 映像と音を合わせて out/ に書き出す。TikTok 側で流行りの曲を付けたいとき用に、無音版も出す。
set -euo pipefail
cd "$(dirname "$0")"
OUT=out; mkdir -p "$OUT/work"
# 作業用の一時ファイルは出力フォルダ（Gitに入れない）に置き、終わったら消す
export TEMP="$PWD/$OUT/work" TMP="$PWD/$OUT/work" TMPDIR="$PWD/$OUT/work"
FR=$(mktemp -d); trap 'rm -rf "$FR"' EXIT
node record.mjs "$FR" scene-b.html

DUR=20
# 伴奏：F・Am・B♭・C の和音を4秒ずつ、ゆっくり揺らした正弦波で。最後はフェードアウト。
chord() { # $1..$3 周波数
  echo "(sin(2*PI*$1*t)+0.8*sin(2*PI*$2*t)+0.7*sin(2*PI*$3*t)+0.4*sin(2*PI*$1/2*t))*(0.55+0.45*sin(2*PI*0.25*t-PI/2))"
}
PAD="0.06*( if(lt(mod(t,16),4), $(chord 349.2 440 523.3), if(lt(mod(t,16),8), $(chord 440 523.3 659.3), if(lt(mod(t,16),12), $(chord 466.2 587.3 698.5), $(chord 523.3 659.3 784)))) )"
# きらめき：場面の頭で、減衰する高い音を鳴らす
bell() { echo "if(gte(t,$1), 0.22*exp(-(t-$1)*5)*(sin(2*PI*$2*(t-$1))+0.5*sin(2*PI*$2*2.01*(t-$1))), 0)"; }
SFX="$(bell 0.35 1318.5)+$(bell 1.0 880)+$(bell 1.75 987.8)+$(bell 3.3 1318.5)+$(bell 4.5 1046.5)+$(bell 5.1 1174.7)+$(bell 7.0 784)+$(bell 7.7 987.8)+$(bell 8.5 1568)+$(bell 9.95 2093)+$(bell 10.1 1568)+$(bell 13.8 1318.5)+$(bell 15.9 1046.5)+$(bell 16.3 1568)+$(bell 18.65 2093)"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='$PAD+$SFX':s=48000:d=$DUR" \
  -af "afade=t=in:d=0.3,afade=t=out:st=$((DUR-2)):d=2,aecho=0.8:0.6:180:0.25,alimiter=limit=0.9" -c:a pcm_s16le "$FR/music.wav"

ffmpeg -y -loglevel error -framerate 30 -i "$FR/%05d.jpg" -i "$FR/music.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/tiktok-compat-read.mp4"
ffmpeg -y -loglevel error -framerate 30 -i "$FR/%05d.jpg" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -movflags +faststart "$OUT/tiktok-compat-read-silent.mp4"
# 表紙（TikTok のカバー用）：結果が出た瞬間のコマ
cp "$FR/$(printf "%05d" 300).jpg" "$OUT/cover.jpg"
rm -rf "$FR"
echo "done: $OUT/tiktok-compat-read.mp4"
