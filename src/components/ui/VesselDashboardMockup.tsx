import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { 
  Anchor, 
  Ship, 
  Calendar, 
  Brain, 
  Settings, 
  HelpCircle,
  Activity,
  Database,
  Shield
} from 'lucide-react'
import { FleetCoreLogo } from './FleetCoreLogo'

interface VesselDashboardMockupProps {
  className?: string
  isDarkMode?: boolean
}

// Sample data for charts
const barData = [
  { name: 'Jan', value: 85 },
  { name: 'Feb', value: 92 },
  { name: 'Mar', value: 78 },
  { name: 'Apr', value: 95 },
  { name: 'May', value: 88 },
  { name: 'Jun', value: 91 }
]

const lineData = [
  { name: 'Week 1', efficiency: 85, performance: 78 },
  { name: 'Week 2', efficiency: 88, performance: 82 },
  { name: 'Week 3', efficiency: 92, performance: 85 },
  { name: 'Week 4', efficiency: 89, performance: 88 }
]

const pieData = [
  { name: 'Operational', value: 65, color: '#22d3ee' },
  { name: 'Maintenance', value: 25, color: '#f97316' },
  { name: 'Offline', value: 10, color: '#ef4444' }
]

const VesselDashboardMockup: React.FC<VesselDashboardMockupProps> = ({ className, isDarkMode = false }) => {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [scrollY, setScrollY] = useState(0)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop)
    // Hide all tooltips during scroll to prevent positioning issues
    const tooltipElements = document.querySelectorAll('[data-tooltip-trigger]');
    tooltipElements.forEach((element) => {
      const event = new Event('mouseleave');
      element.dispatchEvent(event);
    });
  }

  const Tooltip = ({ content, children, position = 'top' }: { content: string; children: React.ReactNode; position?: 'top' | 'right' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div 
        className="relative group"
        style={{ transformStyle: 'preserve-3d' }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {position === 'right' ? (
          <div 
            className={`absolute left-full top-1/2 transform -translate-y-1/2 ml-2 z-[9999] px-3 py-2 bg-slate-900 text-white text-xs rounded-lg pointer-events-none shadow-xl border border-slate-700 whitespace-nowrap transition-all duration-200 ${
              isVisible ? 'opacity-100 scale-100 delay-300' : 'opacity-0 scale-95 delay-0'
            }`}
            style={{ transformStyle: 'preserve-3d' }}>
            {content}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
          </div>
        ) : (
          <div 
            className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-[9999] px-3 py-2 bg-slate-900 text-white text-xs rounded-lg pointer-events-none shadow-xl border border-slate-700 transition-all duration-200 ${
              isVisible ? 'opacity-100 scale-100 delay-300' : 'opacity-0 scale-95 delay-0'
            }`}
            style={{
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.4',
              maxWidth: '280px',
              minWidth: '180px',
              transformStyle: 'preserve-3d'
            }}>
            {content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>
    )
  }

  // Special tooltip for header elements that need to escape container bounds
  const HeaderTooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      }
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    return (
      <>
        <div 
          ref={triggerRef}
          className="relative group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>
        {isVisible && (
          <div 
            className="fixed z-[999999] px-3 py-2 bg-slate-900 text-white text-xs rounded-lg pointer-events-none shadow-xl border border-slate-700 transition-all duration-200 opacity-100 scale-100"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -100%)',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.4',
              maxWidth: '280px',
              minWidth: '180px'
            }}>
            {content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </>
    )
  }

  return (
    <motion.div 
      className={cn("relative w-full flex justify-center items-center", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
            {/* 720px Wide Container with 16:9 Ratio - No Browser Frame */}
            <div 
              className={`relative w-[720px] h-[405px] rounded-2xl shadow-2xl overflow-hidden border transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-700' 
                  : 'bg-white border-gray-200'
              }`} 
              data-mockup-container
              style={{
                transform: 'perspective(1000px) rotateY(-8deg) rotateX(2deg)',
                transformStyle: 'preserve-3d'
              }}
            >

        {/* Main Layout with Sidebar - Matching Real System */}
        <div className="flex h-full">
          
          {/* Left Sidebar - Dark Theme Like Real System */}
          <div className="w-12 bg-slate-800 flex flex-col items-center py-3 space-y-2 relative z-10">
            {/* Logo/Brand Area */}
            <Tooltip content="FleetCore Dashboard" position="right">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2 hover:bg-blue-500 transition-colors duration-200 cursor-pointer">
                <Anchor className="w-4 h-4 text-white" />
              </div>
            </Tooltip>
            
            {/* Navigation Icons - Based on Real FleetCore System */}
            <Tooltip content="Fleet Overview" position="right">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors duration-200 cursor-pointer">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
              </div>
            </Tooltip>
            
            <Tooltip content="PMS Task Board" position="right">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-500 transition-colors duration-200 cursor-pointer">
                <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              </div>
            </Tooltip>
            
            <Tooltip content="PMS Schedule" position="right">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-500 transition-colors duration-200 cursor-pointer">
                <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              </div>
            </Tooltip>
            
            <Tooltip content="Events & Incidents" position="right">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-500 transition-colors duration-200 cursor-pointer">
                <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              </div>
            </Tooltip>
            
            <Tooltip content="Reports & Analytics" position="right">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-500 transition-colors duration-200 cursor-pointer">
                <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              </div>
            </Tooltip>
            
            {/* Bottom Area - More space for settings */}
            <div className="flex-1"></div>
            <Tooltip content="System Settings" position="right">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-500 transition-colors duration-200 cursor-pointer mb-3">
                <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              </div>
            </Tooltip>
          </div>

          {/* Main Content Area - No Horizontal Scroll with Tooltip Space */}
          <div className={`flex-1 overflow-y-auto overflow-x-hidden transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-800' : 'bg-gray-50'
          }`} onScroll={handleScroll} style={{ maxHeight: '405px' }}>
            <div className="p-3 pt-8">

            {/* Header Area - Glassmorphism with Dynamic Top Margin */}
            <div className={`flex items-center justify-between mb-4 backdrop-blur-sm rounded-lg pl-0 pr-2 py-1.5 shadow-sm border relative z-5 transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-800/80 border-slate-600/20' 
                : 'bg-white/80 border-white/20'
            }`}>
              <HeaderTooltip content="FleetCore Maritime Navigator - Main Dashboard">
                <div className={`flex items-center cursor-pointer rounded-lg p-0 transition-colors duration-200 ${
                  isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/50'
                }`}>
                  <FleetCoreLogo className="scale-[0.65] -ml-1" />
                </div>
              </HeaderTooltip>
              <HeaderTooltip content="Access user profile, account settings and system preferences">
                <div className={`flex items-center space-x-2 cursor-pointer rounded-lg p-1 transition-colors duration-200 ${
                  isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/50'
                }`}>
                  <div className={`w-16 h-2 rounded transition-colors duration-300 ${
                    isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                  }`}></div>
                  <div className={`w-6 h-6 rounded-full transition-colors duration-300 ${
                    isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                  }`}></div>
                </div>
              </HeaderTooltip>
            </div>

            {/* Main Cards Grid - Interactive Cards */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              
              {/* Card 1 - Fleet Management */}
              <Tooltip content="Manage maritime assets, vessel operations and crew assignments across operational zones">
                <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                  isDarkMode 
                    ? 'hover:bg-slate-600' 
                    : ''
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-blue-900/50 group-hover:bg-blue-800/50' 
                        : 'bg-blue-100 group-hover:bg-blue-200'
                    }`}>
                      <Ship className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className={`w-20 h-3 rounded transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  
                  {/* Sub-cards representing Vessels, Users & Roles, Operating Zones */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className={`rounded-md p-1.5 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className={`w-4 h-4 rounded mx-auto mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-6 h-1.5 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`rounded-md p-1.5 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className={`w-4 h-4 rounded mx-auto mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-7 h-1.5 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`rounded-md p-1.5 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className={`w-4 h-4 rounded mx-auto mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-8 h-1.5 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </Tooltip>

              {/* Card 2 - Operations Management */}
              <Tooltip content="Daily operations, maintenance scheduling and event tracking with real-time monitoring">
                <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                  isDarkMode 
                    ? 'hover:bg-slate-600' 
                    : ''
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-green-900/50 group-hover:bg-green-800/50' 
                        : 'bg-green-100 group-hover:bg-green-200'
                    }`}>
                      <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div className={`w-24 h-3 rounded transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  
                  {/* Performance Trends Chart */}
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={lineData}>
                      <Area 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Tooltip>

              {/* Card 3 - Intelligence & Automation */}
              <Tooltip content="AI-powered maritime intelligence with predictive analytics and automated workflows">
                <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                  isDarkMode 
                    ? 'hover:bg-slate-600' 
                    : ''
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-orange-900/50 group-hover:bg-orange-800/50' 
                        : 'bg-orange-100 group-hover:bg-orange-200'
                    }`}>
                      <Brain className={`w-4 h-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <div className={`w-18 h-3 rounded transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  
                  {/* Analytics Bar Chart */}
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={barData}>
                      <Bar 
                        dataKey="value" 
                        fill="#f97316" 
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Tooltip>

            </div>

            {/* Second Row - System Administration Cards */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              
                <Tooltip content="Global system configuration, user management and organizational settings">
                  <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                    isDarkMode 
                      ? 'hover:bg-slate-600' 
                      : ''
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                        isDarkMode 
                          ? 'bg-red-900/50 group-hover:bg-red-800/50' 
                          : 'bg-red-100 group-hover:bg-red-200'
                      }`}>
                        <Shield className={`w-4 h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                      </div>
                      <div className={`w-20 h-3 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                      }`}></div>
                    </div>
                  
                  {/* System Status Distribution */}
                  <div className="flex items-center justify-between">
                    <ResponsiveContainer width={60} height={60}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={15}
                          outerRadius={25}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="flex-1 ml-3 space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        <div className={`w-8 h-2 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                        }`}></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <div className={`w-10 h-2 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                        }`}></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <div className={`w-6 h-2 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </Tooltip>

              <Tooltip content="Utilities, support tools and system maintenance functions">
                <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                  isDarkMode 
                    ? 'hover:bg-slate-600' 
                    : ''
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <HelpCircle className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`} />
                    </div>
                    <div className={`w-16 h-3 rounded transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  
                  {/* Support Tools List */}
                  <div className="space-y-2">
                    <div className={`flex items-center space-x-2 rounded p-1 transition-colors duration-200 ${
                      isDarkMode 
                        ? 'group-hover:bg-slate-600' 
                        : 'group-hover:bg-gray-50'
                    }`}>
                      <div className={`w-4 h-4 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-16 h-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`flex items-center space-x-2 rounded p-1 transition-colors duration-200 ${
                      isDarkMode 
                        ? 'group-hover:bg-slate-600' 
                        : 'group-hover:bg-gray-50'
                    }`}>
                      <div className={`w-4 h-4 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-12 h-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`flex items-center space-x-2 rounded p-1 transition-colors duration-200 ${
                      isDarkMode 
                        ? 'group-hover:bg-slate-600' 
                        : 'group-hover:bg-gray-50'
                    }`}>
                      <div className={`w-4 h-4 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-14 h-2 rounded transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </Tooltip>

            </div>

            {/* Bottom Stats Row - Interactive Overview */}
            <Tooltip content="Key performance indicators and operational metrics overview">
              <div className={`rounded-xl p-3 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                isDarkMode 
                  ? 'hover:bg-slate-600' 
                  : ''
              }`}>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className={`rounded-lg p-2 transition-colors duration-200 ${
                    isDarkMode ? 'group-hover:bg-blue-900/30' : 'group-hover:bg-blue-50'
                  }`}>
                    <div className="text-2xl font-bold text-blue-600 mb-1">5</div>
                    <div className={`w-12 h-2 rounded mx-auto transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div className={`rounded-lg p-2 transition-colors duration-200 ${
                    isDarkMode ? 'group-hover:bg-green-900/30' : 'group-hover:bg-green-50'
                  }`}>
                    <div className="text-2xl font-bold text-green-600 mb-1">7</div>
                    <div className={`w-16 h-2 rounded mx-auto transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div className={`rounded-lg p-2 transition-colors duration-200 ${
                    isDarkMode ? 'group-hover:bg-orange-900/30' : 'group-hover:bg-orange-50'
                  }`}>
                    <div className="text-2xl font-bold text-orange-600 mb-1">17</div>
                    <div className={`w-10 h-2 rounded mx-auto transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div className={`rounded-lg p-2 transition-colors duration-200 ${
                    isDarkMode ? 'group-hover:bg-purple-900/30' : 'group-hover:bg-purple-50'
                  }`}>
                    <div className="text-2xl font-bold text-purple-600 mb-1">1</div>
                    <div className={`w-14 h-2 rounded mx-auto transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                    }`}></div>
                  </div>
                </div>
              </div>
            </Tooltip>

            {/* Extra Content for Scrolling */}
                <div className="mt-6 space-y-3">
                  <Tooltip content="Real-time equipment monitoring and predictive maintenance insights">
                    <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                      isDarkMode 
                        ? 'hover:bg-slate-600' 
                        : ''
                    }`}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                          isDarkMode 
                            ? 'bg-purple-900/50 group-hover:bg-purple-800/50' 
                            : 'bg-purple-100 group-hover:bg-purple-200'
                        }`}>
                          <Settings className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                        </div>
                        <div className={`w-28 h-3 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                        }`}></div>
                      </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className={`rounded-lg p-2 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className="w-full h-8 bg-gradient-to-t from-green-400 to-green-200 rounded mb-1"></div>
                      <div className={`w-6 h-2 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`rounded-lg p-2 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className="w-full h-6 bg-gradient-to-t from-yellow-400 to-yellow-200 rounded mb-1"></div>
                      <div className={`w-8 h-2 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`rounded-lg p-2 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className="w-full h-10 bg-gradient-to-t from-blue-400 to-blue-200 rounded mb-1"></div>
                      <div className={`w-7 h-2 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className={`rounded-lg p-2 text-center transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-slate-500' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <div className="w-full h-4 bg-gradient-to-t from-red-400 to-red-200 rounded mb-1"></div>
                      <div className={`w-5 h-2 rounded mx-auto transition-colors duration-300 ${
                        isDarkMode ? 'bg-slate-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </Tooltip>

                  <Tooltip content="Regulatory compliance tracking and certification management">
                    <div className={`rounded-xl p-4 border bg-card text-card-foreground shadow-lg maritime-glass-interactive cursor-pointer group transition-all duration-300 ${
                      isDarkMode 
                        ? 'hover:bg-slate-600' 
                        : ''
                    }`}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                          isDarkMode 
                            ? 'bg-indigo-900/50 group-hover:bg-indigo-800/50' 
                            : 'bg-indigo-100 group-hover:bg-indigo-200'
                        }`}>
                          <Database className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        </div>
                        <div className={`w-32 h-3 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                        }`}></div>
                      </div>
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between rounded p-2 transition-colors duration-200 ${
                          isDarkMode 
                            ? 'group-hover:bg-slate-600' 
                            : 'group-hover:bg-gray-50'
                        }`}>
                          <div className={`w-20 h-2 rounded transition-colors duration-300 ${
                            isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                          }`}></div>
                          <div className="w-12 h-2 bg-green-400 rounded"></div>
                        </div>
                        <div className={`flex items-center justify-between rounded p-2 transition-colors duration-200 ${
                          isDarkMode 
                            ? 'group-hover:bg-slate-600' 
                            : 'group-hover:bg-gray-50'
                        }`}>
                          <div className={`w-16 h-2 rounded transition-colors duration-300 ${
                            isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                          }`}></div>
                          <div className="w-12 h-2 bg-yellow-400 rounded"></div>
                        </div>
                        <div className={`flex items-center justify-between rounded p-2 transition-colors duration-200 ${
                          isDarkMode 
                            ? 'group-hover:bg-slate-600' 
                            : 'group-hover:bg-gray-50'
                        }`}>
                          <div className={`w-24 h-2 rounded transition-colors duration-300 ${
                            isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                          }`}></div>
                          <div className="w-12 h-2 bg-green-400 rounded"></div>
                        </div>
                      </div>
                </div>
              </Tooltip>
            </div>

          </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export { VesselDashboardMockup }
