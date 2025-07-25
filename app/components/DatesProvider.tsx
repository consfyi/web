import { useLingui } from "@lingui/react";
import { DatesProvider as MantineDatesProvider } from "@mantine/dates";
import { useLocalStorage } from "@mantine/hooks";
import { Day } from "date-fns";

const DEFAULT_FIRST_DAY_OF_WEEK = (() => {
  // Use the locale of the browser rather than the set locale.
  const locale = new Intl.Locale(navigator.language);
  const weekInfo = (
    locale as {
      getWeekInfo?(): { firstDay: number };
    }
  ).getWeekInfo?.() ?? { firstDay: 7 };

  return (weekInfo.firstDay % 7) as Day;
})();

export const FIRST_DAYS_OF_WEEK: Day[] = [0, 1, 6];

export function useFirstDayOfWeek() {
  return useLocalStorage({
    key: "fbl:firstDayOfWeek",
    defaultValue: DEFAULT_FIRST_DAY_OF_WEEK,
    getInitialValueInEffect: false,
    deserialize(value) {
      if (value == undefined) {
        return DEFAULT_FIRST_DAY_OF_WEEK;
      }

      try {
        const day = JSON.parse(value);
        if (!FIRST_DAYS_OF_WEEK.includes(day)) {
          return DEFAULT_FIRST_DAY_OF_WEEK;
        }
        return day;
      } catch (e) {
        return DEFAULT_FIRST_DAY_OF_WEEK;
      }
    },
  });
}

const WEEKEND_DAYS = (() => {
  // Use the locale of the browser rather than the set locale.
  const locale = new Intl.Locale(navigator.language);
  const weekInfo = (
    locale as {
      getWeekInfo?(): { weekend: number[] };
    }
  ).getWeekInfo?.() ?? { weekend: [6, 7] };
  return weekInfo.weekend.map((d) => (d % 7) as Day);
})();

export default function DatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useLingui();
  const [firstDayOfWeek] = useFirstDayOfWeek();

  return (
    <MantineDatesProvider
      settings={{
        locale: i18n.locale,
        weekendDays: WEEKEND_DAYS,
        firstDayOfWeek,
      }}
    >
      {children}
    </MantineDatesProvider>
  );
}
