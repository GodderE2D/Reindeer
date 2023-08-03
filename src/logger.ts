import { stderr, stdout } from "node:process";
import { setImmediate } from "node:timers";
import { inspect } from "node:util";

import chalk from "chalk";

class Logger {
  private runPrerequisites(msgs: unknown[]): {
    output: string;
    coloredOutput: string;
  } {
    const output = [];
    const coloredOutput = [];
    for (const msg of msgs) {
      output.push(typeof msg === "string" ? msg : inspect(msg, true, 5));
      coloredOutput.push(typeof msg === "string" ? msg : inspect(msg, true, 5, true));
    }

    const parsedOutput = output.join(" ");
    const parsedColoredOutput = coloredOutput.join(" ");

    return {
      output: parsedOutput,
      coloredOutput: parsedColoredOutput,
    };
  }

  private hasColors(type: "stdout" | "stderr"): boolean {
    switch (type) {
      case "stdout":
        if (stdout.hasColors) return stdout.hasColors();
        else return true;
      case "stderr":
        if (stderr.hasColors) return stderr.hasColors();
        else return true;
    }
  }

  public debug(...messages: unknown[]): void {
    const { output, coloredOutput } = this.runPrerequisites(messages);

    if (this.hasColors("stdout")) {
      stdout.write(`${chalk.cyan("debug")} - ${coloredOutput}\n`);
    } else {
      stdout.write(`debug - ${output}\n`);
    }
  }

  public info(...messages: unknown[]): void {
    const { output, coloredOutput } = this.runPrerequisites(messages);

    if (this.hasColors("stdout")) {
      setImmediate(() => {
        stdout.write(`${chalk.blue("info")} - ${coloredOutput}\n`);
      });
    } else {
      setImmediate(() => {
        stdout.write(`info - ${output}\n`);
      });
    }
  }

  public warn(...messages: unknown[]): void {
    const { output, coloredOutput } = this.runPrerequisites(messages);

    if (this.hasColors("stderr")) {
      setImmediate(() => {
        stderr.write(`${chalk.yellow("warn")} - ${coloredOutput}\n`);
      });
    } else {
      setImmediate(() => {
        stderr.write(`warn - ${output}\n`);
      });
    }
  }

  public error(...messages: unknown[]): void {
    const { output, coloredOutput } = this.runPrerequisites(messages);

    if (this.hasColors("stderr")) {
      setImmediate(() => {
        stderr.write(`${chalk.red("error")} - ${coloredOutput}\n`);
      });
    } else {
      setImmediate(() => {
        stderr.write(`error - ${output}\n`);
      });
    }
  }
}

export default Logger;
