import { formatDiaSemana } from '../../utils/formatters';

interface DaySelectorProps {
  selectedDay: number;
  onDayChange: (day: number) => void;
  availableDays?: number[];
}

export const DaySelector = ({
  selectedDay,
  onDayChange,
  availableDays,
}: DaySelectorProps) => {
  const allDays = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {allDays.map((day) => {
        const isAvailable = !availableDays || availableDays.includes(day);
        const isSelected = selectedDay === day;

        return (
          <button
            key={day}
            onClick={() => isAvailable && onDayChange(day)}
            disabled={!isAvailable}
            className={`
              flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-colors
              ${isSelected
                ? 'bg-dark-accent text-white shadow-lg shadow-blue-500/20'
                : isAvailable
                ? 'bg-dark-surface text-dark-text border border-dark-border hover:bg-dark-hover'
                : 'bg-dark-bg text-dark-text-muted cursor-not-allowed border border-dark-border'
              }
            `}
          >
            {formatDiaSemana(day).substring(0, 3)}
          </button>
        );
      })}
    </div>
  );
};

