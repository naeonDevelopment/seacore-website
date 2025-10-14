import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon, CheckCircle } from "lucide-react"
import { cn } from "@/utils/cn"
import { CardContent } from "./Card"
import { AnimatedCounter } from "./AnimatedCounter"

interface RoleCardProps {
  role: string
  metric: {
    value: number
    suffix: string
    label: string
    color: string
  }
  description: string
  benefits: string[]
  icon: LucideIcon
  gradient: string
  delay?: number
  className?: string
}

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  metric,
  description,
  benefits,
  icon: Icon,
  gradient,
  delay = 0,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className={className}
    >
      <div className="h-full group relative overflow-hidden rounded-3xl border bg-white dark:bg-slate-800 shadow-lg hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", gradient)} />
        
        <CardContent className="relative p-8">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={cn("p-3 rounded-xl bg-gradient-to-br", gradient)}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {role}
              </h3>
            </div>
          </div>

          {/* Metric */}
          <div className="text-center mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className={cn("text-3xl font-bold mb-1", metric.color)}>
              <AnimatedCounter 
                value={metric.value} 
                suffix={metric.suffix}
                prefix={metric.suffix === '%' ? '' : '+'}
              />
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {metric.label}
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {description}
          </p>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Key Benefits:
            </h4>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </motion.div>
  )
}

export { RoleCard }
