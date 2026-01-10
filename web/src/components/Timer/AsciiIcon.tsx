import { useMemo, useState, useEffect } from 'react';

interface AsciiIconProps {
  type: 'none' | 'progress' | 'hourglass' | 'tomato' | 'coffee';
  progress: number; // 0-100
  isBreak?: boolean; // 休憩中は砂が上に戻る演出
  isPaused?: boolean; // 一時停止中はアニメーション停止
}

export function AsciiIcon({ type, progress, isBreak = false, isPaused = false }: AsciiIconProps) {
  // アニメーションフレーム（CLIと同じく500msで更新）
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    // 一時停止中またはアイコンなしの場合はアニメーションしない
    if (isPaused || type === 'none') {
      return;
    }

    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 500); // 500msごとにフレーム更新

    return () => clearInterval(interval);
  }, [isPaused, type]);

  const ascii = useMemo(() => {
    switch (type) {
      case 'none':
        return ''; // アイコンなし
      case 'progress':
        return renderProgressBar(progress, isBreak, animationFrame);
      case 'hourglass':
        return renderHourglass(progress, isBreak, animationFrame);
      case 'tomato':
        return renderTomato(progress, isBreak, animationFrame);
      case 'coffee':
        return renderCoffee(progress, isBreak, animationFrame);
      default:
        return '';
    }
  }, [type, progress, isBreak, animationFrame]);

  if (type === 'none') return <pre data-testid="ascii-icon" className="text-sandoro-primary"></pre>;

  return <pre data-testid="ascii-icon" className="text-sandoro-primary">{ascii}</pre>;
}

function renderProgressBar(progress: number, isBreak: boolean, animationFrame: number): string {
  // シンプルなプログレスバー
  // 作業中: 左から右へ塗りつぶし
  // 休憩中: 右から左へ戻る（矢印で補充中を表現）

  const effectiveProgress = isBreak ? (100 - progress) : progress;
  const WIDTH = 20;
  const filled = Math.round((effectiveProgress / 100) * WIDTH);

  const bar = '█'.repeat(filled) + '░'.repeat(WIDTH - filled);

  // 休憩中かつ進行中 = 補充中の演出
  const isRefilling = isBreak && progress > 0 && progress < 100;

  // すべての行を同じ幅（32文字）に揃える
  const LINE_WIDTH = 32;
  const barLine = `[${bar}]`;  // 22文字
  const refillText = isRefilling ? ' ← REFILL' : '';
  const barWithRefill = barLine + refillText;
  const barPadLeft = Math.floor((LINE_WIDTH - barWithRefill.length) / 2);
  const barPadRight = LINE_WIDTH - barWithRefill.length - barPadLeft;

  const percentArrow = animationFrame % 2 === 0 ? '◀━━' : '◄──';
  const percentText = isRefilling
    ? `${String(Math.round(effectiveProgress)).padStart(3, ' ')}% ${percentArrow}`
    : `${String(Math.round(effectiveProgress)).padStart(3, ' ')}%`;
  const percentPadLeft = Math.floor((LINE_WIDTH - percentText.length) / 2);
  const percentPadRight = LINE_WIDTH - percentText.length - percentPadLeft;

  return [
    ' '.repeat(LINE_WIDTH),
    ' '.repeat(barPadLeft) + barWithRefill + ' '.repeat(barPadRight),
    ' '.repeat(percentPadLeft) + percentText + ' '.repeat(percentPadRight),
    ' '.repeat(LINE_WIDTH),
  ].join('\n');
}

function renderHourglass(progress: number, isBreak: boolean, animationFrame: number): string {
  // 作業中: 砂が上から下へ落ちる（progress: 0%→100%）
  // 休憩中: 砂が下から上へ戻る（progress: 0%→100% だが表示は逆）
  //
  // グラデーション + 半ブロックで滑らかなアニメーション
  // 6行 × 3段階グラデーション = 18段階の解像度

  const ROWS = 6;
  const MAX_LEVEL = 18; // 細かい粒度

  let topLevel: number;
  let bottomLevel: number;
  let flowDirection: 'down' | 'up';

  if (isBreak) {
    topLevel = Math.round(MAX_LEVEL * progress / 100);
    bottomLevel = Math.round(MAX_LEVEL * (100 - progress) / 100);
    flowDirection = 'up';
  } else {
    topLevel = Math.round(MAX_LEVEL * (100 - progress) / 100);
    bottomLevel = Math.round(MAX_LEVEL * progress / 100);
    flowDirection = 'down';
  }

  const flowing = progress > 0 && progress < 100;
  const W = 10;

  // 上部の砂を生成（重力で下に溜まる、上が薄く下が濃い）
  const generateTopSand = (level: number): string[] => {
    const rows: string[] = [];
    const unitsPerRow = 3; // 1行あたり3段階

    for (let row = 0; row < ROWS; row++) {
      const rowFromBottom = ROWS - 1 - row;
      const rowStartUnit = rowFromBottom * unitsPerRow;

      // この行にどれだけ砂があるか
      const fillAmount = Math.max(0, Math.min(unitsPerRow, level - rowStartUnit));

      let char: string;
      if (fillAmount === 0) {
        char = ' ';
      } else if (fillAmount >= unitsPerRow) {
        // グラデーション: 底に近いほど濃い
        if (rowFromBottom <= 1) char = '▓';
        else if (rowFromBottom <= 3) char = '▒';
        else char = '░';
      } else {
        // 部分的に埋まっている（境界行）
        if (fillAmount === 1) char = '░';
        else if (fillAmount === 2) char = '▒';
        else char = '▓';
      }

      rows.push(char.repeat(W));
    }
    return rows;
  };

  // 下部の砂を生成（底から積もる、底が濃い）
  const generateBottomSand = (level: number): string[] => {
    const rows: string[] = [];
    const unitsPerRow = 3;

    for (let row = 0; row < ROWS; row++) {
      const rowFromBottom = ROWS - 1 - row;
      const rowStartUnit = rowFromBottom * unitsPerRow;

      // この行にどれだけ砂があるか
      const fillAmount = Math.max(0, Math.min(unitsPerRow, level - rowStartUnit));

      let char: string;
      if (fillAmount === 0) {
        char = ' ';
      } else if (fillAmount >= unitsPerRow) {
        // グラデーション: 底に近いほど濃い
        if (rowFromBottom <= 1) char = '▓';
        else if (rowFromBottom <= 3) char = '▒';
        else char = '░';
      } else {
        // 部分的に埋まっている（境界行）= 一番上の砂層
        char = '░';
      }

      rows.push(char.repeat(W));
    }
    return rows;
  };

  const top = generateTopSand(topLevel);
  const bot = generateBottomSand(bottomLevel);

  // 流れる砂のアニメーション（4段階でより細かい表現）
  const frame = animationFrame % 4;
  let flow1 = ' ', flow2 = ' ';
  if (flowing) {
    if (flowDirection === 'down') {
      // 作業中: 砂が下に落ちる細かいアニメーション
      const downPatterns: [string, string][] = [
        ['▼', ' '],
        ['·', '▼'],
        [' ', '·'],
        ['·', ' '],
      ];
      [flow1, flow2] = downPatterns[frame];
    } else {
      // 休憩中: 砂が上に戻るチカチカ
      flow1 = frame % 2 === 0 ? '↑' : '°';
      flow2 = frame % 2 === 0 ? '°' : '↑';
    }
  }

  // ボトルネック部分の砂の表現（落下中のみ表示）
  let neck1 = ' ', neck2 = ' ';
  if (flowing) {
    if (flowDirection === 'down') {
      // 作業中: 砂がボトルネックを通過
      const neckPatterns: [string, string][] = [
        ['▓', '░'],
        ['░', '▒'],
        ['▒', '▓'],
        ['▓', '▒'],
      ];
      [neck1, neck2] = neckPatterns[frame];
    } else {
      // 休憩中
      neck1 = frame % 2 === 0 ? '·' : '°';
      neck2 = frame % 2 === 0 ? '°' : '·';
    }
  }

  // デザイン
  const hourglassArt = [
    ' ╔══════════╗ ',
    ' ║▄▄▄▄▄▄▄▄▄▄║ ',
    ` ║${top[0]}║ `,
    ` ║${top[1]}║ `,
    ` ║${top[2]}║ `,
    ` ║${top[3]}║ `,
    `  ╲${top[4].slice(1, -1)}╱  `,
    `   ╲${top[5].slice(2, -2)}╱   `,
    `    ╲ ${flow1}${flow2} ╱    `,
    `     ╲${neck1}${neck2}╱     `,
    `     ╱${neck2}${neck1}╲     `,
    `    ╱ ${flow2}${flow1} ╲    `,
    `   ╱${bot[0].slice(2, -2)}╲   `,
    `  ╱${bot[1].slice(1, -1)}╲  `,
    ` ║${bot[2]}║ `,
    ` ║${bot[3]}║ `,
    ` ║${bot[4]}║ `,
    ` ║${bot[5]}║ `,
    ' ║▀▀▀▀▀▀▀▀▀▀║ ',
    ' ╚══════════╝ ',
  ];

  return hourglassArt.join('\n');
}

function renderTomato(progress: number, isBreak: boolean, animationFrame: number): string {
  // プチトマト2個 - 各トマトが5段階で減っていく（合計10段階）
  // 作業中: 右トマトが先に減り、次に左トマトが減る
  // 休憩中: 逆に増えていく
  // progress: 0% = 満タン、100% = 空

  // 休憩中は逆方向
  const effectiveProgress = isBreak ? (100 - progress) : progress;

  // 残りレベル（0-10）
  const totalLevel = Math.round(10 * (100 - effectiveProgress) / 100);

  // 右トマト: レベル1-5、左トマト: レベル6-10
  const rightLevel = Math.min(5, totalLevel);                   // 0-5
  const leftLevel = Math.max(0, Math.min(5, totalLevel - 5));   // 0-5

  // 休憩中かつ進行中 = 実っている演出
  const isGrowing = isBreak && progress > 0 && progress < 100;

  // 作業中かつ進行中 = 揺れる演出
  const isWorking = !isBreak && progress > 0 && progress < 100;
  const workFrame = animationFrame % 2;

  // トマトの中身を生成（レベル0-5で塗りつぶし量が変わる）
  // レベル5=満タン, 0=空
  // 6行構成、下から塗りつぶされていく
  const generateTomatoFill = (level: number, rowNum: number, width: number): string => {
    // rowNum: 1=上部, 2,3,4=中央, 5,6=下部
    // 下から塗りつぶされていく
    // row 1-6 maps to fill thresholds 5-0 (top to bottom)
    const fillRow = 6 - rowNum; // row1→5, row2→4, row3→3, row4→2, row5→1, row6→0
    if (level > fillRow) {
      return '▓'.repeat(width);
    } else {
      return ' '.repeat(width);
    }
  };

  // トマト本体
  const L1 = generateTomatoFill(leftLevel, 1, 4);
  const L2 = generateTomatoFill(leftLevel, 2, 6);
  const L3 = generateTomatoFill(leftLevel, 3, 8);
  const L4 = generateTomatoFill(leftLevel, 4, 8);
  const L5 = generateTomatoFill(leftLevel, 5, 6);
  const L6 = generateTomatoFill(leftLevel, 6, 4);

  const R1 = generateTomatoFill(rightLevel, 1, 4);
  const R2 = generateTomatoFill(rightLevel, 2, 6);
  const R3 = generateTomatoFill(rightLevel, 3, 8);
  const R4 = generateTomatoFill(rightLevel, 4, 8);
  const R5 = generateTomatoFill(rightLevel, 5, 6);
  const R6 = generateTomatoFill(rightLevel, 6, 4);

  // トマトの基本形状（固定）
  const baseTomatoes = [
    '      |              |    ',
    '    \\ | /          \\ | /  ',
    '   \\ \\|/ /        \\ \\|/ / ',
    `  /::${L1}::\\     /::${R1}::\\  `,
    ` /::${L2}::\\   /::${R2}::\\ `,
    `|::${L3}::| |::${R3}::|`,
    `|::${L4}::| |::${R4}::|`,
    ` \\::${L5}::/   \\::${R5}::/ `,
    `  \\::${L6}::/     \\::${R6}::/  `,
    '    \\::::/         \\::::/   ',
  ];

  // ツル + トマト本体（作業中は全体が左右にスライド）
  const stemAndTomatoes = isWorking ? (workFrame === 0 ? [
    // 左にスライド（全体を1文字左へ）
    '~~~~═════════════════════~~~~',
    ...baseTomatoes.map(line => line.slice(1) + ' '),
  ] : [
    // 右にスライド（全体を1文字右へ）
    '~~~~═════════════════════~~~~',
    ...baseTomatoes.map(line => ' ' + line.slice(0, -1)),
  ]) : [
    // 静止状態
    '~~~~═════════════════════~~~~',
    ...baseTomatoes,
  ];

  // 休憩中の太陽演出（チカチカ）
  if (isGrowing) {
    const frame = animationFrame % 2;
    const sun = frame === 0 ? [
      '         \\   |   /         ',
      '          \\  |  /          ',
      '       ----[  ]----        ',
      '          /  |  \\          ',
      '         /   |   \\         ',
      '                           ',
    ] : [
      '             |              ',
      '             |              ',
      '       ----[  ]----        ',
      '             |              ',
      '             |              ',
      '                           ',
    ];

    return [...sun, ...stemAndTomatoes].join('\n');
  }

  return stemAndTomatoes.join('\n');
}

function renderCoffee(progress: number, isBreak: boolean, animationFrame: number): string {
  // コーヒーカップ - 飲み進めると中身が減る
  // 作業中: コーヒーが減っていく
  // 休憩中: コーヒーが補充されていく（おかわり）+ 上から注ぐアニメーション
  // progress: 0% = 満タン、100% = 空（作業中）/ 逆（休憩中）

  const ROWS = 6;
  const MAX_LEVEL = 18;

  // 休憩中は逆方向（空→満タンへ補充）
  const effectiveProgress = isBreak ? (100 - progress) : progress;

  // 残りのコーヒー量
  const remainingLevel = Math.round(MAX_LEVEL * (100 - effectiveProgress) / 100);

  // 蒸気表示（effectiveProgress 60%未満 = コーヒーがまだ熱い/新しく注がれた）
  const showSteam = effectiveProgress < 60;

  // 休憩中かつ進行中 = 注いでいる演出
  const isPouring = isBreak && progress > 0 && progress < 100;

  // 作業中かつ進行中 = 湯気が動く演出（4段階で上昇）
  const isWorking = !isBreak && progress > 0 && progress < 100;
  const workFrame = animationFrame % 4;

  // コーヒーの中身を生成
  const generateCoffeeFill = (level: number): string[] => {
    const rows: string[] = [];
    const unitsPerRow = 3;
    const W = 8;

    for (let row = 0; row < ROWS; row++) {
      const rowFromBottom = ROWS - 1 - row;
      const rowStartUnit = rowFromBottom * unitsPerRow;
      const fillAmount = Math.max(0, Math.min(unitsPerRow, level - rowStartUnit));

      let char: string;
      if (fillAmount === 0) {
        char = ' ';
      } else if (fillAmount >= unitsPerRow) {
        // グラデーション: 底が濃い
        if (rowFromBottom <= 1) char = '▓';
        else if (rowFromBottom <= 3) char = '▒';
        else char = '░';
      } else {
        // 境界行（表面）= 波模様
        char = '~';
      }

      rows.push(char.repeat(W));
    }
    return rows;
  };

  const fill = generateCoffeeFill(remainingLevel);

  // 蒸気パターン（作業中は動く演出：上昇）
  // 4段階で湯気が上に昇っていく表現
  let steam0: string, steam1: string, steam2: string;
  if (showSteam && isWorking) {
    // 作業中: 湯気が上昇
    const steamPatterns: [string, string, string][] = [
      ['        ', ' ～  ～ ', '～    ～'],  // 下から出る
      [' ～  ～ ', '～    ～', '  ～～  '],  // 上昇中
      ['～    ～', '  ～～  ', '   ~~   '],  // さらに上昇
      ['  ～～  ', '   ~~   ', '        '],  // 消えていく
    ];
    [steam0, steam1, steam2] = steamPatterns[workFrame];
  } else if (showSteam) {
    steam0 = '        ';
    steam1 = ' ～  ～ ';
    steam2 = '～    ～';
  } else {
    steam0 = '        ';
    steam1 = '        ';
    steam2 = '        ';
  }

  // 注いでいる演出（上から注ぐ）- チカチカ
  const animFrame = animationFrame % 2;
  const pour1 = animFrame === 0 ? '  │││  ' : '  │ │  ';
  const pour2 = animFrame === 0 ? '  ╲│╱  ' : '  ╲ ╱  ';
  const pour3 = animFrame === 0 ? '   ▼   ' : '   ▽   ';

  // コーヒーカップ本体
  const coffeeArt = isPouring ? [
    `  ${pour1}  `,
    `  ${pour2}  `,
    `  ${pour3}  `,
    ' ╭────────╮  ',
    ` │${fill[0]}├─╮`,
    ` │${fill[1]}│ │`,
    ` │${fill[2]}│ │`,
    ` │${fill[3]}├─╯`,
    ` │${fill[4]}│  `,
    ` │${fill[5]}│  `,
    ' ╰────────╯  ',
    '   ══════    ',
    ' ▔▔▔▔▔▔▔▔▔▔▔▔',
  ] : [
    `  ${steam0}  `,
    `  ${steam1}  `,
    `  ${steam2}  `,
    ' ╭────────╮  ',
    ` │${fill[0]}├─╮`,
    ` │${fill[1]}│ │`,
    ` │${fill[2]}│ │`,
    ` │${fill[3]}├─╯`,
    ` │${fill[4]}│  `,
    ` │${fill[5]}│  `,
    ' ╰────────╯  ',
    '   ══════    ',
    ' ▔▔▔▔▔▔▔▔▔▔▔▔',
  ];

  return coffeeArt.join('\n');
}
