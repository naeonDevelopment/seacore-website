import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon, TrendingUp } from "lucide-react"
import { cn } from "@/utils/cn"
import { CardContent } from "./Card"
import { ProgressRing } from "./ProgressRing"

interface CapabilityCardProps {
  title: string
  description: string
  metric: {
    value: string
    label: string
    percentage: number
  }
  icon: LucideIcon
  gradient: string
  features?: string[]
  delay?: number
  className?: string
  style?: React.CSSProperties
  badge?: {
    text: string
    icon: LucideIcon
    color: string
  }
  comingSoon?: boolean
}

const CapabilityCard: React.FC<CapabilityCardProps> = ({
  title,
  description,
  metric,
  icon: Icon,
  gradient,
  features,
  delay = 0,
  className,
  style,
  badge,
  comingSoon = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      viewport={{ once: true }}
      className={className}
      style={style}
    >
      <div className={cn(
        "group relative overflow-hidden rounded-3xl border shadow-lg transition-all duration-300 flex flex-col h-full min-h-[600px] md:min-h-[640px] lg:min-h-[680px]",
        comingSoon 
          ? "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60" 
          : "bg-white dark:bg-slate-900/60 hover:shadow-[8px_8px_0px_rgba(42,52,66,0.6)] hover:-translate-y-0.5 hover:border-maritime-500/70"
      )}>
        <div className={cn("absolute inset-0 bg-gradient-to-br", comingSoon ? "opacity-0" : "opacity-5", gradient)} />
        
        {/* Coming Soon Badge */}
        {comingSoon && (
          <div className="absolute top-4 right-4 z-10">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm">
              Coming Soon
            </div>
          </div>
        )}
        
        <CardContent className="relative p-8 flex flex-col h-full">
          <div className="flex-1 flex flex-col">
            {/* Header with Icon */}
            <div className="flex items-start justify-between mb-6 space-x-4">
              <div className={cn(
                "p-3 rounded-xl bg-gradient-to-br",
                comingSoon ? "opacity-50" : "",
                gradient
              )}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              {metric && (
                <div className="flex items-center space-x-3">
                  <ProgressRing
                    progress={metric.percentage}
                    size={56}
                    strokeWidth={5}
                    className={comingSoon ? "opacity-40" : ""}
                  >
                    <span className={cn(
                      "text-xs font-semibold",
                      comingSoon ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"
                    )}>
                      {metric.percentage}%
                    </span>
                  </ProgressRing>
                  <div className="text-right">
                    <div className={cn(
                      "text-2xl font-bold",
                      comingSoon ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"
                    )}>
                      {metric.value}
                    </div>
                    <div className={cn(
                      "flex items-center justify-end space-x-1 text-xs uppercase tracking-wide",
                      comingSoon ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-300"
                    )}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{metric.label}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Badge */}
            {badge && (
              <div className={cn("inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-4", badge.color)}>
                <badge.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{badge.text}</span>
              </div>
            )}

            {/* Content */}
            <div className="space-y-4">
              <h3 className={cn(
                "text-xl font-bold transition-colors",
                comingSoon 
                  ? "text-slate-500 dark:text-slate-500" 
                  : "text-slate-900 dark:text-slate-100 group-hover:text-maritime-600"
              )}>
                {title}
              </h3>
              
              <p className={cn(
                "leading-relaxed",
                comingSoon 
                  ? "text-slate-500 dark:text-slate-500" 
                  : "text-slate-600 dark:text-slate-300"
              )}>
                {description}
              </p>

              {features && (
                <div className={cn(
                  "p-4 rounded-xl mt-4",
                  comingSoon 
                    ? "bg-slate-100/50 dark:bg-slate-800/30" 
                    : "bg-slate-50 dark:bg-slate-800/50"
                )}>
                  <h4 className={cn(
                    "text-sm font-semibold mb-3",
                    comingSoon 
                      ? "text-slate-500 dark:text-slate-500" 
                      : "text-slate-900 dark:text-slate-100"
                  )}>
                    Key Features:
                  </h4>
                  <div className="space-y-2">
                    {features.map((feature, index) => (
                      <div key={index} className={cn(
                        "flex items-center space-x-2 text-sm",
                        comingSoon 
                          ? "text-slate-500 dark:text-slate-500" 
                          : "text-slate-600 dark:text-slate-300"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          comingSoon ? "bg-slate-400" : "bg-maritime-500"
                        )} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </CardContent>
      </div>
    </motion.div>
  )
}

export { CapabilityCard }
