import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PropTableRow {
  name: string;
  source: string;
  example: string;
}

interface PropTableProps {
  rows: PropTableRow[];
}

export function AutoPropTable({ rows }: PropTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/40">
            <TableHead className="text-xs w-[180px]">dado</TableHead>
            <TableHead className="text-xs">fonte</TableHead>
            <TableHead className="text-xs w-[160px]">exemplo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name} className="hover:bg-muted/20">
              <TableCell className="font-mono text-xs text-blue-400">
                {row.name}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.source}
              </TableCell>
              <TableCell className="font-mono text-xs text-green-400">
                {row.example}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
