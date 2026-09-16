// Rebuild the shareable Daven video with Node and FFmpeg. No network access needed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'daven-video-'));
const out = resolve(root, 'assets/daven-introduction.mp4');
const serif = 'marketing/fonts/FrankRuhlLibre-Regular.ttf';
const sans = 'marketing/fonts/Assistant-SemiBold.ttf';
const cream = '0xf1ece0', gold = '0xc9a257', secondary = '0xa79f90';
let textId = 0;
function text(value, size, y, { x = 80, color = cream, font = sans } = {}) {
  const file = join(work, `text-${textId++}.txt`);
  writeFileSync(file, value);
  return `drawtext=fontfile='${font}':textfile='${file}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}`;
}
const line = (y) => `drawbox=x=80:y=${y}:w=920:h=1:color=${gold}@0.35:t=fill`;
const brand = () => [text('Daven', 70, 150, { x: 200, font: serif }), line(270)];
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: root, stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`FFmpeg failed (${result.status})`);
}
function scene(id, duration, overlays, type) {
  const args = ['-f', 'lavfi', '-i', `color=c=0x101310:s=1080x1920:r=30:d=${duration}`];
  let filter = '[0:v]setsar=1[base];';
  if (type === 'reader') {
    args.push('-loop', '1', '-framerate', '30', '-i', 'assets/shot-reader.png');
    args.push('-loop', '1', '-framerate', '30', '-i', 'assets/icon-512.png');
    // Genuine screenshot, cropped to the complete Ashrei Hebrew passage.
    // The dated header, retired duration estimate and controls stay outside the crop.
    filter += '[1:v]crop=780:665:0:625,scale=920:-2:flags=lanczos[reader];';
    filter += '[2:v]scale=92:92[icon];[base][reader]overlay=80:708[page];';
    filter += '[page][icon]overlay=80:132[art];';
  } else {
    args.push('-loop', '1', '-framerate', '30', '-i', 'assets/icon-512.png');
    const size = type === 'end' ? 256 : 92;
    const at = type === 'end' ? '412:280' : '80:132';
    filter += `[1:v]scale=${size}:${size}[icon];[base][icon]overlay=${at}[art];`;
  }
  filter += `[art]${overlays.join(',')},format=yuv420p[v]`;
  ffmpeg([...args, '-filter_complex_threads', '1', '-filter_complex', filter,
    '-map', '[v]', '-t', String(duration), '-an', '-c:v', 'libx264', '-crf', '20',
    '-preset', 'medium', '-threads', '2', resolve(work, `${id}.mp4`)]);
}
mkdirSync(resolve(root, 'assets'), { recursive: true });
try {
  scene('one', 6, [
    ...brand(),
    text('A quieter place', 100, 350, { font: serif }),
    text('to daven.', 100, 464, { font: serif }),
    line(675),
    text('THE DAILY SIDDUR, FREE ON IPHONE', 38, 1580, { color: gold }),
  ], 'reader');
  scene('two', 7, [
    ...brand(),
    text('Four nusachim.', 100, 350, { font: serif }),
    text('Ready offline.', 100, 464, { font: serif }),
    text('Your tradition, with you.', 48, 650, { color: secondary }),
    text('Ashkenaz', 66, 830), line(930),
    text('Sefard', 66, 970), line(1070),
    text('Edot Mizrach', 66, 1110), line(1210),
    text('Chabad', 66, 1250),
    text('No account needed to start.', 46, 1580, { color: gold }),
  ], 'features');
  scene('three', 7, [
    text('Daven', 150, 625, { font: serif, x: '(w-text_w)/2' }),
    text('A free siddur for iPhone.', 58, 845, { x: '(w-text_w)/2' }),
    text('Daily prayers. All 150 Tehillim.', 48, 950, { x: '(w-text_w)/2', color: secondary }),
    'drawbox=x=100:y=1160:w=880:h=120:color=0xc9a257:t=fill',
    text('Download on the App Store', 50, 1190, { x: '(w-text_w)/2', color: '0x101310' }),
    text('davenapp.com', 72, 1390, { x: '(w-text_w)/2', font: serif }),
    text('Optional in-app purchases', 40, 1580, { x: '(w-text_w)/2', color: secondary }),
  ], 'end');
  ffmpeg(['-i', resolve(work, 'one.mp4'), '-i', resolve(work, 'two.mp4'), '-i', resolve(work, 'three.mp4'),
    '-filter_complex_threads', '1', '-filter_complex',
    '[0:v][1:v]xfade=transition=fade:duration=0.5:offset=5.5[v01];[v01][2:v]xfade=transition=fade:duration=0.5:offset=12,format=yuv420p[v]',
    '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '22', '-preset', 'slow', '-threads', '2',
    '-movflags', '+faststart', '-metadata', 'title=Daven — A free siddur for iPhone', out]);
  ffmpeg(['-ss', '1', '-i', out, '-frames:v', '1', '-q:v', '3',
    resolve(root, 'assets/daven-introduction-poster.jpg')]);
  console.log(`Created ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
