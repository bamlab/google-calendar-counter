/**
 * Constants
 */

const MINUTE_HEIGHT_NORMAL = 30 / 24; // 24px is 30 minutes on normal screens
const MINUTE_HEIGHT_SMALL = 30 / 20; // 20px is 30 minutes on small screens
const EVENT_BORDER_SIZE = 2; // there is 2px of gap at the bottom of each event
const MINUTES_PER_DAY = 7 * 60; // 7 hours in a day of work
const NOT_ACCEPTED_YET_MEETINGS_COLOR = "rgb(255, 255, 255)";
let minuteHeight = MINUTE_HEIGHT_NORMAL;

/**
 * i18n utils
 */
const language = navigator.language;
const translations = {
  fr: {
    title: "Temps passé",
    day: "j",
  },
  en: {
    title: "Time spent",
    day: "d",
  },
};

const i18n = {
  t: (key) => {
    if (translations.hasOwnProperty(language)) {
      return translations[language][key];
    }
    return translations.en[key];
  },
};

/**
 * Util for parsing string color to array of numbers
 * ex: parseRGBColor('rgb(255, 136, 124)') => [255, 136, 124]
 */

const parseRGBColor = (rgbColor) =>
  rgbColor
    ? rgbColor
        .replace("rgb(", "")
        .replace(")", "")
        .replace(" ", "")
        .split(",")
        .map((string) => parseInt(string))
    : parseRGBColor(NOT_ACCEPTED_YET_MEETINGS_COLOR);

const updateMinutesScale = (events) => {
  if (window.innerHeight < 700) {
    minuteHeight = MINUTE_HEIGHT_SMALL;
  } else {
    minuteHeight = MINUTE_HEIGHT_NORMAL;
  }
};

init = () => {
  /**
   * Build table with time details
   */
  const table = document.createElement("ul");
  table.style.paddingLeft = "28px";
  table.style.margin = "4px 0px 8px";

  const title = document.createElement("div");
  title.style.margin = "20px 20px 8px 28px";
  title.style.display = "flex";
  title.style.alignItems = "center";

  const titleText = document.createElement("span");
  titleText.textContent = i18n.t("title");
  titleText.style.flexGrow = "1";
  titleText.style.fontFamily = "'Google Sans',Roboto,Arial,sans-serif";
  titleText.style.fontSize = "14px";
  titleText.style.fontWeight = "500";
  titleText.style.letterSpacing = ".25px";
  titleText.style.lineHeight = "16px";
  titleText.style.color = "#3c4043";
  title.appendChild(titleText);

  /**
   * Insert table
   */
  const miniMonthNavigator = document.getElementById(
    "drawerMiniMonthNavigator"
  );
  miniMonthNavigator.insertAdjacentElement("afterend", table);
  miniMonthNavigator.insertAdjacentElement("afterend", title);

  const computeData = () => {
    table.textContent = "";
    /**
     * Compute data
     */
    const events = document.querySelectorAll("[data-eventchip]");

    const colorEvents = {};

    updateMinutesScale(events);

    events.forEach((event) => {
      let eventColor =
        event.style.backgroundColor || NOT_ACCEPTED_YET_MEETINGS_COLOR;

      if (!colorEvents[eventColor]) colorEvents[eventColor] = [];
      colorEvents[eventColor].push(event);
    });

    const getTimeFromEventSize = (event) =>
      (parseInt(event.style.height.replace("px", "") || 0) +
        EVENT_BORDER_SIZE) *
      minuteHeight;

    formatTime = (time) =>
      `${time >= 60 ? `${Math.trunc(time / 60)}h` : ""}${
        time % 60 !== 0 ? `${time % 60}m` : ""
      } (${(time / MINUTES_PER_DAY).toLocaleString(language, {
        maximumFractionDigits: 1,
      })}${i18n.t("day")})`;

    /**
     * Merge colors (handling past events opacity).
     * To get the color of the past events google does 255 - [(255 - color) * 0.3], i.e. 178.5 + 0.3 * color
     */

    const parsedColors = Object.keys(colorEvents).map((colorKey) => ({
      original: colorKey,
      parsed: parseRGBColor(colorKey),
    }));
    const findPastEventsColor = (color) => {
      return parsedColors.find((lookupColor) => {
        return (
          color
            .map(
              (value, index) =>
                Math.abs(value * 0.3 + 178.5 - lookupColor.parsed[index]) < 1.5
            )
            .reduce((acc, val) => acc && val) && color !== lookupColor.parsed
        );
      });
    };

    parsedColors.forEach((color) => {
      const pastEventsColor = findPastEventsColor(color.parsed);
      if (
        pastEventsColor &&
        pastEventsColor.original !== NOT_ACCEPTED_YET_MEETINGS_COLOR &&
        color.original !== NOT_ACCEPTED_YET_MEETINGS_COLOR
      ) {
        colorEvents[color.original] = [
          ...colorEvents[color.original],
          ...colorEvents[pastEventsColor.original],
        ];
        delete colorEvents[pastEventsColor.original];
      }
    });

    const colors = Object.keys(colorEvents).map((color) => {
      const timeInSeconds = colorEvents[color].reduce((time, event) => {
        return time + getTimeFromEventSize(event);
      }, 0);
      return {
        color: color,
        timeInSeconds,
        time: formatTime(timeInSeconds),
      };
    });

    /**
     * Add elements for each color
     */
    colors
      .sort((colorA, colorB) => colorB.timeInSeconds - colorA.timeInSeconds)
      .forEach((color) => {
        const item = document.createElement("li");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.marginBottom = "12px";

        const colorDot = document.createElement("span");
        colorDot.style.display = "inline-block";
        colorDot.style.height = "20px";
        colorDot.style.width = "20px";
        colorDot.style.borderRadius = "20px";
        colorDot.style.backgroundColor = color.color;
        colorDot.style.marginRight = "8px";
        if (color.color === NOT_ACCEPTED_YET_MEETINGS_COLOR)
          colorDot.style.border = "1px solid black";

        const text = document.createElement("span");
        text.style.color = "#3c4043";
        text.style.fontSize = "14px";
        text.style.fontWeight = "400";
        text.style.lineHeight = "16px";
        text.style.fontFamily = "Roboto,Helvetica,Arial,sans-serif";
        text.textContent = color.time;

        item.appendChild(colorDot);
        item.appendChild(text);
        table.appendChild(item);
      });
  };

  setInterval(computeData, 500);
};

/**
 * We try to init every half of a second
 */
const initInterval = setInterval(() => {
  const meetingWithSearchBox = document.querySelectorAll("[role=search]");
  if (meetingWithSearchBox.length) {
    init();
    clearInterval(initInterval);
  }
}, 500);
