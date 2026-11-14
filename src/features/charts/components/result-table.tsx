"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const formatCell = (value: string | number | null) => {
  if (value === null) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value;
};

export function ResultTable(props: {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  className?: string;
}) {
  return (
    <ScrollArea className={cn("h-[300px] w-full rounded-lg border", props.className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {props.columns.map((column) => (
              <TableHead key={column} className="whitespace-nowrap">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="tabular-nums whitespace-nowrap">
                  {formatCell(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
