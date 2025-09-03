import {
  DatesProvider as MantineDatesProvider,
  type DayOfWeek,
} from "@mantine/dates";
import { useLocalStorage } from "@mantine/hooks";
import { rotateLeft } from "iter-fns";
import { useLinguiContext } from "./LinguiProvider";

const WEEK_INFO = (typeof window !== "undefined"
  ? ((
      new Intl.Locale(window.navigator.language) as {
        getWeekInfo?(): { firstDay: number; weekend: number[] };
      }
    ).getWeekInfo?.() ?? null)
  : null) ?? { firstDay: 7, weekend: [6, 7] };

const DEFAULT_FIRST_DAY = (WEEK_INFO.firstDay % 7) as DayOfWeek;
const WEEKEND = WEEK_INFO.weekend.map((d) => (d % 7) as DayOfWeek);

export const FIRST_DAYS_OF_WEEK: DayOfWeek[] = (() => {
  const days = [0, 1, 6] as DayOfWeek[];
  const idx = days.indexOf(DEFAULT_FIRST_DAY);
  if (idx == -1) {
    days.unshift(DEFAULT_FIRST_DAY);
  } else {
    rotateLeft(days, idx);
  }
  return days;
})();

export function useFirstDayOfWeek() {
  return useLocalStorage({
    key: "fbl:firstDayOfWeek",
    defaultValue: DEFAULT_FIRST_DAY,
    getInitialValueInEffect: false,
    deserialize(value) {
      if (value == undefined) {
        return DEFAULT_FIRST_DAY;
      }

      try {
        const day = JSON.parse(value);
        if (!FIRST_DAYS_OF_WEEK.includes(day)) {
          return DEFAULT_FIRST_DAY;
        }
        return day;
      } catch (e) {
        return DEFAULT_FIRST_DAY;
      }
    },
  });
}

export default function DatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dayjsLocale } = useLinguiContext();
  const [firstDayOfWeek] = useFirstDayOfWeek();

  return (
    <MantineDatesProvider
      settings={{
        locale: dayjsLocale.name,
        weekendDays: WEEKEND,
        firstDayOfWeek,
      }}
    >
      {children}
    </MantineDatesProvider>
  );
}
