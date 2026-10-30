import { MultiSelectPrompt, SelectPrompt } from "@clack/core";
import { stdout } from "node:process";
import { stripVTControlCharacters } from "node:util";

export interface PickOption<T> {
  value: T;
  label: string;
  hint?: string;
  icon?: string;
}

type Rgb = readonly [number, number, number];

const TRUECOLOR = stdout.isTTY && (stdout.hasColors?.(2 ** 24) ?? false);
const BASIC = stdout.isTTY && (stdout.hasColors?.() ?? false);

const BLUE: Rgb = [47, 124, 246];
const VIOLET: Rgb = [168, 85, 247];
const GREEN: Rgb = [52, 211, 153];
const RED: Rgb = [248, 113, 113];
const MUTED: Rgb = [113, 113, 122];
const ROW_BG: Rgb = [30, 41, 74];

// Truecolor where the terminal has it, the nearest 16-color code otherwise, plain text without a TTY.
const fg = (rgb: Rgb, basic: number) => (text: string) =>
  TRUECOLOR ? `\x1b[38;2;${rgb.join(";")}m${text}\x1b[39m` : BASIC ? `\x1b[${basic}m${text}\x1b[39m` : text;
const blue = fg(BLUE, 94);
const violet = fg(VIOLET, 95);
const green = fg(GREEN, 92);
const red = fg(RED, 91);
const muted = fg(MUTED, 90);
const bold = (text: string) => (BASIC ? `\x1b[1m${text}\x1b[22m` : text);
const strike = (text: string) => (BASIC ? `\x1b[9m${text}\x1b[29m` : text);
const rowBg = (text: string) =>
  TRUECOLOR ? `\x1b[48;2;${ROW_BG.join(";")}m${text}\x1b[49m` : BASIC ? `\x1b[7m${text}\x1b[27m` : text;

const width = (text: string) => [...stripVTControlCharacters(text)].length;
const pad = (text: string, size: number) => text + " ".repeat(Math.max(0, size - width(text)));

const BAR = muted("│");

interface Frame<T> {
  state: string;
  cursor: number;
  options: readonly PickOption<T>[];
  isOn: (option: PickOption<T>) => boolean;
  many: boolean;
}

function render<T>(message: string, frame: Frame<T>): string {
  const { state, cursor, options, isOn, many } = frame;
  const picked = options.filter(isOn);

  if (state === "submit" || state === "cancel") {
    const head = `${state === "submit" ? green("◇") : red("■")}  ${message}`;
    const summary = picked.length === 0
      ? muted("none")
      : picked.map((option) => `${violet(option.icon ?? "•")} ${option.label}`).join(muted("  ·  "));
    return `${head}\n${BAR}  ${state === "cancel" ? strike(muted(stripVTControlCharacters(summary))) : summary}\n${BAR}`;
  }

  const labelWidth = Math.max(...options.map((option) => width(option.label)));
  const rowWidth = Math.max(...options.map((option) => 10 + labelWidth + (option.hint ? width(option.hint) + 3 : 0)));
  const rows = options.map((option, index) => {
    const focused = index === cursor;
    const on = isOn(option);
    const mark = many ? (on ? blue("▣") : muted("□")) : on ? blue("◉") : muted("○");
    const icon = on || focused ? violet(option.icon ?? "•") : muted(option.icon ?? "•");
    const label = focused ? bold(pad(option.label, labelWidth)) : on ? pad(option.label, labelWidth) : muted(pad(option.label, labelWidth));
    const hint = option.hint ? `   ${muted(option.hint)}` : "";
    const row = ` ${mark}  ${icon}  ${label}${hint} `;
    return focused ? `${BAR} ${blue("▌")}${rowBg(pad(row, rowWidth))}` : `${BAR}  ${row}`;
  });

  const count = many ? `   ${picked.length > 0 ? blue(`${picked.length} selected`) : muted("none selected")}` : "";
  const keys = many ? "↑↓ move · space pick · a all · enter confirm" : "↑↓ move · enter confirm";
  return [`${blue("◆")}  ${message}${count}`, BAR, ...rows, BAR, `${muted("└")}  ${muted(keys)}`, ""].join("\n");
}

/** Single choice with the PLAIOS look; resolves to the clack cancel symbol on Esc or Ctrl+C. */
export function pickOne<T>(message: string, options: readonly PickOption<T>[]): Promise<T | symbol> {
  return new SelectPrompt({
    options: [...options],
    render() {
      const focusedValue = options[this.cursor]?.value;
      return render(message, { state: this.state, cursor: this.cursor, options, isOn: (option) => option.value === focusedValue, many: false });
    },
  }).prompt() as Promise<T | symbol>;
}

/** Multiple choice with the PLAIOS look; an empty pick is allowed. */
export function pickMany<T>(message: string, options: readonly PickOption<T>[], initialValues: readonly T[] = []): Promise<T[] | symbol> {
  return new MultiSelectPrompt({
    options: [...options],
    initialValues: [...initialValues],
    required: false,
    render() {
      const selected = this.value ?? [];
      return render(message, { state: this.state, cursor: this.cursor, options, isOn: (option) => selected.includes(option.value), many: true });
    },
  }).prompt() as Promise<T[] | symbol>;
}
