import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/utils/cn"
import { EnterpriseCard, CardContent } from "./Card"

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
  gradient?: string
  delay?: number
  className?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  gradient = "from-blue-500/10 to-indigo-500/10",
  delay = 0,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
    >
      <EnterpriseCard variant="interactive" className={cn("group relative overflow-hidden", className)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradient)} />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-3 rounded-xl bg-gradient-to-br", gradient)}>
              <Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            {trend && (
              <div className={cn(
                "text-sm font-medium px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30"
                  : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-maritime-600 transition-colors">
              {value}
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {title}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
              {description}
            </p>
          </div>
        </CardContent>
      </EnterpriseCard>
    </motion.div>
  )
}

export { MetricCard }
