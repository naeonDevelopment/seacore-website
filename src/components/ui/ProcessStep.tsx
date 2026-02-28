import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/utils/cn"
import { EnterpriseCard, CardContent } from "./Card"

interface ProcessStepProps {
  step: string
  title: string
  description: string
  features: string[]
  icon: LucideIcon
  gradient: string
  delay?: number
  isLast?: boolean
  className?: string
}

const ProcessStep: React.FC<ProcessStepProps> = ({
  step,
  title,
  description,
  features,
  icon: _Icon,
  gradient: _gradient,
  delay = 0,
  isLast = false,
  className
}) => {
  return (
    <div className={cn("relative", className)}>
      {/* Connection Line */}
      {!isLast && (
        <div className="absolute left-1/2 top-24 w-px h-16 bg-gradient-to-b from-maritime-300 to-transparent dark:from-maritime-600 transform -translate-x-1/2 z-0" />
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay }}
        viewport={{ once: true }}
        className="relative z-10"
      >
        <EnterpriseCard variant="interactive" className="group">
          <CardContent className="p-8 text-center">
            {/* Step Number */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-maritime-500 to-ocean-500 text-white font-bold text-lg mb-6">
              {step}
            </div>


            {/* Content */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-maritime-600 transition-colors">
                {title}
              </h3>
              
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {description}
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-maritime-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </EnterpriseCard>
      </motion.div>
    </div>
  )
}

export { ProcessStep }
