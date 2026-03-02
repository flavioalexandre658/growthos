import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EventProp {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  example: string;
}

interface EventCardProps {
  name: string;
  description: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  props: EventProp[];
}

export function EventCard({
  name,
  description,
  variant,
  props,
}: EventCardProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
        <Badge variant={variant} className="font-mono text-xs">
          {name}
        </Badge>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs w-[180px]">propriedade</TableHead>
            <TableHead className="text-xs w-[100px]">tipo</TableHead>
            <TableHead className="text-xs">descrição</TableHead>
            <TableHead className="text-xs w-[160px]">exemplo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((prop) => (
            <TableRow key={prop.name} className="hover:bg-muted/20">
              <TableCell className="font-mono text-xs text-blue-400">
                {prop.name}
                {prop.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-yellow-500">
                {prop.type}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {prop.description}
              </TableCell>
              <TableCell className="font-mono text-xs text-green-400">
                {prop.example}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
