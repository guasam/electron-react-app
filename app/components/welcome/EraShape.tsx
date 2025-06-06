import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const pathTypes = [
  { name: 'Electron' },
  { name: 'React' },
  { name: 'Vite' },
  { name: 'Shadcn' },
  { name: 'Tailwind' },
  { name: 'ERA' },
]

interface EraShapeIconProps {
  onPathHover?: (index: number, name: string) => void
  onPathReset?: () => void
  [key: string]: any
}

const EraShape = ({ onPathHover, onPathReset, ...props }: EraShapeIconProps) => {
  const [hoveredPath, setHoveredPath] = useState('ERA')
  const timeoutRef = useRef<number | null>(null)

  const handleMouseEnter = (index: number) => {
    // Clear any existing timeout when a new path is hovered
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setHoveredPath(pathTypes[index].name)
    // Emit the hover event with the path index and name
    if (onPathHover) {
      onPathHover(index, pathTypes[index].name)
    }
  }
  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setHoveredPath('ERA')
      timeoutRef.current = null
      // Emit the reset event when the mouse leaves the shape
      if (onPathReset) onPathReset()
    }, 5000)
  }

  return (
    <div id="era-shape">
      <AnimatePresence mode="wait">
        <motion.span
          key={hoveredPath}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          {hoveredPath}
        </motion.span>
      </AnimatePresence>
      <svg width="100%" height="100%" viewBox="0 0 195 197" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
          <linearGradient id="viteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#68a9fd" stopOpacity="1" />
            <stop offset="100%" stopColor="#b244fb" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d="M49.445,92.037c-0.301,2.391 -2.334,4.184 -4.743,4.184c-9.806,0.019 -32.702,0.019 -32.702,0.019c-3.504,0 -6.834,-1.532 -9.114,-4.194c-2.279,-2.661 -3.282,-6.186 -2.744,-9.649c1.734,-11.38 5.572,-22.633 11.671,-33.197c6.099,-10.564 13.925,-19.514 22.918,-26.7c2.728,-2.197 6.28,-3.091 9.723,-2.447c3.444,0.643 6.433,2.759 8.185,5.793c4.323,7.484 10.309,17.85 16.36,28.328c1.209,2.093 0.673,4.758 -1.251,6.221c-9.802,7.542 -16.598,18.793 -18.303,31.642Z"
          fill="#9a95e0"
          onMouseEnter={() => handleMouseEnter(0)}
          onMouseLeave={handleMouseLeave}
        />
        <path
          d="M67.738,136.421c1.917,1.457 2.451,4.112 1.247,6.197c-4.886,8.499 -16.341,28.34 -16.341,28.34c-1.752,3.035 -4.743,5.152 -8.188,5.796c-3.445,0.643 -6.999,-0.251 -9.729,-2.449c-8.989,-7.191 -16.815,-16.141 -22.914,-26.705c-6.099,-10.564 -9.937,-21.817 -11.664,-33.198c-0.538,-3.461 0.464,-6.984 2.742,-9.644c2.279,-2.661 5.606,-4.192 9.109,-4.192c8.641,-0.002 20.606,-0.003 32.702,-0.004c2.419,-0 4.46,1.8 4.763,4.2c1.686,12.852 8.482,24.103 18.273,31.659Z"
          fill="#5cc4db"
          onMouseEnter={() => handleMouseEnter(1)}
          onMouseLeave={handleMouseLeave}
        />
        <path
          d="M115.344,142.776c2.221,-0.917 4.778,-0.047 5.979,2.034c4.912,8.496 16.351,28.308 16.351,28.308c1.752,3.035 2.09,6.684 0.925,9.989c-1.165,3.305 -3.717,5.936 -6.985,7.201c-10.722,4.189 -22.386,6.492 -34.585,6.492c-12.198,0 -23.862,-2.303 -34.582,-6.498c-3.266,-1.264 -5.816,-3.894 -6.981,-7.197c-1.164,-3.303 -0.827,-6.951 0.925,-9.984c4.317,-7.481 10.295,-17.839 16.34,-28.311c1.203,-2.083 3.762,-2.955 5.986,-2.038c5.642,2.34 11.826,3.628 18.309,3.628c6.486,0 12.672,-1.289 18.318,-3.624Z"
          fill="url(#viteGradient)"
          onMouseEnter={() => handleMouseEnter(2)}
          onMouseLeave={handleMouseLeave}
        />
        <path
          d="M144.608,104.763c0.3,-2.391 2.333,-4.184 4.743,-4.184c9.807,-0.019 32.708,-0.019 32.708,-0.019c3.504,-0 6.834,1.532 9.114,4.194c2.279,2.661 3.282,6.186 2.743,9.649c-1.733,11.38 -5.571,22.633 -11.67,33.197c-6.099,10.564 -13.925,19.514 -22.918,26.7c-2.728,2.197 -6.28,3.091 -9.724,2.447c-3.443,-0.643 -6.432,-2.759 -8.184,-5.793c-4.324,-7.484 -10.311,-17.852 -16.362,-28.331c-1.209,-2.093 -0.673,-4.758 1.251,-6.221c9.799,-7.542 16.594,-18.792 18.299,-31.639Z"
          fill="#3579c4"
          onMouseEnter={() => handleMouseEnter(3)}
          onMouseLeave={handleMouseLeave}
        />
        <path
          d="M126.318,60.382c-1.916,-1.457 -2.45,-4.112 -1.246,-6.197c4.886,-8.499 16.343,-28.343 16.343,-28.343c1.752,-3.035 4.743,-5.152 8.188,-5.796c3.445,-0.643 6.999,0.251 9.729,2.449c8.989,7.191 16.815,16.141 22.914,26.705c6.099,10.564 9.937,21.817 11.664,33.198c0.538,3.461 -0.464,6.984 -2.742,9.644c-2.279,2.661 -5.606,4.192 -9.109,4.192c-8.642,0.002 -20.61,0.003 -32.708,0.004c-2.419,0 -4.461,-1.8 -4.763,-4.2c-1.686,-12.85 -8.481,-24.1 -18.27,-31.656Z"
          fill="#00bdfe"
          onMouseEnter={() => handleMouseEnter(4)}
          onMouseLeave={handleMouseLeave}
        />
        <path
          d="M78.713,54.023c-2.221,0.915 -4.777,0.045 -5.978,-2.035c-4.912,-8.496 -16.35,-28.306 -16.35,-28.306c-1.752,-3.035 -2.09,-6.684 -0.925,-9.989c1.165,-3.305 3.717,-5.936 6.985,-7.201c10.722,-4.189 22.386,-6.492 34.584,-6.492c12.199,0 23.863,2.303 34.583,6.498c3.266,1.264 5.816,3.894 6.981,7.197c1.164,3.303 0.827,6.951 -0.925,9.984c-4.317,7.482 -10.296,17.841 -16.341,28.313c-1.203,2.084 -3.763,2.955 -5.987,2.038c-5.643,-2.341 -11.829,-3.63 -18.314,-3.63c-6.483,0 -12.668,1.288 -18.313,3.623Z"
          fill="#57579a"
          onMouseEnter={() => handleMouseEnter(5)}
          onMouseLeave={handleMouseLeave}
        />
      </svg>
    </div>
  )
}

export default EraShape
