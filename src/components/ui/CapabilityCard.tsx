import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon, ArrowRight, TrendingUp } from "lucide-react"
import { cn } from "@/utils/cn"
import { EnterpriseCard, CardContent } from "./Card"
import { Button } from "./Button"
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
    >
      <div className={cn(
        "h-full group relative overflow-hidden rounded-3xl border shadow-lg transition-all duration-300",
        comingSoon 
          ? "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60" 
          : "bg-white dark:bg-slate-800 hover:shadow-[8px_8px_0px_#64748b] hover:-translate-y-0.5 hover:border-[#64748b]"
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
        
        <CardContent className="relative p-8">
          {/* Header with Icon */}
          <div className="flex items-start justify-between mb-6">
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-br",
              comingSoon ? "opacity-50" : "",
              gradient
            )}>
              <Icon className="w-8 h-8 text-white" />
            </div>
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
                        "w-1.5 h-1.5 rounded-full",
                        comingSoon ? "bg-slate-400" : "bg-maritime-500"
                      )} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Learn More Button */}
          <div className={cn(
            "mt-6 pt-4 border-t",
            comingSoon 
              ? "border-slate-300 dark:border-slate-700" 
              : "border-slate-200 dark:border-slate-700"
          )}>
            <Button variant="ghost" className={cn(
              "group/btn p-0 h-auto font-medium",
              comingSoon 
                ? "text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400" 
                : "text-maritime-600 hover:text-maritime-700"
            )}>
              Learn more
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </div>
        </CardContent>
      </div>
    </motion.div>
  )
}

export { CapabilityCard }
