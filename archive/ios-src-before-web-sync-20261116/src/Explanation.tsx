import { useState, type ReactNode } from 'react';
import { addDays, dateKey, makeProfile, readDay, validate, tiers, type Profile } from './domain';
import { blockScoreOf, FIVE_PHASES, fivePhaseRelation, labelOf, OUTER, SEASON, solarMonthStartDate, solarStageStartDate, STAGE_POINTS, STAGES, stageFor, yearScoreOf } from './scoring';
import './explanation.css';

const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const chapters = ['まず全体像', '何を変えたか', '名札の作り方', '暦と海の対応', '五行の使い方', '実際に動かす', '点数と順位', '時間のグラフ', '文章と問い', '画面での利用', '設計判断と課題', '計算式・出典'];
const num = (v: number) => (v > 0 ? '+' : '') + v.toFixed(2);
function Block({ id, children }: { id: number; children: ReactNode }) {
  return <section id={'ex-' + id} className="ex-section"><div className="ex-number">{String(id + 1).padStart(2, '0')}</div><h2>{chapters[id]}</h2>{children}</section>;
}
function Table({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  return <div className="ex-table-scroll"><table><thead><tr>{heads.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
function Chart({ values, labels, title, caption }: { values: number[]; labels: string[]; title: string; caption: string }) {
  const min = Math.floor(Math.min(...values)) - 1, max = Math.ceil(Math.max(...values)) + 1;
  const x = (i: number) => 40 + i * 580 / (values.length - 1), y = (v: number) => 165 - (v - min) * 140 / (max - min);
  return <figure><h3>{title}</h3><svg role="img" aria-label={title + '。' + caption} viewBox="0 0 660 205">
    {[min, (min + max) / 2, max].map(v => <g key={v}><line x1="40" x2="620" y1={y(v)} y2={y(v)} stroke="#dce3ee" /><text x="3" y={y(v) + 4} fontSize="11" fill="#526079">{v.toFixed(1)}</text></g>)}
    <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="#245bdf" strokeWidth="3" />
    {values.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r="3" fill="#245bdf"><title>{labels[i]}：{v.toFixed(2)}点</title></circle>{(values.length <= 12 || i % 5 === 0 || i === values.length - 1) && <text x={x(i)} y="190" textAnchor="middle" fontSize="10" fill="#526079">{labels[i]}</text>}</g>)}
  </svg><figcaption>{caption} 縦軸は設計上の点数で、成功率や観測データではありません。</figcaption>
  <details><summary>グラフの数値を表で見る</summary><Table heads={['時点', '点数']} rows={values.map((v, i) => [labels[i], v.toFixed(2)])} /></details></figure>;
}

export function Explanation({ today, profile }: { today: Date; profile: Profile | null }) {
  const [person, setPerson] = useState(() => profile ?? makeProfile({ birth: '1990-05-15', name: '海', manual: {} }));
  const [birth, setBirth] = useState(() => profile ? `${profile.Y}-${String(profile.M).padStart(2, '0')}-${String(profile.D).padStart(2, '0')}` : '1990-05-15');
  const [name, setName] = useState(profile?.name ?? '海');
  const [dateInput, setDateInput] = useState(dateKey(today));
  const [error, setError] = useState('');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput) && Number.isFinite(Date.parse(dateInput)) ? new Date(dateInput + 'T00:00:00Z') : today;
  const r = readDay(date, person), c = r.context, t = person.t, p = r.row.p;
  const season = SEASON[t.mod], phase = (i: number) => FIVE_PHASES[i].name;
  const factors: [string, number, string][] = [
    ['自分の海の時計（海況）', p.base, `この日、あなたの時計は「${STAGES[stageFor(c, t)].n}」。並びと良し悪しは全員共通の表ですが、巡る時期は人ごとに違い、効き方の強弱（感度）もタイプで違います。`],
    ['季節 × 月相', p.moon, '季節ごとの得意な月相と実際の月相の角度差。深さによって得意な角度を少しずらします。'],
    ['深さ × 月の距離', p.depth, '月の距離を5段階に分け、深さとの組み合わせで加減点します。実際の地域別潮位は計算していません。'],
    ['月支の五行 × 季節型', p.aff, `月支の${phase(c.monthElement)}と、季節型との五行関係。`],
    ['年干・年支の五行', p.comp, `${c.yearPillar}の${phase(c.yearElement)}と${phase(c.yearBranchElement)}について、季節型との関係点を平均。`],
    ['日の波 × 日干の五行', p.day, '日支を使う12日周期の波と、日干の五行との関係点を合成。これは160タイプ順位用です。'],
    ['Aの渦', p.vor, 'Aのあるタイプに、月の距離に応じた補正。個人順位の振れ幅拡大とは別の処理です。'],
    ['−の向かい風', p.hw, '−のあるタイプは常に−1.5点。五行関係の向きを反転する処理も別にあります。'],
  ];
  const days = Array.from({ length: 30 }, (_, i) => addDays(date, i));
  const monthly = Array.from({ length: 12 }, (_, i) => blockScoreOf(c.solarYear, i, t).score);
  const years = Array.from({ length: 60 }, (_, i) => 1984 + i);
  const basePersonal = r.row.score + r.personal.delta;
  const effective = t.A ? r.mean + (basePersonal - r.mean) * 1.5 : basePersonal;

  return <article className="explainer">
    <header className="ex-hero"><span className="ex-eyebrow">潮環の中身を理解するためのページ</span><h1>何を入力して、<br />どう占いになるのか。</h1><p>海流、海況、月、五行、名札、神々、問い。それぞれの役割と、実際の計算のつながりを順に説明します。ここに載せる数値は現在のサイトの鑑定関数から計算しています。</p><div className="ex-note">読む順番：まず01〜05で全体を把握 → 06で条件を変える → 07〜09で計算と文章の関係を見る。数式は最後にまとめています。</div></header>
    <nav aria-label="解説の目次" className="ex-toc">{chapters.map((text, i) => <a href={'#ex-' + i} key={text}>{String(i + 1).padStart(2, '0')} {text}</a>)}</nav>
    <Block id={0}><p className="ex-lead">「人の固定情報」と「その日の暦」を組み合わせ、点数・順位・文章を作る仕組みです。</p>
      <div className="ex-flow"><div><b>あなたの情報</b><span>生年月日・名前の画数</span><strong>季節・深さ・−・A</strong></div><span className="ex-arrow">＋</span><div><b>時間の情報</b><span>選んだ日付</span><strong>年干支・節月・日干支・月相・距離</strong></div><span className="ex-arrow">↓</span><div className="ex-flow-result"><b>組み合わせの計算</b><span>海況点 ＋ 相性点 ＋ 日の波 ＋ 補正</span><strong>順位・三つの海・行動の文章</strong></div></div>
      <p>神々や海の生物は、計算で得たタイプや時期を、イメージや物語として読める形にする役割です。神の絵を分析して点数を決める処理はありません。</p>
      <div className="ex-note">区別したい三つ：①天文・暦の計算　②潮環が独自に決めた対応と点数　③考えを言葉にするための文章。②と③の効果や的中率を検証した実績は、現在の実装にはありません。</div></Block>
    <Block id={1}><Table heads={['対象', '変更前', '今回の実装', '意味']} rows={[
      ['年の海流', '西暦の元日で切替、12年周期', '立春を境に年の干支を切替', '既存の12海流の順序を十二支に重ねる。多くの日では以前と同じ海流で、年初の境界が変わる。'],
      ['海況', '4か月ごと、1年3区分。年により海況の位置も移動', '立春から始まる24の区間（約半月）に1海況ずつ固定', '季節の細かな移り変わりを扱う。毎年同じ時期には同じ海況が対応する。'],
      ['年との相性', '暖流・寒流と季節の一致で±2点', '年干・年支の五行関係点を平均', '同じ海流でも、12年後は年干が異なり点数が変わりうる。'],
      ['月・日との相性', '海況までの距離、日付由来の12日波', '月支・日干の五行、日支由来の波を追加', '日付と季節型の組み合わせを詳しくする。'],
      ['比較と表示', '12年・4か月単位', '年の比較は60年、海況は24区間、日干支も表示', '暦・輪・人生の海図・鑑定理由を同じ計算に接続。'],
    ]} /></Block>
    <Block id={2}><p>これは生まれた季節の分類ではありません。生年月日の数と名前の画数を使った、潮環独自の分類です。</p>
      <Table heads={['項目', '決め方', '何に使うか']} rows={[
        ['季節（4通り）', '西暦年＋月＋日の合計を4で割った余り。0冬／1春／2夏／3秋', '神・16タイプの季節、得意な月相、海の時計の起点、五行の基調'],
        ['深さ（10通り）', '下の名前の総画数を1.0〜5.5の10段階に分類', '月相の得意角度、月の距離への反応、日波の位置、16タイプの深さ'],
        ['−（2通り）', '生年月日の数字のうち、0・4・8の数と1・3・5・6・7の数が同じで、0ではないとき。2・9はこの比較で数えない', '常時−1.5点、五行関係の向き反転、日波の位置、説明文章'],
        ['A（2通り）', '生年月日と各文字の画数の数字をそれぞれ2進数にし、0と1の個数が等しいとき', '月距離の補正、日波の位置、個人順位計算で平均からの差を1.5倍'],
      ]} />
      <p><strong>160名札＝4季節 × 10深さ × 2（−）× 2（A）。</strong>図鑑の16タイプは、深さ10段階を4群にまとめた4季節×4深さです。</p>
      <details><summary>画数と深さの全対応</summary><Table heads={['総画数', '深さ']} rows={['〜9', '10〜13', '14〜16', '17〜18', '19〜21', '22〜23', '24〜26', '27〜29', '30〜34', '35〜'].map((s, i) => [s, (1 + i * .5).toFixed(1)])} /><p>図鑑の深さ群：1.0〜2.0／2.5〜3.0／3.5〜4.0／4.5〜5.5。漢字は辞書の画数を使い、不明な文字は入力で補います。かな・英字にも独自の画数対応があります。</p></details>
      <p className="ex-note">ここでの−やAは、陰陽道の陰・陽から算出した値ではありません。従来からある潮環独自のルールです。</p></Block>
    <Block id={3}><p>年・月・日を別々の速さで動かしています。年は長いテーマ、月は今の海況、日は短い変化です。</p>
      <Table heads={['周期', '実際の決め方', 'サイトの表現']} rows={[
        ['年：十二支で12年、干支の組で60年', '立春を境に年干・年支を計算', '年支の順に既存の12海流。年干と年支の五行で年の相性点。'],
        ['月：1年に12区間', '太陽黄経315°の立春から30°ずつ区切る', '月ごとの運勢は、その月の前半・後半の海況の平均。月支は寅から順に進む。'],
        ['海況：暦は1年に24区間', '太陽黄経315°の立春から15°ずつ区切る', '暦の区間を、自分の海の時計に読み替えて、24の海況のどれにあたるかを決める。'],
        ['日：干支で60日、日支で12日', '日本時間の日付からユリウス日数を計算', '日干の五行と、日支を起点とする12段階の波。'],
        ['月相・距離：連続的に変化', '日本時間正午の月の位置・距離を近似計算', '月の形・月齢・距離と、占いへの補正。'],
      ]} />
      <details><summary>12海流と十二支の全対応を見る</summary><Table heads={['年支', '海流', '表示上のテーマ']} rows={OUTER.map((o, i) => [branches[i], o.n, o.th])} /><p>テーマの並びは、十二支に伝わる古い意味（芽吹き・根づき……種に閉じる）の順を手がかりにしています。海の生き物と十二支の対応そのものに、歴史上の陰陽道としての根拠はなく、潮環独自の並びです。海流の名前とテーマは表示用で、点数の計算には使いません。</p></details>
      <p>24の海況は、季節を問わない名前で、並びと良し悪し（基礎点）は全員共通です。嵐は誰にとっても悪い海です。ただし、いつ来るか・どれだけ効くかは、人ごとに違います。</p>
      <Table heads={['順', '海況', '共通の基礎点', '意味']} rows={STAGES.map((stage, i) => [i + 1, stage.n, STAGE_POINTS[i], stage.d])} />
      <Table heads={['人ごとの違い', '決め方', '効くところ']} rows={[
        ['起点', '季節の拠点が頂点（帆満ち）に来る。深さで±2段階ずれる', '同じ日でも、タイプによって海況が違う'],
        ['毎年のずれ', '時計が暦より少し速く進む。浅瀬は1年4段階（6年で一巡）、沿岸3（8年）、沖合2（12年）、深海1（24年）', '同じ時期でも、毎年同じ流れにならない'],
        ['感度', '浅瀬×1.4・沿岸×1.15・沖合×0.9・深海×0.65。Aは×1.25。−は悪い海のときだけ×1.3', '嵐や順風が、どれだけ強く効くか'],
      ]} />
      <p className="ex-note">正午時点の値で日を分類するため、その日の午後に区切りを迎える場合、サイトの切替日は翌日になります。公式暦の二十四節気の日と必ず同じ日になる実装ではありません。太陽・月の値も近似式です。</p></Block>
    <Block id={4}><p>五行は「自分の季節型の要素」と「暦側の要素」の関係を点数に変換するために使っています。</p>
      <div className="ex-phase-row">{FIVE_PHASES.map((f, i) => <div key={f.name}><b>{f.name}</b><span>{f.action}</span><small>次の{FIVE_PHASES[(i + 1) % 5].name}を生む →</small></div>)}</div>
      <p>相生の輪：木→火→土→金→水→木。相剋の関係：木→土、火→金、土→水、金→木、水→火。潮環ではこの関係を、次の独自の点数にしています。</p>
      <Table heads={['時の要素と自分の関係', '画面での呼称', '点数', '設計意図']} rows={[
        ['同じ要素', '同気', '+1.2', '同じ働きが重なる'], ['時の要素が自分を生む', '相生', '+1.8', '流れから支えを受ける'], ['自分が時の要素を生む', '流出', '−0.6', '外へ力を渡す'], ['自分が時の要素を剋す', '調整', '+0.8', '流れに働きかける'], ['時の要素が自分を剋す', '相剋', '−1.3', '周囲から圧を受ける'],
      ]} />
      <Table heads={['季節型', '基調の五行', '海の時計が頂点（帆満ち）になる頃']} rows={SEASON.map(s => { const d = solarStageStartDate(c.solarYear, s.home * 2); return [s.n, phase(s.element), (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日ごろ（深さと年で前後する）']; })} />
      <p>春＝木、夏＝火、秋＝金、冬＝水。土の個人タイプは増やしていません。土は年・月・日の暦側に現れます。年と日の十干は甲乙＝木、丙丁＝火、戊己＝土、庚辛＝金、壬癸＝水。十二支は子亥＝水、寅卯＝木、巳午＝火、申酉＝金、丑辰未戌＝土としています。</p>
      <p className="ex-note">数値の大小と重みは潮環の設計値です。伝統からこの点数が導かれるわけではありません。年干・日干の陰陽は表示しますが、陰陽そのものを独立して加点する処理はまだありません。−型は「自分」と「時」の関係を入れ替えて五行点を計算します。</p></Block>
    <Block id={5}><p>ここから下の表と三つのグラフは、設定を変えると一緒に更新されます。このページ内の実験で、登録済みの潮札や航海帳は書き換わりません。</p>
      <div className="ex-controls"><label>占う日<input type="date" value={dateInput} onInput={e => setDateInput(e.currentTarget.value)} onChange={e => setDateInput(e.target.value)} /></label><label>生年月日<input type="date" value={birth} onInput={e => setBirth(e.currentTarget.value)} onChange={e => setBirth(e.target.value)} /></label><label>下の名前<input value={name} onChange={e => setName(e.target.value)} maxLength={30} /></label><button onClick={() => { const input = { birth, name, manual: {} }; const issue = validate(input); setError(issue); if (!issue) setPerson(makeProfile(input)); }}>生年月日と名前を適用</button></div>
      <div className="ex-day-nav"><button onClick={() => setDateInput(dateKey(addDays(date, -1)))}>← 1日前</button><b>計算中：{dateKey(date)}</b><button onClick={() => setDateInput(dateKey(addDays(date, 1)))}>1日後 →</button><button onClick={() => setDateInput(dateKey(today))}>今日に戻す</button></div>
      {error && <p role="alert" className="ex-error">{error} この実験では辞書にある文字を使ってください。適用できるまでは直前の設定を表示します。</p>}
      <div className="ex-stat-grid"><div><small>適用中の人物</small><b>{person.name} ／ {person.Y}.{person.M}.{person.D}</b><span>総画数 {person.total} → {labelOf(t)}</span></div><div><small>年の海流</small><b>{c.yearPillar} ／ {OUTER[c.outer].n}</b><span>年干 {phase(c.yearElement)}・年支 {phase(c.yearBranchElement)}</span></div><div><small>節月の海況</small><b>{c.solarMonthTerm} ／ {STAGES[c.stage].n}</b><span>月支 {c.monthBranch}＝{phase(c.monthElement)}</span></div><div><small>日の情報</small><b>{c.dayPillar} ／ {c.moon}</b><span>日干 {phase(c.dayElement)}・月齢 {c.age.toFixed(1)}・約{Math.round(c.dist).toLocaleString()} km</span></div></div>
      <p>この人物の季節：{person.Y}＋{person.M}＋{person.D}＝{person.Y + person.M + person.D}。4で割った余り{t.mod} → {season.n}。総画数{person.total}画 → 深さ{t.num.toFixed(1)}です。</p>
      <Table heads={['関係', '今の組み合わせ', '点数（重みづけ前）']} rows={[[ '年干', `${phase(c.yearElement)} × 自分の${phase(season.element)}`, num(fivePhaseRelation(t, c.yearElement).score)], ['年支', `${phase(c.yearBranchElement)} × 自分の${phase(season.element)}`, num(fivePhaseRelation(t, c.yearBranchElement).score)], ['月支', `${phase(c.monthElement)} × 自分の${phase(season.element)}`, num(fivePhaseRelation(t, c.monthElement).score)], ['日干', `${phase(c.dayElement)} × 自分の${phase(season.element)}`, num(fivePhaseRelation(t, c.dayElement).score)]]} />
      <p>試す順序：①占う日を1日進める → 日干支・月相・日波が変わる。②海況の区切りの前後に動かす → 海況が変わる（月支は月の区切りで変わる）。③12年後の同じ季節を見る → 同じ海流でも年干が変わる。④名前を変える → 総画数・深さ・Aなどが変わることがある。</p></Block>
    <Block id={6}><h3>① まず160タイプ全部の点数を計算する</h3><p>次の8項目を足して、点数の高い順に並べます。同点は名札の内部番号順です。</p>
      <div className="ex-bars">{factors.map(([label, value]) => <div className="ex-bar-row" key={label}><span>{label}</span><div className="ex-bar-track"><div style={{ width: Math.min(100, Math.abs(value) * 10) + '%', background: value < 0 ? '#d34c47' : '#245bdf' }} /></div><b>{num(value)}</b></div>)}</div>
      <Table heads={['項目', '点数', 'なぜ入れるのか・どう使うか']} rows={factors.map(([label, value, note]) => [label, num(value), note])} />
      <p className="ex-result">合計 {r.row.score.toFixed(2)}点 → 160タイプ中 {r.row.rank}位 → {r.outlook.title}</p>
      <p>1〜16位＝凱風、17〜56位＝順風、57〜104位＝凪、105〜144位＝荒波、145〜160位＝轟沈。順位は160種類の名札同士の相対比較で、利用者の実測順位ではありません。</p>
      <h3>② 次に「個人の日の波」で補正する</h3><p>生年月日と名前の総画数から個人の12日波の位置を出します。①の日の項目を、この個人波に置き換え、帰郷の年なら1点加えます。Aがあれば平均からの差を1.5倍にします。</p>
      <div className="ex-equation">{r.row.score.toFixed(2)} − 日の項目({p.day.toFixed(2)}) ＋ 個人波({r.personal.wave.toFixed(2)}) ＋ 帰郷({r.personal.ret}) ＝ {basePersonal.toFixed(2)}点<br />{t.A ? `A補正：平均 ${r.mean.toFixed(2)} ＋（${basePersonal.toFixed(2)} − 平均）×1.5 ＝ ${effective.toFixed(2)}点` : `A補正なし：${effective.toFixed(2)}点`}<br />→ 個人としては {r.personalRank}位相当</div>
      <div className="ex-note">現在の実装で注意したい点：個人補正は「日の項目」全体を差し替えるので、そこに含まれていた日干の五行点も相殺されます。また「今日の凱風／凪などの判定」と行動の文章は①のタイプ順位・力から決まり、②の個人順位では作り直していません。二つの結果がずれるのはこのためです。</div></Block>
    <Block id={7}><Chart title="30日間：同じ人でも日ごとに変わる" values={days.map(d => readDay(d, person).row.score)} labels={days.map(d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`)} caption="160タイプ順位を作る前の名札の合計点。月相・距離・日波・日干の五行が動き、節入りでは海況も変わります。" />
      <Chart title={`${c.solarYear}年：12か月を比べる`} values={monthly} labels={Array.from({ length: 12 }, (_, i) => (solarMonthStartDate(c.solarYear, i).getUTCMonth() + 1) + '月')} caption="月の点数＝自分の時計の海況点（前半・後半の平均、感度つき）＋月支五行×0.45＋年の五行点＋−補正。月相・月距離・日の波・A補正は含めません。日々の平均を集計したグラフではありません。" />
      <Chart title="60年：年干と年支の組み合わせを比べる" values={years.map(y => yearScoreOf(y, t).score)} labels={years.map(String)} caption="1984〜2043年の比較基準。年の点数は上の12か月の単純平均です。同じ海流が12年後に戻っても年干が変わるので点数は同じとは限りません。組み合わせ全体は60年で戻ります。" />
      <p>年運は60年分、月運は60年×12＝720区間を高い順に並べ、最高点＝凱風、上位約25％＝順風、中央＝凪、下位約25％＝荒波、最低点＝轟沈とします。同点も同じ扱いなので、人数・区間数はきっちり5等分にはなりません。</p>
      <p className="ex-note">年の平均では毎年同じ12海況を一巡します。そのため海況や月支の平均寄与は年ごとに変わらず、年同士の差を作るのは主に年干・年支の五行です。グラフの山谷はこの設計によって生まれます。</p></Block>
    <Block id={8}><h3>運勢の文章は、どこから来る？</h3><p>「自分が進む」と「周りを変える」の2軸を計算し、それぞれ0.5以上かどうかで4群に分けます。用意された文章候補から、日付と名札の番号によって1件を選びます。同じ条件なら同じ文章になります。現在は生成AIでその場の文章を作る処理はありません。</p>
      <div className="ex-stat-grid"><div><small>自分が進む</small><b>{(r.force.go * 100).toFixed(0)} / 100</b><span>海況50％・月相25％・季節と月の相性25％</span></div><div><small>周りを変える</small><b>{(r.force.change * 100).toFixed(0)} / 100</b><span>月距離35％・年の相性40％・Aありなら25％を加算</span></div></div>
      <blockquote>{r.outlook.line}<br /><small>{r.outlook.detail}</small><hr />今日の一手：{r.outlook.action}</blockquote>
      <p>年・月・日の「三つの海」の文章は、三つの運勢段階の組み合わせによる条件分岐です。例えば、年がよく日が悪ければ「長い航路を変える前に、今日の予定を軽くする」という読みを出します。</p>
      <h3>問いへの回答で、鑑定は変わる？</h3><p>現在は、選んだ問いの共通文章＋16タイプ別の見方＋現在の三つの海を並べています。タイプ別の文章は季節と深さから選び、一部の組み合わせに専用文があります。「近い／少し違う」という反応や航海帳に書いた内容を、運勢の点数へ戻す処理はありません。</p>
      <p className="ex-note">添付資料の案にあった「心理的な回答によって神託を分岐する」は、まだ本格実装していません。問いを選ぶと読む内容は変わりますが、回答を解釈してスコアや神託を個別生成する段階には達していません。</p></Block>
    <Block id={9}><Table heads={['画面', '何を見る・何に使う']} rows={[
      ['今日の海', 'タイプの順位・個人順位相当・三つの海・具体的な一手。全項目の点数内訳も読む。'], ['運勢の流れ／暦', '年の海流と月の海況を切替。立春、新月・満月、誕生日、帰郷の年を表示。'], ['人生の海図', '過去12年と各年12節の象徴を読み返す。出来事の記録と照らし合わせる。記録を使った予測学習はしていない。'], ['図鑑・神話・潮札', '16タイプの考え方、神の象徴、海の物語を読む。160名札との対応や共有用の見た目を担う。'], ['問いの海', '共通の問いに、タイプの見方と現在の海を重ねる。保存日から後日再訪できる。'], ['二人の海', '季節の差と深さの差を比較。今回追加した年・月・日の五行は二人の相性計算にまだ入っていない。'], ['航海帳', '入力・問い・出来事・お気に入りをこのブラウザに保存。サーバー側で心理データを学習する処理はない。'],
      ]} /><p>誕生日は「私の出航日」。生まれた年の十二支が12年ごとに戻ると「帰郷の年」とし、個人点に1点を加えます。年の境界は出生年も現在年も立春でそろえています。</p></Block>
    <Block id={10}><Table heads={['採用した判断', '理由', '現時点で言える限界']} rows={[
      ['既存の海流と神々を使う', '世界観を引き継ぎ、時間や相性のルールを追加するため', '十二支と海の生物の対応自体は独自の並び。意味の対応はさらに設計できる。'], ['暖流・寒流の二択から五行へ', '同じ季節型でも、年・月・日で違う関係を作るため', '相生を常に高得点にすることや重みは設計上の仮定。検証済みの性格・未来予測ではない。'], ['24区間で海況を固定', '暦と海況の変化を追いやすくするため', '毎年同じ時期が同じ嵐／順風になる。季節を善悪に固定してよいかは検討の余地がある。'], ['60年分で年運を比較', '十干と十二支の組を一巡させるため', '観測した60年の人生データに合わせた統計ではない。'], ['日本時間正午で統一', '出生時刻なし・日付単位で同じ結果を再現するため', '節入りの瞬間や日境界の流派差、出生地・時刻・蔵干・月干は扱わない。'],
      ]} />
      <p>今後、仕様として決めるべき点は、個人補正で日干の五行を残すか、タイプ順位と個人順位のどちらを主な結果にするか、五行の点数と重みをどう評価するか、問いへの回答をどこまで文章へ反映するかです。ここは現在の計算を隠さず見たうえで調整できます。</p>
      <p>実際の潮流・海流・地域ごとの満潮と干潮の予報、方位吉凶、時刻選定、護符の効力判定は今回の範囲に入っていません。大潮などの表示は月相を区分した近似的な呼称で、海の行動計画には地域別の公式潮汐情報が必要です。</p></Block>
    <Block id={11}><details><summary>点数の式を全部読む</summary><div className="ex-equation">深さd＝（深さ数値−3.25）÷2.25<br />得意月相角＝季節角＋d×40°（春0°／夏90°／秋180°／冬270°）<br />月相点＝cos（実際の月相角−得意月相角）×2<br />月距離係数a＝最接近1／近い0.78／ふつう0.55／遠い0.32／最遠0.1<br />距離点＝d×（a−0.55）×2<br />海の時計の位置＝（暦の区間番号＋毎年のずれ−拠点の区間番号＋8＋深さのずれ）mod 24<br />海況点＝5.5＋（その位置の基礎点−5.5）×0.6×感度<br />節月相性点＝月支関係点×0.45<br />年相性点＝（年干関係点＋年支関係点）÷2<br />タイプ日波位置＝（日支番号＋季節番号×3＋深さ番号＋−なら5＋Aなら7）mod12<br />日点＝（その位置の海況基礎点−5.5）÷4.5×1.6×感度＋日干関係点×0.35<br />A距離点＝Aありなら（a−0.55）×1.6、なければ0<br />向かい風点＝−ありなら−1.5、なければ0<br />名札合計＝海況基礎点＋月相点＋距離点＋節月相性点＋年相性点＋日点＋A距離点＋向かい風点<br /><br />個人波位置＝（日支番号＋出生年＋出生月＋出生日＋総画数）mod12<br />個人波点＝（その位置の海況基礎点−5.5）÷4.5×1.6×感度<br />個人点＝名札合計−日点＋個人波点＋帰郷加点<br />Aありの場合の最終個人点＝全タイプ平均＋（個人点−全タイプ平均）×1.5<br /><br />進む力＝（海況点−1）÷9×0.5＋（月相点＋2）÷4×0.25＋（節月相性点＋1.5）÷3×0.25<br />変える力＝a×0.35＋（年相性点＋2）÷4×0.4＋Aなら0.25<br />両軸の最終値は0〜1へ収める。進む力の相性換算には五行追加前の範囲を使っており、上限・下限で丸められることがあります。</div></details>
      <p>実装の対応：名札は strokes.js／暦は solarCalendar.js／天文の月は moon.js／点数と順位は scoring.js／三つの海と文章分岐は domain.ts／問いと履歴の連携は voyage.ts。解説のグラフも、これらの実関数を呼んでいます。</p>
      <p>参照資料：<a href="https://eco.mtk.nao.ac.jp/koyomi/faq/24sekki.html" target="_blank" rel="noreferrer">国立天文台：二十四節気</a> ／ <a href="https://www.ndl.go.jp/koyomi/chapter3/s1.html" target="_blank" rel="noreferrer">国立国会図書館：干支と暦</a>。画数辞書はKANJIDIC2（EDRDG／CC BY-SA 4.0）。月・太陽の近似計算はJean Meeusの天文計算法を参照する構成です。これらの資料は潮環の独自点数の正しさを保証するものではありません。</p>
      <a className="ex-top" href="#ex-0">全体像に戻る ↑</a></Block>
  </article>;
}
