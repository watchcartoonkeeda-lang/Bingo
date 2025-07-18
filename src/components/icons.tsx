import { type SVGProps } from "react";
import { cn } from "@/lib/utils";

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-3" {...props}>
      <div className="grid grid-cols-2 gap-1.5 p-2 bg-background dark:bg-slate-800 rounded-lg shadow-inner">
        <div className="h-3 w-3 rounded-full bg-primary" />
        <div className="h-3 w-3 rounded-full bg-accent" />
        <div className="h-3 w-3 rounded-full bg-accent" />
        <div className="h-3 w-3 rounded-full bg-primary" />
      </div>
      <span className="text-3xl font-black text-primary font-headline tracking-tighter">
        BingoBoardBlitz
      </span>
    </div>
  );
}
