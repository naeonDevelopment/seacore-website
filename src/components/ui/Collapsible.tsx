import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/utils/cn"

interface CollapsibleProps {
  children: React.ReactNode
  trigger: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

const Collapsible: React.FC<CollapsibleProps> = ({
  children,
  trigger,
  defaultOpen = false,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("w-full", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors duration-200 rounded-lg"
      >
        {trigger}
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export { Collapsible }
