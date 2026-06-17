import { BadRequestException } from "@nestjs/common";

import { PeriodEnum } from "../dto/produk-terlaris-filter.dto";

export interface DateRange {
  gte: Date;
  lte: Date;
  label: string;
}

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function periodToDateRange(
  period: PeriodEnum,
  startDate?: string,
  endDate?: string,
): DateRange {
  const now = new Date();

  switch (period) {
    case PeriodEnum.TODAY: {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end, label: "Hari Ini" };
    }

    case PeriodEnum.WEEK: {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now, label: "7 Hari Terakhir" };
    }

    case PeriodEnum.MONTH: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const label = `${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;
      return { gte: start, lte: end, label };
    }

    case PeriodEnum.LAST_MONTH: {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const label = `${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
      return { gte: start, lte: end, label };
    }

    case PeriodEnum.THREE_MONTHS: {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now, label: "3 Bulan Terakhir" };
    }

    case PeriodEnum.SIX_MONTHS: {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 6);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now, label: "6 Bulan Terakhir" };
    }

    case PeriodEnum.YEAR: {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { gte: start, lte: end, label: `Tahun ${now.getFullYear()}` };
    }

    case PeriodEnum.CUSTOM: {
      if (!startDate || !endDate) {
        throw new BadRequestException(
          "Parameter startDate dan endDate wajib diisi untuk period=CUSTOM",
        );
      }
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException(
          "Format tanggal tidak valid. Gunakan YYYY-MM-DD",
        );
      }
      if (start > end) {
        throw new BadRequestException("startDate tidak boleh setelah endDate");
      }
      return { gte: start, lte: end, label: `${startDate} s/d ${endDate}` };
    }

    default: {
      // fallback ke bulan ini
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return {
        gte: start,
        lte: end,
        label: `${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`,
      };
    }
  }
}

export function monthYearToDateRange(month: number, year: number): DateRange {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const label = `${BULAN_ID[month - 1]} ${year}`;
  return { gte: start, lte: end, label };
}

export function prevMonthRange(month: number, year: number): DateRange {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return monthYearToDateRange(prevMonth, prevYear);
}

export function nMonthsAgoRange(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getLabelBulan(date: Date): string {
  return `${BULAN_ID[date.getMonth()]} ${date.getFullYear()}`;
}

export function getYearMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getPertumbuhanDateRange(
  period: string,
  month?: number,
  year?: number,
) {
  const now = new Date();
  let periodeAStart: Date, periodeAEnd: Date;
  let periodeBStart: Date, periodeBEnd: Date;
  let labelFormatHelper: (s: Date, e: Date) => string;

  if (period === "WEEK") {
    periodeAEnd = new Date(now);
    periodeAStart = new Date(now);
    periodeAStart.setDate(now.getDate() - 7);
    periodeAStart.setHours(0, 0, 0, 0);

    periodeBEnd = new Date(periodeAStart);
    periodeBEnd.setMilliseconds(periodeBEnd.getMilliseconds() - 1);
    periodeBStart = new Date(periodeAStart);
    periodeBStart.setDate(periodeBStart.getDate() - 7);

    labelFormatHelper = (s, e) => {
      return `${s.getDate()} ${BULAN_ID[s.getMonth()].substring(0, 3)} - ${e.getDate()} ${BULAN_ID[e.getMonth()].substring(0, 3)} ${e.getFullYear()}`;
    };
  } else if (period === "6_MONTHS" || period === ("SIX_MONTHS" as any)) {
    periodeAEnd = new Date(now);
    periodeAStart = new Date(now);
    periodeAStart.setMonth(now.getMonth() - 6);
    periodeAStart.setDate(1);
    periodeAStart.setHours(0, 0, 0, 0);

    periodeBEnd = new Date(periodeAStart);
    periodeBEnd.setMilliseconds(periodeBEnd.getMilliseconds() - 1);
    periodeBStart = new Date(periodeAStart);
    periodeBStart.setMonth(periodeBStart.getMonth() - 6);

    labelFormatHelper = (s, e) => {
      return `${BULAN_ID[s.getMonth()].substring(0, 3)} - ${BULAN_ID[e.getMonth()].substring(0, 3)} ${e.getFullYear()}`;
    };
  } else if (period === "YEAR") {
    const y = year ?? now.getFullYear();
    periodeAStart = new Date(y, 0, 1, 0, 0, 0, 0);
    periodeAEnd = new Date(y, 11, 31, 23, 59, 59, 999);

    periodeBStart = new Date(y - 1, 0, 1, 0, 0, 0, 0);
    periodeBEnd = new Date(y - 1, 11, 31, 23, 59, 59, 999);

    labelFormatHelper = (s, e) => {
      return `Tahun ${s.getFullYear()}`;
    };
  } else {
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    periodeAStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    periodeAEnd = new Date(y, m, 0, 23, 59, 59, 999);

    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    periodeBEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
    periodeBStart = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);

    labelFormatHelper = (s, e) => {
      return `${BULAN_ID[s.getMonth()].substring(0, 3)} ${s.getFullYear()}`;
    };
  }

  return {
    periodeAStart,
    periodeAEnd,
    periodeBStart,
    periodeBEnd,
    labelFormatHelper,
  };
}
