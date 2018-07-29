"use-strict";

const config = require("../config.json");
const level = config.logLevel;
const term = {
  props: {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m"
  },

  colours: {
    fg: {
      Black: "\x1b[30m",
      Red: "\x1b[31m",
      Green: "\x1b[32m",
      Yellow: "\x1b[33m",
      Blue: "\x1b[34m",
      Magenta: "\x1b[35m",
      Cyan: "\x1b[36m",
      White: "\x1b[37m"
    },

    bg: {
      Black: "\x1b[40m",
      Red: "\x1b[41m",
      Green: "\x1b[42m",
      Yellow: "\x1b[43m",
      Blue: "\x1b[44m",
      Magenta: "\x1b[45m",
      Cyan: "\x1b[46m",
      White: "\x1b[47m"
    }
  }
}

const levelToString = {
  0: "ERRO",
  1: "WARN",
  2: "INFO",
  3: "DBUG",
}
const levelToColFg = {
  0: term.colours.fg.Red,
  1: term.colours.fg.Yellow,
  2: term.colours.fg.Cyan,
  3: term.props.Dim,
}
const levelToColBg = {
  0: term.colours.bg.Red,
  1: term.colours.bg.Yellow,
  2: term.colours.bg.Cyan,
  3: term.colours.bg.White,
}
const levelToColFg2 = {
  0: term.colours.fg.White,
  1: term.colours.fg.Black,
  2: term.colours.fg.White,
  3: term.colours.fg.Black,
}

const ART = `
${term.props.Bright}${term.colours.fg.Yellow}________________________________________________________________________________
|      _     _   _     _      _                                     _          |
|     (_)___| |_| |__ (_)___ (_) __ ___   ____ _  __ ___      __   (_)___      |
|     | / __| __| '_ \\| / __|| |/ _\` \\ \\ / / _\` |/ _\` \\ \\ /\\ / /   | / __|     |
|     | \\__ \\ |_| | | | \\__ \\| | (_| |\\ V / (_| | (_| |\\ V  V / _  | \\__ \\     |
|     |_|___/\\__|_| |_|_|___// |\\__,_| \\_/ \\__,_|\\__, | \\_/\\_/ (_)_/ |___/     |
|                          |__/                  |___/           |__/          |
|______________________________________________________________________________|
${term.props.Reset}|                                                                              |
|                     ${term.colours.fg.Yellow}__  ___   ________  _____   ________ __${term.props.Reset}                  |
|                    ${term.colours.fg.Yellow}/ / / / | / /  _/ / / /   | / ____/ //_/${term.props.Reset}                  |
|                   ${term.colours.fg.Yellow}/ / / /  |/ // // /_/ / /| |/ /   / ,<${term.props.Reset}                     |
|                  ${term.colours.fg.Yellow}/ /_/ / /|  // // __  / ___ / /___/ /| |${term.props.Reset}                    |
|                  ${term.colours.fg.Yellow}\\____/__ |_/___/_/ /_/_/  |_\\____/_/ |_|${term.props.Reset}                    |
|                                  ${term.props.Dim}| |/_/${term.props.Reset}                                      |
|                                 ${term.props.Dim}_>  <${term.props.Reset}                                        |
|                      ${term.colours.fg.Red}____  ____${term.props.Reset}${term.props.Dim}/${term.colours.fg.Red}_${term.props.Reset}${term.props.Dim}/|${term.colours.fg.Red}_${term.props.Reset}${term.props.Dim}|${term.colours.fg.Red}_ ________  __${term.props.Reset}                          |
|                     ${term.colours.fg.Red}/ __ )/ __ \\/ ___// ____/ / / /${term.props.Reset}                          |
|                    ${term.colours.fg.Red}/ __  / / / /\\__ \\/ /   / /_/ /${term.props.Reset}                           |
|                   ${term.colours.fg.Red}/ /_/ / /_/ /___/ / /___/ __  /${term.props.Reset}                            |
|                  ${term.colours.fg.Red}/_____/\\____//____/\\____/_/ /_/${term.props.Reset}                             |
|                                                                              |
|______________________________________________________________________________|
${term.props.Reset}

                        Max Lee (Max.Lee@au.bosch.com)
                               mallocsizeof.me

--------------------------------------------------------------------------------
`;
class Logger {
  constructor() {}

  static debug(message, prefix) {
    this.log(message, prefix, 3);
  }

  static info(message, prefix) {
    this.log(message, prefix, 2);
  }

  static warn(message, prefix) {
    this.log(message, prefix, 1);
  }

  static error(message, prefix) {
    this.log(message, prefix, 0);
  }

  static getDateString() {
    return (new Date()).toISOString();
  }

  static log(message, prefix, logLevel) {
    if (logLevel <= level) {
      var toLog = `${this.getDateString()} ${levelToColBg[logLevel]}${levelToColFg2[logLevel]}[${levelToString[logLevel]}]${term.props.Reset} `;
      if (prefix)
        toLog += `${term.props.Dim}${levelToColFg[logLevel]}<${prefix}>\t`;
      console.log(`${toLog}${term.props.Reset}${levelToColFg[logLevel]}${message} ${term.props.Reset}`);
    }
  }

  /*
   * Display ascii art
   */
  static ascii() {
    console.log(ART);
  }
}

module.exports = Logger;
