import ContentStep from '../ContentStep'
import CodeWindowIcon from '../icons/CodeWindowIcon'
import FanIcon from '../icons/FanIcon'
import ColorSchemeIcon from '../icons/ColorSchemeIcon'
import AsterikIcon from '../icons/AsterikIcon'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { useEffect, useState } from 'react'

const EraContent = () => {
  const { version } = useConveyor('app')
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    const fetchVersion = async () => {
      const appVersion = await version()
      setAppVersion(appVersion)
    }
    fetchVersion()
  }, [version])

  return (
    <div>
      <h2 className="flex items-center gap-4">Electron React App</h2>
      <p>
        Welcome to the Electron React App "v{appVersion}". A starter kit that provides a solid foundation for developing
        desktop applications.
      </p>
      <p>
        This project utilizes Electron, React, Vite, TypeScript, and Tailwind CSS to provide a modern development
        environment with the latest features and tools.
      </p>

      <div className="welcome-content-steps">
        <ContentStep
          title="Custom Window Titlebar & Menus"
          description="Customize the look and feel of the application window"
          icon={CodeWindowIcon}
        />

        <ContentStep
          title="Lightning Fast HMR"
          description="Hot Module Replacement that stays fast regardless of app size"
          icon={FanIcon}
        />

        <ContentStep
          title="Dark & Light Mode"
          description="Switch between dark and light mode with a click of a button"
          icon={ColorSchemeIcon}
        />

        <ContentStep
          title="Conveyor - IPC Communication"
          description="Type-safe inter-process communication system"
          icon={AsterikIcon}
        />
      </div>

      <p className="learn-more">
        Learn more about Electron React App at{' '}
        <a href="https://github.com/guasam/electron-react-app" target="_blank" rel="noreferrer">
          Github
        </a>
      </p>
    </div>
  )
}

export default EraContent
