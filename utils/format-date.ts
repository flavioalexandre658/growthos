import dayjs from "@/utils/dayjs";

export function formatDate(
  date: Date | string,
  tz: string,
  fmt = "DD/MM/YYYY HH:mm",
): string {
  return dayjs(date).tz(tz).format(fmt);
}
